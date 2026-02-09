import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { writeFile, readFile, mkdir } from 'fs/promises';
import dotenv from 'dotenv';
import { ProviderFactory, getAvailableProviders, PROVIDER_CONFIG } from './providers/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: resolve(__dirname, '.env') });
console.log('Loaded .env from:', resolve(__dirname, '.env'));

const PORT = 3001;
const sessions = new Map();
const spectatorConnections = new Map(); // roomCode -> Set of WebSocket connections
const processingLock = new Map(); // sessionId -> boolean (prevents concurrent API calls)

// Log available providers
console.log('Available AI providers:');
const availableProviders = getAvailableProviders();
if (availableProviders.length === 0) {
  console.warn('WARNING: No AI providers configured! Set at least one API key.');
} else {
  availableProviders.forEach(p => {
    console.log(`  - ${p.name}: ${p.models.map(m => m.name).join(', ')}`);
  });
}

// Base directory for player workspaces
const WORKSPACES_DIR = process.env.WORKSPACES_DIR
  ? resolve(__dirname, process.env.WORKSPACES_DIR)
  : resolve(__dirname, '../workspaces');

// Ensure workspaces directory exists
if (!existsSync(WORKSPACES_DIR)) {
  mkdirSync(WORKSPACES_DIR, { recursive: true });
  console.log(`Created workspaces directory: ${WORKSPACES_DIR}`);
}

const wss = new WebSocketServer({ port: PORT });

// Add process-level error handlers to catch unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[PROCESS] Unhandled Rejection at:', promise);
  console.error('[PROCESS] Reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[PROCESS] Uncaught Exception:', error);
});

console.log(`Claude Code API Server listening on ws://localhost:${PORT}`);
console.log(`Workspaces directory: ${WORKSPACES_DIR}`);

// Log configured API keys (without revealing them)
Object.entries(PROVIDER_CONFIG).forEach(([key, config]) => {
  if (process.env[config.envKey]) {
    console.log(`Auth: ${config.envKey} is set (${process.env[config.envKey].substring(0, 10)}...)`);
  }
});

console.log('\nActive sessions can be monitored via console logs.\n');

// Test available provider connections at startup
async function testProviderConnections() {
  const available = getAvailableProviders();
  if (available.length === 0) {
    console.warn('[TEST] No providers to test - no API keys configured');
    return;
  }

  // Only test the first available provider to avoid startup delays
  const firstProvider = available[0];
  console.log(`[TEST] Testing ${firstProvider.name} API connection...`);

  try {
    const provider = ProviderFactory.create(firstProvider.id);
    const result = await provider.generateCode(
      'You are a test assistant.',
      'Say "API working" in exactly 2 words.',
      50
    );
    console.log(`[TEST] ${firstProvider.name} API connection successful!`);
    console.log(`[TEST] Response: ${result.text.substring(0, 50)}...`);
  } catch (error) {
    console.error(`[TEST] ${firstProvider.name} API connection FAILED:`, error.message);
  }
}

// Run test
testProviderConnections();

// Helper to sanitize player name for directory
function sanitizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 50);
}

// Challenge descriptions for system prompts
const CHALLENGE_CONFIG = {
  1: {
    name: 'BracketValidator - Stack-Based CLI Tool',
    systemPrompt: `You are a coding assistant helping build a bracket validation CLI tool in Node.js.

## Task
Build a CLI tool that validates whether brackets in a string are properly matched.

## Requirements
- Node.js ES module (use import/export)
- CLI with interactive mode (readline) or argument mode
- Stack-based bracket validation algorithm
- Support three bracket types: (), [], {}
- Ignore non-bracket characters
- Return validation result with error position if invalid

## Output Format
Return ONLY the complete code for index.js. No explanations, no markdown code blocks, just the raw JavaScript code.
The code must be complete and runnable with "node index.js".`,
  },
  2: {
    name: 'QuantumHeist - Terminal Pathfinding Game',
    systemPrompt: `You are a coding assistant helping build a terminal-based pathfinding puzzle game in Node.js.

## Task
Build a grid-based puzzle game with pathfinding using Dijkstra's algorithm.

## Requirements
- Node.js ES module (use import/export)
- Grid navigation with obstacles
- Implement Dijkstra's algorithm for pathfinding
- Console-based display
- Collectibles and obstacles

## Output Format
Return ONLY the complete code for index.js. No explanations, no markdown code blocks, just the raw JavaScript code.
The code must be complete and runnable with "node index.js".`,
  },
};

// Initialize workspace with starter files (async)
async function initializeWorkspace(playerDir, playerName, challenge) {
  const config = CHALLENGE_CONFIG[challenge] || CHALLENGE_CONFIG[1];

  // Create package.json
  const packageJson = {
    name: `${sanitizeName(playerName)}-challenge${challenge}`,
    version: '1.0.0',
    description: config.name,
    main: 'index.js',
    type: 'module',
    scripts: {
      start: 'node index.js',
    },
    author: playerName,
    license: 'MIT',
  };

  const packageJsonPath = resolve(playerDir, 'package.json');
  if (!existsSync(packageJsonPath)) {
    await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log(`Created package.json for ${playerName}`);
  }

  // Create CLAUDE.md
  const claudeMd = `# Prompt Duel - Challenge ${challenge}

Player: ${playerName}
Challenge: ${config.name}

## Instructions
This workspace is for your coding challenge.
Your code will be written to index.js based on your prompts.
`;

  const claudeMdPath = resolve(playerDir, 'CLAUDE.md');
  if (!existsSync(claudeMdPath)) {
    await writeFile(claudeMdPath, claudeMd);
  }

  // Create starter index.js if not exists
  const indexJsPath = resolve(playerDir, 'index.js');
  if (!existsSync(indexJsPath)) {
    await writeFile(indexJsPath, `// Prompt Duel - Challenge ${challenge}
// Player: ${playerName}
//
// Your code will appear here after submitting prompts.
`);
  }
}

// Broadcast to spectators
function broadcastToSpectators(roomCode, playerName, data) {
  const spectators = spectatorConnections.get(roomCode);
  if (!spectators || spectators.size === 0) return;

  const message = JSON.stringify({
    type: 'terminal-output',
    playerName,
    data,
  });

  spectators.forEach((spectatorWs) => {
    if (spectatorWs.readyState === 1) {
      spectatorWs.send(message);
    }
  });
}

// Generate code using AI provider
async function generateCode(session, prompt, ws) {
  const { playerName, challenge, playerDir, roomCode, provider = 'anthropic', model } = session;
  const config = CHALLENGE_CONFIG[challenge] || CHALLENGE_CONFIG[1];

  console.log(`[generateCode] Starting for ${playerName}`);
  console.log(`[generateCode] Prompt: "${prompt.substring(0, 100)}..."`);
  console.log(`[generateCode] Challenge: ${challenge}, PlayerDir: ${playerDir}`);
  console.log(`[generateCode] Provider: ${provider}, Model: ${model}`);

  // Send processing started
  console.log(`[generateCode] Sending processing-started...`);
  ws.send(JSON.stringify({ type: 'processing-started' }));
  console.log(`[generateCode] processing-started sent`);

  // Get provider info for display
  const providerInfo = ProviderFactory.getInfo(provider, model);
  const startMsg = `\n[${providerInfo.providerName}] Processing prompt for ${playerName} using ${providerInfo.modelName}...\n`;
  ws.send(JSON.stringify({ type: 'output', data: startMsg }));
  broadcastToSpectators(roomCode, playerName, startMsg);

  const startTime = Date.now();

  try {
    // Read current index.js content for context (async)
    const indexJsPath = resolve(playerDir, 'index.js');
    let currentCode = '';
    if (existsSync(indexJsPath)) {
      currentCode = await readFile(indexJsPath, 'utf-8');
    }

    // Build the message with context
    const userMessage = currentCode && !currentCode.includes('Your code will appear here')
      ? `Current code in index.js:\n\`\`\`javascript\n${currentCode}\n\`\`\`\n\nUser request: ${prompt}\n\nUpdate the code based on the request. Return the COMPLETE updated code.`
      : `User request: ${prompt}\n\nGenerate complete code for index.js. Include a comment header at the very top: "// Player: ${playerName} | Prompt Duel - Challenge ${challenge}"`;

    // Create provider instance and generate code
    console.log(`[generateCode] Creating ${provider} provider with model: ${model}`);
    const aiProvider = ProviderFactory.create(provider, model);

    console.log(`[generateCode] Calling ${providerInfo.providerName} API...`);
    console.log(`[generateCode] User message length: ${userMessage.length}`);
    console.log(`[generateCode] System prompt length: ${config.systemPrompt.length}`);

    // Send heartbeat messages while waiting for API response
    const heartbeat = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const msg = `\n[${providerInfo.providerName}] Still processing... (${elapsed}s elapsed)\n`;
      ws.send(JSON.stringify({ type: 'output', data: msg }));
      broadcastToSpectators(roomCode, playerName, msg);
    }, 15_000); // Every 15 seconds

    let response;
    try {
      response = await aiProvider.generateCode(config.systemPrompt, userMessage, 8192);
      console.log(`[generateCode] API call returned successfully`);
    } catch (apiError) {
      console.error(`[generateCode] API CALL FAILED:`);
      console.error(`[generateCode] Error type: ${apiError.constructor.name}`);
      console.error(`[generateCode] Error message: ${apiError.message}`);
      throw apiError;
    } finally {
      clearInterval(heartbeat);
    }
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[generateCode] API call took ${elapsed}s`);

    console.log(`[generateCode] API Response received!`);
    console.log(`[generateCode] Model: ${response.model}`);
    console.log(`[generateCode] Stop reason: ${response.stopReason}`);
    console.log(`[generateCode] Usage: input=${response.inputTokens}, output=${response.outputTokens}`);

    // Extract the code from response
    let generatedCode = response.text;
    console.log(`[generateCode] Generated code length: ${generatedCode.length}`);

    // Clean up the response - remove markdown code blocks if present
    generatedCode = generatedCode
      .replace(/^```(?:javascript|js)?\n?/gm, '')
      .replace(/\n?```$/gm, '')
      .trim();

    // Guard: never overwrite workspace with empty code
    if (!generatedCode) {
      console.warn(`[generateCode] WARNING: AI returned empty code (stop reason: ${response.stopReason}). Keeping existing file.`);
      const warnMsg = `\n[${providerInfo.providerName}] Warning: AI returned empty response (status: ${response.stopReason}). Your existing code was preserved. Try a shorter/simpler prompt.\n`;
      ws.send(JSON.stringify({ type: 'output', data: warnMsg }));
      broadcastToSpectators(roomCode, playerName, warnMsg);
    } else {
      // Write the code to index.js (async)
      await writeFile(indexJsPath, generatedCode);
      console.log(`[${playerName}] Code written to ${indexJsPath}`);
    }

    // Send output showing success
    const successMsg = generatedCode
      ? `\n[${providerInfo.providerName}] Code generated in ${elapsed}s\n[${providerInfo.providerName}] Model: ${providerInfo.modelName}\n[${providerInfo.providerName}] Size: ${generatedCode.length} chars, ${generatedCode.split('\n').length} lines\n[${providerInfo.providerName}] Tokens: ${response.outputTokens} output\n`
      : `\n[${providerInfo.providerName}] Generation incomplete — existing code preserved.\n`;
    ws.send(JSON.stringify({ type: 'output', data: successMsg }));
    broadcastToSpectators(roomCode, playerName, successMsg);

    // Show a preview of the code
    const preview = generatedCode.substring(0, 500) + (generatedCode.length > 500 ? '\n...(truncated)' : '');
    const previewMsg = `\n--- Code Preview ---\n${preview}\n--- End Preview ---\n`;
    ws.send(JSON.stringify({ type: 'output', data: previewMsg }));
    broadcastToSpectators(roomCode, playerName, previewMsg);

    // Build stats object
    const stats = {
      elapsedSeconds: parseFloat(elapsed),
      codeSize: generatedCode ? generatedCode.length : 0,
      codeLines: generatedCode ? generatedCode.split('\n').length : 0,
      outputTokens: response.outputTokens,
      status: generatedCode ? 'success' : 'incomplete',
    };

    // Send processing complete with stats
    ws.send(JSON.stringify({
      type: 'processing-complete',
      playerName,
      challenge,
      stats,
    }));

    // Broadcast stats to spectators
    broadcastToSpectators(roomCode, playerName, JSON.stringify({ type: 'generation-stats', playerName, stats }));

    console.log(`[${playerName}] Processing complete`);

  } catch (error) {
    console.error(`[generateCode] ERROR for ${playerName}:`);
    console.error(`[generateCode] Error name: ${error.name}`);
    console.error(`[generateCode] Error message: ${error.message}`);
    console.error(`[generateCode] Error stack:`, error.stack);
    if (error.status) console.error(`[generateCode] HTTP Status: ${error.status}`);
    if (error.error) console.error(`[generateCode] API Error details:`, JSON.stringify(error.error));

    const errorElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const errorStats = {
      elapsedSeconds: parseFloat(errorElapsed),
      codeSize: 0,
      codeLines: 0,
      outputTokens: 0,
      status: 'error',
    };

    const errorMsg = `\n[${providerInfo.providerName}] Error: ${error.message}\n`;
    ws.send(JSON.stringify({ type: 'output', data: errorMsg }));
    broadcastToSpectators(roomCode, playerName, errorMsg);

    // Still send processing complete so the game can continue
    ws.send(JSON.stringify({
      type: 'processing-complete',
      playerName,
      challenge,
      stats: errorStats,
    }));
  }
}

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  let sessionId = null;
  let spectatingRoom = null;

  ws.on('message', async (message) => {
    try {
      const msg = JSON.parse(message.toString());
      console.log(`[WS] Received message type: ${msg.type}, sessionId: ${sessionId}`);

      if (msg.type === 'start-session') {
        const { playerName, challenge, roomCode, provider = 'anthropic', model } = msg;

        // Create player workspace
        const sanitizedName = sanitizeName(playerName);
        const namespace = `${sanitizedName}_challenge${challenge}`;
        const playerDir = resolve(WORKSPACES_DIR, namespace);

        if (!existsSync(playerDir)) {
          await mkdir(playerDir, { recursive: true });
          console.log(`Created player workspace: ${playerDir}`);
        }

        // Initialize workspace files (async)
        await initializeWorkspace(playerDir, playerName, challenge);

        // Determine model to use (use provided model or default for provider)
        let selectedModel = model;
        if (!selectedModel) {
          const providerConfig = PROVIDER_CONFIG[provider];
          if (providerConfig) {
            const defaultModel = providerConfig.models.find(m => m.default);
            selectedModel = defaultModel ? defaultModel.id : providerConfig.models[0]?.id;
          }
        }

        // Create session with provider info
        sessionId = `${sanitizedName}_${Date.now()}`;
        sessions.set(sessionId, {
          ws,
          playerName,
          challenge,
          playerDir,
          roomCode,
          provider,
          model: selectedModel,
          lastActivity: Date.now(),
        });

        console.log(`Session ${sessionId} using provider: ${provider}, model: ${selectedModel}`);

        console.log(`Session ${sessionId} created for ${playerName}`);

        // Send session started
        ws.send(JSON.stringify({
          type: 'session-started',
          sessionId,
          workspace: playerDir,
          playerName,
          challenge,
        }));

        // Send welcome message
        const welcome = `\n=== Claude Code API Server ===\nPlayer: ${playerName}\nChallenge: ${challenge}\nWorkspace: ${playerDir}\nReady for prompts!\n\n`;
        ws.send(JSON.stringify({ type: 'output', data: welcome }));

      } else if (msg.type === 'input') {
        console.log(`[WS] Input received, sessionId: ${sessionId}, data length: ${msg.data?.length}`);

        const session = sessions.get(sessionId);
        if (session) {
          // Update last activity
          session.lastActivity = Date.now();

          // Check processing lock — reject if already processing
          if (processingLock.get(sessionId)) {
            console.log(`[${sessionId}] Rejecting input — already processing`);
            ws.send(JSON.stringify({ type: 'error', message: 'A prompt is already being processed. Please wait.' }));
            return;
          }

          const input = msg.data.trim();
          console.log(`[${sessionId}] Processing input: "${input.substring(0, 100)}..."`);

          // Set processing lock
          processingLock.set(sessionId, true);
          try {
            await generateCode(session, input, ws);
          } finally {
            processingLock.delete(sessionId);
          }
          console.log(`[${sessionId}] generateCode completed`);
        } else {
          console.log(`[${sessionId}] ERROR: No session found for input!`);
          ws.send(JSON.stringify({ type: 'error', message: 'No active session' }));
        }

      } else if (msg.type === 'kill-session') {
        if (sessionId && sessions.has(sessionId)) {
          sessions.delete(sessionId);
          processingLock.delete(sessionId);
          console.log(`Session ${sessionId} killed`);
        }

      } else if (msg.type === 'spectate-session') {
        const { roomCode } = msg;
        if (roomCode) {
          spectatingRoom = roomCode;
          if (!spectatorConnections.has(roomCode)) {
            spectatorConnections.set(roomCode, new Set());
          }
          spectatorConnections.get(roomCode).add(ws);
          console.log(`Spectator joined room ${roomCode}`);
          ws.send(JSON.stringify({ type: 'spectate-started', roomCode }));
        }

      } else if (msg.type === 'leave-spectate') {
        if (spectatingRoom) {
          const spectators = spectatorConnections.get(spectatingRoom);
          if (spectators) {
            spectators.delete(ws);
            if (spectators.size === 0) {
              spectatorConnections.delete(spectatingRoom);
            }
          }
          console.log(`Spectator left room ${spectatingRoom}`);
          spectatingRoom = null;
        }
      }

    } catch (e) {
      console.error('Error processing message:', e);
      ws.send(JSON.stringify({ type: 'error', message: e.message }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    if (sessionId && sessions.has(sessionId)) {
      sessions.delete(sessionId);
      processingLock.delete(sessionId);
    }
    if (spectatingRoom) {
      const spectators = spectatorConnections.get(spectatingRoom);
      if (spectators) {
        spectators.delete(ws);
        if (spectators.size === 0) {
          spectatorConnections.delete(spectatingRoom);
        }
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Clean up idle sessions every 5 minutes (remove sessions idle for 30+ minutes)
const SESSION_IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  sessions.forEach((session, sid) => {
    if (now - (session.lastActivity || 0) > SESSION_IDLE_TIMEOUT) {
      sessions.delete(sid);
      processingLock.delete(sid);
      cleaned++;
    }
  });
  if (cleaned > 0) {
    console.log(`[Cleanup] Removed ${cleaned} idle session(s). Active: ${sessions.size}`);
  }
}, 5 * 60 * 1000);

console.log('Server ready and waiting for connections...');
