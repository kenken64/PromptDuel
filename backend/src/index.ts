import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { db } from './db';
import { users, prompts, duels, leaderboard, challengePrompts } from './db/schema';
import { evaluateWorkspace, generateGradesMarkdown, saveGradesMarkdown } from './evaluate';
import { desc, eq } from 'drizzle-orm';
import { authRoutes } from './routes/auth';
import { roomRoutes } from './routes/rooms';
import { chatRoutes } from './routes/chat';
import { challengeRoutes } from './routes/challenges';
import { adminRoutes } from './routes/admin';
import { roomWebSocket } from './ws/roomServer';
import { resolve, join, normalize } from 'path';
import { existsSync } from 'fs';
import { rm } from 'fs/promises';
import archiver from 'archiver';

const WORKSPACES_DIR = process.env.WORKSPACES_DIR
  ? resolve(process.env.WORKSPACES_DIR)
  : resolve(__dirname, '../../workspaces');

function sanitizePlayerName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 50);
}

function getWorkspacePath(playerName: string, challenge: number): string | null {
  const sanitized = sanitizePlayerName(playerName);
  const workspacePath = normalize(join(WORKSPACES_DIR, `${sanitized}_challenge${challenge}`));
  // Path traversal protection
  if (!workspacePath.startsWith(normalize(WORKSPACES_DIR))) {
    return null;
  }
  return workspacePath;
}

const app = new Elysia()
  .use(
    cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    })
  )
  .get('/', () => 'Prompt Duel API')
  .get('/health', () => ({ status: 'ok', database: 'connected' }))
  // Auth routes
  .use(authRoutes)
  // Room routes
  .use(roomRoutes)
  // Chat routes
  .use(chatRoutes)
  // Challenge routes
  .use(challengeRoutes)
  // Admin routes
  .use(adminRoutes)
  // Room WebSocket
  .use(roomWebSocket)
  // Legacy endpoints (keeping for backwards compatibility)
  .get('/users', async () => {
    const allUsers = await db.select().from(users);
    return allUsers;
  })
  .get('/prompts', async () => {
    const allPrompts = await db.select().from(prompts);
    return allPrompts;
  })
  .get('/duels', async () => {
    const allDuels = await db.select().from(duels);
    return allDuels;
  })
  // Leaderboard endpoints
  .get('/leaderboard', async () => {
    const entries = await db
      .select()
      .from(leaderboard)
      .orderBy(desc(leaderboard.score), desc(leaderboard.createdAt));
    return entries;
  })
  .get('/leaderboard/:challenge', async ({ params }) => {
    const challengeNum = parseInt(params.challenge);
    const entries = await db
      .select()
      .from(leaderboard)
      .where(eq(leaderboard.challenge, challengeNum))
      .orderBy(desc(leaderboard.score), desc(leaderboard.createdAt));
    return entries;
  })
  // Challenge prompts - sample/answer prompts shown after game ends
  .get('/challenge-prompts/:challenge', async ({ params }) => {
    const challengeNum = parseInt(params.challenge);
    const prompts = await db
      .select()
      .from(challengePrompts)
      .where(eq(challengePrompts.challenge, challengeNum))
      .orderBy(challengePrompts.promptNumber);
    return { success: true, prompts };
  })
  .post('/leaderboard', async ({ body }) => {
    const { playerName, challenge, score, maxScore, percentage, grade, promptsUsed } = body as {
      playerName: string;
      challenge: number;
      score: number;
      maxScore: number;
      percentage: number;
      grade: string;
      promptsUsed: number;
    };

    try {
      const result = await db
        .insert(leaderboard)
        .values({
          playerName,
          challenge,
          score,
          maxScore,
          percentage,
          grade,
          promptsUsed,
        })
        .returning();

      return { success: true, entry: result[0] };
    } catch (error) {
      console.error('Failed to save leaderboard entry:', error);
      return { success: false, error: 'Failed to save entry' };
    }
  })
  // Single player evaluation (for real-time scoring after each prompt)
  .post('/evaluate-player', async ({ body }) => {
    const { playerName, challenge } = body as {
      playerName: string;
      challenge: number;
    };

    try {
      const result = evaluateWorkspace(playerName, challenge);
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      console.error('Single player evaluation error:', error);
      return {
        success: false,
        error: 'Evaluation failed',
        totalScore: 0,
        maxScore: 100,
        percentage: 0,
        grade: 'F',
      };
    }
  })
  // Full evaluation for both players (end of duel)
  .post('/evaluate', async ({ body }) => {
    const { player1Name, player2Name, challenge } = body as {
      player1Name: string;
      player2Name: string;
      challenge: number;
    };

    try {
      // Evaluate both players
      const player1Result = evaluateWorkspace(player1Name, challenge);
      const player2Result = evaluateWorkspace(player2Name, challenge);

      // Generate and save grades markdown
      const gradesPath = saveGradesMarkdown(player1Result, player2Result);
      const gradesMarkdown = generateGradesMarkdown(player1Result, player2Result);

      // Determine winner
      const winner =
        player1Result.totalScore > player2Result.totalScore
          ? 'player1'
          : player2Result.totalScore > player1Result.totalScore
            ? 'player2'
            : null;

      return {
        success: true,
        player1: player1Result,
        player2: player2Result,
        winner,
        gradesPath,
        gradesMarkdown,
      };
    } catch (error) {
      console.error('Evaluation error:', error);
      return {
        success: false,
        error: 'Evaluation failed',
      };
    }
  })
  // Workspace download (zip)
  .get('/workspaces/:playerName/:challenge/download', async ({ params, set }) => {
    const challenge = parseInt(params.challenge);
    const workspacePath = getWorkspacePath(params.playerName, challenge);

    if (!workspacePath || !existsSync(workspacePath)) {
      set.status = 404;
      return { success: false, error: 'Workspace not found' };
    }

    const sanitized = sanitizePlayerName(params.playerName);
    const filename = `${sanitized}_challenge${challenge}.zip`;

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.directory(workspacePath, false);
    archive.finalize();

    // Convert Node.js Readable to Web ReadableStream for Bun compatibility
    const webStream = new ReadableStream({
      start(controller) {
        archive.on('data', (chunk: Buffer) => controller.enqueue(chunk));
        archive.on('end', () => controller.close());
        archive.on('error', (err: Error) => controller.error(err));
      },
    });

    return new Response(webStream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  })
  // Workspace cleanup (delete)
  .post('/workspaces/:playerName/:challenge/cleanup', async ({ params, set }) => {
    const challenge = parseInt(params.challenge);
    const workspacePath = getWorkspacePath(params.playerName, challenge);

    if (!workspacePath) {
      set.status = 400;
      return { success: false, error: 'Invalid workspace path' };
    }

    if (!existsSync(workspacePath)) {
      return { success: true, message: 'Workspace already cleaned up' };
    }

    try {
      await rm(workspacePath, { recursive: true });
      return { success: true, message: 'Workspace cleaned up' };
    } catch (error) {
      console.error('Workspace cleanup error:', error);
      set.status = 500;
      return { success: false, error: 'Cleanup failed' };
    }
  })
  .listen(3000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
