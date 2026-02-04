import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { db } from './db';
import { users, prompts, duels, leaderboard } from './db/schema';
import { evaluateWorkspace, generateGradesMarkdown, saveGradesMarkdown } from './evaluate';
import { desc, eq } from 'drizzle-orm';

const app = new Elysia()
  .use(cors())
  .get('/', () => 'Prompt Duel API')
  .get('/health', () => ({ status: 'ok', database: 'connected' }))
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
      const result = await db.insert(leaderboard).values({
        playerName,
        challenge,
        score,
        maxScore,
        percentage,
        grade,
        promptsUsed,
      }).returning();

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
      const winner = player1Result.totalScore > player2Result.totalScore
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
  .listen(3000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
