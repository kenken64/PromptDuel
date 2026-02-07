import { WebSocketServer } from 'ws';
import Anthropic from '@anthropic-ai/sdk';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: resolve(__dirname, '.env') });
console.log('Loaded .env from:', resolve(__dirname, '.env'));

const PORT = 3001;
const sessions = new Map();
const spectatorConnections = new Map(); // roomCode -> Set of WebSocket connections

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

if (process.env.ANTHROPIC_API_KEY) {
  console.log(`Auth: ANTHROPIC_API_KEY is set (${process.env.ANTHROPIC_API_KEY.substring(0, 15)}...)`);
} else {
  console.error('ERROR: ANTHROPIC_API_KEY is not set!');
}

console.log('\nActive sessions can be monitored via console logs.\n');

// Test Anthropic API connection at startup using fetch directly
async function testAnthropicConnection() {
  console.log('[TEST] Testing Anthropic API connection with fetch...');
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 50,
        messages: [{ role: 'user', content: 'Say "API working" in exactly 2 words.' }],
      }),
    });

    console.log('[TEST] Fetch response status:', response.status);
    const data = await response.json();
    console.log('[TEST] API Response:', JSON.stringify(data, null, 2));

    if (data.content && data.content[0]) {
      console.log('[TEST] Anthropic API connection successful!');
    } else if (data.error) {
      console.error('[TEST] API Error:', data.error.message);
    }
  } catch (error) {
    console.error('[TEST] Anthropic API connection FAILED:');
    console.error('[TEST] Error:', error.message);
  }
}

// Run test
testAnthropicConnection();

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

// Initialize workspace with starter files
function initializeWorkspace(playerDir, playerName, challenge) {
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
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
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
    writeFileSync(claudeMdPath, claudeMd);
  }

  // Create starter index.js if not exists
  const indexJsPath = resolve(playerDir, 'index.js');
  if (!existsSync(indexJsPath)) {
    writeFileSync(indexJsPath, `// Prompt Duel - Challenge ${challenge}
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

// Generate code using Anthropic API
async function generateCode(session, prompt, ws) {
  const { playerName, challenge, playerDir, roomCode } = session;
  const config = CHALLENGE_CONFIG[challenge] || CHALLENGE_CONFIG[1];

  console.log(`[generateCode] Starting for ${playerName}`);
  console.log(`[generateCode] Prompt: "${prompt.substring(0, 100)}..."`);
  console.log(`[generateCode] Challenge: ${challenge}, PlayerDir: ${playerDir}`);

  // Send processing started
  console.log(`[generateCode] Sending processing-started...`);
  ws.send(JSON.stringify({ type: 'processing-started' }));
  console.log(`[generateCode] processing-started sent`);

  // Send output to show we're working
  const startMsg = `\n[Claude API] Processing prompt for ${playerName}...\n`;
  ws.send(JSON.stringify({ type: 'output', data: startMsg }));
  broadcastToSpectators(roomCode, playerName, startMsg);

  try {
    // Read current index.js content for context
    const indexJsPath = resolve(playerDir, 'index.js');
    let currentCode = '';
    if (existsSync(indexJsPath)) {
      currentCode = readFileSync(indexJsPath, 'utf-8');
    }

    // Build the message with context
    const userMessage = currentCode && !currentCode.includes('Your code will appear here')
      ? `Current code in index.js:\n\`\`\`javascript\n${currentCode}\n\`\`\`\n\nUser request: ${prompt}\n\nUpdate the code based on the request. Return the COMPLETE updated code.`
      : `User request: ${prompt}\n\nGenerate complete code for index.js.`;

    // Call Anthropic API
    console.log(`[generateCode] Calling Anthropic API...`);
    console.log(`[generateCode] Model: claude-sonnet-4-20250514`);
    console.log(`[generateCode] User message length: ${userMessage.length}`);
    console.log(`[generateCode] System prompt length: ${config.systemPrompt.length}`);

    console.log(`[generateCode] About to call anthropic.messages.create...`);

    // Use explicit Promise handling to debug
    const apiPromise = anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: config.systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    console.log(`[generateCode] API promise created, type: ${typeof apiPromise}`);
    console.log(`[generateCode] Is promise: ${apiPromise instanceof Promise}`);
    console.log(`[generateCode] Awaiting API promise...`);

    let response;
    try {
      response = await apiPromise;
      console.log(`[generateCode] API call returned successfully`);
    } catch (apiError) {
      console.error(`[generateCode] API CALL FAILED:`);
      console.error(`[generateCode] Error type: ${apiError.constructor.name}`);
      console.error(`[generateCode] Error message: ${apiError.message}`);
      console.error(`[generateCode] Full error:`, apiError);
      throw apiError;
    }

    console.log(`[generateCode] API Response received!`);
    console.log(`[generateCode] Response ID: ${response.id}`);
    console.log(`[generateCode] Model: ${response.model}`);
    console.log(`[generateCode] Stop reason: ${response.stop_reason}`);
    console.log(`[generateCode] Usage: input=${response.usage?.input_tokens}, output=${response.usage?.output_tokens}`);
    console.log(`[generateCode] Content blocks: ${response.content?.length}`);

    // Extract the code from response
    let generatedCode = response.content[0].text;
    console.log(`[generateCode] Generated code length: ${generatedCode.length}`);

    // Clean up the response - remove markdown code blocks if present
    generatedCode = generatedCode
      .replace(/^```(?:javascript|js)?\n?/gm, '')
      .replace(/\n?```$/gm, '')
      .trim();

    // Write the code to index.js
    writeFileSync(indexJsPath, generatedCode);
    console.log(`[${playerName}] Code written to ${indexJsPath}`);

    // Send output showing success
    const successMsg = `\n[Claude API] Code generated successfully!\n[Claude API] Written to: ${indexJsPath}\n[Claude API] Lines: ${generatedCode.split('\n').length}\n`;
    ws.send(JSON.stringify({ type: 'output', data: successMsg }));
    broadcastToSpectators(roomCode, playerName, successMsg);

    // Show a preview of the code
    const preview = generatedCode.substring(0, 500) + (generatedCode.length > 500 ? '\n...(truncated)' : '');
    const previewMsg = `\n--- Code Preview ---\n${preview}\n--- End Preview ---\n`;
    ws.send(JSON.stringify({ type: 'output', data: previewMsg }));
    broadcastToSpectators(roomCode, playerName, previewMsg);

    // Send processing complete
    ws.send(JSON.stringify({
      type: 'processing-complete',
      playerName,
      challenge,
    }));

    console.log(`[${playerName}] Processing complete`);

  } catch (error) {
    console.error(`[generateCode] ERROR for ${playerName}:`);
    console.error(`[generateCode] Error name: ${error.name}`);
    console.error(`[generateCode] Error message: ${error.message}`);
    console.error(`[generateCode] Error stack:`, error.stack);
    if (error.status) console.error(`[generateCode] HTTP Status: ${error.status}`);
    if (error.error) console.error(`[generateCode] API Error details:`, JSON.stringify(error.error));

    const errorMsg = `\n[Claude API] Error: ${error.message}\n`;
    ws.send(JSON.stringify({ type: 'output', data: errorMsg }));
    broadcastToSpectators(roomCode, playerName, errorMsg);

    // Still send processing complete so the game can continue
    ws.send(JSON.stringify({
      type: 'processing-complete',
      playerName,
      challenge,
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
        const { playerName, challenge, roomCode } = msg;

        // Create player workspace
        const sanitizedName = sanitizeName(playerName);
        const namespace = `${sanitizedName}_challenge${challenge}`;
        const playerDir = resolve(WORKSPACES_DIR, namespace);

        if (!existsSync(playerDir)) {
          mkdirSync(playerDir, { recursive: true });
          console.log(`Created player workspace: ${playerDir}`);
        }

        // Initialize workspace files
        initializeWorkspace(playerDir, playerName, challenge);

        // Create session
        sessionId = `${sanitizedName}_${Date.now()}`;
        sessions.set(sessionId, {
          ws,
          playerName,
          challenge,
          playerDir,
          roomCode,
        });

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
        console.log(`[WS] Available sessions: ${Array.from(sessions.keys()).join(', ')}`);

        const session = sessions.get(sessionId);
        if (session) {
          const input = msg.data.trim();
          console.log(`[${sessionId}] Processing input: "${input.substring(0, 100)}..."`);

          // Generate code using Anthropic API
          console.log(`[${sessionId}] Calling generateCode...`);
          await generateCode(session, input, ws);
          console.log(`[${sessionId}] generateCode completed`);
        } else {
          console.log(`[${sessionId}] ERROR: No session found for input!`);
          console.log(`[WS] Session map has ${sessions.size} entries`);
          ws.send(JSON.stringify({ type: 'error', message: 'No active session' }));
        }

      } else if (msg.type === 'kill-session') {
        if (sessionId && sessions.has(sessionId)) {
          sessions.delete(sessionId);
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

console.log('Server ready and waiting for connections...');
