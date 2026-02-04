import { WebSocketServer } from 'ws';
import * as pty from 'node-pty';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 3001;
const sessions = new Map();

// Base directory for player workspaces
const WORKSPACES_DIR = resolve(__dirname, '../workspaces');

// Ensure workspaces directory exists
if (!existsSync(WORKSPACES_DIR)) {
  mkdirSync(WORKSPACES_DIR, { recursive: true });
  console.log(`Created workspaces directory: ${WORKSPACES_DIR}`);
}

// Determine shell based on platform
const isWindows = os.platform() === 'win32';

// On Windows, Claude Code requires git-bash
const getWindowsShell = () => {
  // Check common git-bash locations
  const possiblePaths = [
    process.env.CLAUDE_CODE_GIT_BASH_PATH,
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
    'D:\\Program Files\\Git\\bin\\bash.exe',
    'D:\\Program Files\\Git\\usr\\bin\\bash.exe',
    'C:\\Git\\bin\\bash.exe',
  ].filter(Boolean);

  for (const p of possiblePaths) {
    if (existsSync(p)) {
      console.log(`Found git-bash at: ${p}`);
      return p;
    }
  }

  // Fallback to just 'bash' hoping it's in PATH
  console.log('Git-bash not found in common locations, trying PATH...');
  return 'bash';
};

const shell = isWindows ? getWindowsShell() : '/bin/zsh';
// Spawn interactive shell first, then send claude command after
const shellArgs = isWindows
  ? ['--login', '-i']
  : ['-l'];

const wss = new WebSocketServer({ port: PORT });

console.log(`Claude Code Terminal Server listening on ws://localhost:${PORT}`);
console.log(`Workspaces directory: ${WORKSPACES_DIR}`);
console.log(`Platform: ${os.platform()}, Shell: ${shell}`);

// Helper to sanitize player name for directory
function sanitizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 50);
}

// Challenge descriptions
const CHALLENGE_CONFIG = {
  1: {
    name: 'BracketValidator - Stack-Based CLI Tool',
    description: `Build the BracketValidator CLI tool using a stack-based algorithm.

## Reference
- Repo: https://github.com/kenken64/BracketValidator
- Solution: https://github.com/kenken64/BracketValidator/blob/main/SOLUTION.md

## Requirements
- Must be written in Node.js
- CLI application with interactive and argument modes
- Stack-based bracket validation algorithm

## Core Rules
1. Every opening bracket must have matching closing bracket
2. Brackets close in correct order (innermost first - LIFO)
3. Support three bracket types: (), [], {}
4. Ignore all non-bracket characters
5. Return { valid: true } for valid input
6. Return { valid: false, error, position } for invalid input

## Algorithm Requirements
- Use stack (array) to track opening brackets with positions
- O(1) bracket pair lookup using object mapping
- Single pass through input - O(n) time complexity
- Position tracking for error reporting

## Error Detection
- Unexpected closing bracket (no match available)
- Mismatched bracket types
- Unclosed opening brackets remaining in stack

## Scoring Criteria (Weighted)
- Functionality/Test Cases: 40%
- Algorithm Efficiency: 20%
- Error Handling: 15%
- Code Quality: 15%
- CLI Implementation: 10%`,
  },
  2: {
    name: 'QuantumHeist - Terminal Pathfinding Game',
    description: `Build the QuantumHeist terminal-based pathfinding puzzle game.

## Reference
- Repo: https://github.com/kenken64/QuantumHeist
- Solution Guide: https://github.com/kenken64/QuantumHeist/blob/main/SOLUTION_GUIDE.md

## Requirements
- Must be written in Node.js
- Implement Dijkstra's algorithm for pathfinding
- Grid-based puzzle with state compression

## Game Elements
- Grid navigation (4 directions)
- Collectibles: Gems (G), Keys (K)
- Obstacles: Walls (#), Doors (D), Lasers (L)
- Special: Portals (P), Time Rifts (T)
- Start (S) and Exit (E) points

## Algorithm Requirements
- Use min-heap priority queue
- State = (position, time, collected items via bitmasks)
- Portal: 0 time cost, single use
- Time rift: -2 time, requires time >= 2
- Laser: blocks if time % 3 == 0

## Scoring Criteria (100 points)
- Algorithm Design & Implementation: 25 pts
- Data Structures (heap, bitmask, hashmap): 20 pts
- Game Mechanics Implementation: 20 pts
- Code Quality: 15 pts
- Complexity Analysis: 10 pts
- Testing & Correctness: 5 pts
- Performance: 3 pts
- Documentation: 2 pts`,
  },
};

// Initialize Node.js project in workspace
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
      dev: 'node --watch index.js'
    },
    keywords: ['prompt-duel', `challenge${challenge}`],
    author: playerName,
    license: 'MIT'
  };

  const packageJsonPath = resolve(playerDir, 'package.json');
  if (!existsSync(packageJsonPath)) {
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log(`Created package.json for ${playerName}`);
  }

  // Create CLAUDE.md with basic project details (no challenge requirements revealed)
  const challengeHint = challenge === 1
    ? 'CLI Tool - Build a command-line application based on the player\'s prompt.'
    : 'Terminal Game - Build a terminal-based game application based on the player\'s prompt.';

  const claudeMd = `# Prompt Duel - Challenge ${challenge}

Player: ${playerName}
Type: ${challengeHint}

## Instructions
This is a Node.js coding challenge. You must implement what the player asks for.

**IMPORTANT:** Only implement what the player specifically requests in their prompt.
Do NOT assume or add features that weren't explicitly requested.
If the prompt is vague or unclear, create a minimal implementation that matches only what was asked.

## Project Setup
- Main entry point: \`index.js\`
- Run with: \`node index.js\` or \`npm start\`
- This is an ES module project (use import/export)
- You can use readline for CLI input
- You can install npm packages if needed

## Rules
- Follow the player's prompt exactly
- Don't add extra features unless asked
- Keep it simple if the prompt is simple
- For CLI apps: handle command line arguments or interactive input
- For terminal games: use console output for display
`;

  const claudeMdPath = resolve(playerDir, 'CLAUDE.md');
  if (!existsSync(claudeMdPath)) {
    writeFileSync(claudeMdPath, claudeMd);
    console.log(`Created CLAUDE.md for ${playerName}`);
  }

  // Create starter index.js (minimal, no challenge hints)
  const indexJs = `// Prompt Duel - Challenge ${challenge}
// Player: ${playerName}
//
// Implement what the player requests in their prompt.

// Your code goes here...
`;

  const indexJsPath = resolve(playerDir, 'index.js');
  if (!existsSync(indexJsPath)) {
    writeFileSync(indexJsPath, indexJs);
    console.log(`Created index.js for ${playerName}`);
  }
}

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  let sessionId = null;

  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message.toString());

      if (msg.type === 'start-session') {
        const { cols = 80, rows = 24, playerName, challenge } = msg;

        let cwd = WORKSPACES_DIR;

        // Create player-specific namespace directory
        if (playerName && challenge) {
          const sanitizedName = sanitizeName(playerName);
          const namespace = `${sanitizedName}_challenge${challenge}`;
          const playerDir = resolve(WORKSPACES_DIR, namespace);

          // Create directory if it doesn't exist
          const isNewWorkspace = !existsSync(playerDir);
          if (isNewWorkspace) {
            mkdirSync(playerDir, { recursive: true });
            console.log(`Created player workspace: ${playerDir}`);
          }

          // Initialize Node.js project
          initializeWorkspace(playerDir, playerName, challenge);

          cwd = playerDir;
        }

        console.log(`Starting PTY session for ${playerName || 'unknown'} in: ${cwd}`);

        // Spawn shell with PTY
        // Pass through all env vars to ensure Claude Code auth works
        // Use WinPTY on Windows (useConpty: false) to avoid AttachConsole errors
        const ptyProcess = pty.spawn(shell, shellArgs, {
          name: 'xterm-256color',
          cols,
          rows,
          cwd,
          useConpty: !isWindows, // Disable ConPTY on Windows, use WinPTY instead
          env: {
            ...process.env,
            PLAYER_NAME: playerName || 'Player',
            CHALLENGE: challenge ? challenge.toString() : '1',
            // Ensure HOME is set for Claude Code to find auth credentials
            HOME: process.env.HOME || process.env.USERPROFILE,
            // Set git-bash path for Claude Code on Windows
            CLAUDE_CODE_GIT_BASH_PATH: isWindows ? shell : undefined,
          },
        });

        sessionId = `${sanitizeName(playerName || 'player')}_${Date.now()}`;
        sessions.set(sessionId, { ptyProcess, ws, playerName, challenge });

        console.log(`PTY session ${sessionId} created with PID: ${ptyProcess.pid}`);

        // Send welcome message
        const welcome = '\r\n\x1b[32m=== Claude Code Terminal ===\x1b[0m\r\n' +
                       `\x1b[36mPlayer:\x1b[0m ${playerName || 'Unknown'}\r\n` +
                       `\x1b[36mChallenge:\x1b[0m ${challenge || 'N/A'}\r\n` +
                       `\x1b[36mDirectory:\x1b[0m ${cwd}\r\n` +
                       '\x1b[33mAuto-launching Claude Code...\x1b[0m\r\n\r\n';
        ws.send(JSON.stringify({ type: 'output', data: welcome }));

        // Forward PTY output to WebSocket and detect completion markers
        ptyProcess.onData((data) => {
          if (ws.readyState === 1) {
            const session = sessions.get(sessionId);

            // Check for completion marker in output
            if (session && session.isProcessing && session.completionMarker) {
              if (data.includes(session.completionMarker)) {
                console.log(`[${sessionId}] Detected completion marker`);
                session.isProcessing = false;

                // Send completion notification to client with player info for evaluation
                ws.send(JSON.stringify({
                  type: 'processing-complete',
                  playerName: session.playerName,
                  challenge: session.challenge,
                }));

                // Remove marker from output before sending to client
                const cleanedData = data.replace(session.completionMarker, '').replace(/\n\s*\n/g, '\n');
                if (cleanedData.trim()) {
                  ws.send(JSON.stringify({ type: 'output', data: cleanedData }));
                }
                session.completionMarker = null;
                return;
              }
            }

            ws.send(JSON.stringify({ type: 'output', data }));
          }
        });

        // Handle PTY exit
        ptyProcess.onExit(({ exitCode, signal }) => {
          console.log(`PTY session ${sessionId} exited with code ${exitCode}, signal ${signal}`);
          if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'exit', exitCode }));
          }
          sessions.delete(sessionId);
        });

        ws.send(JSON.stringify({
          type: 'session-started',
          sessionId,
          workspace: cwd,
          playerName,
          challenge
        }));

        // Set up environment for Claude Code (don't auto-launch, wait for user prompts)
        setTimeout(() => {
          if (sessions.has(sessionId)) {
            // Set the git bash path environment variable first
            const envCmd = isWindows
              ? `export CLAUDE_CODE_GIT_BASH_PATH="${shell}"\r`
              : '';
            if (envCmd) {
              ptyProcess.write(envCmd);
            }
            console.log(`Session ${sessionId} ready for Claude prompts`);
          }
        }, 1000);

      } else if (msg.type === 'input') {
        const session = sessions.get(sessionId);
        if (session) {
          const input = msg.data.trim();
          console.log(`[${sessionId}] Received input: ${input.substring(0, 100)}...`);

          // Mark session as processing
          session.isProcessing = true;

          // Generate unique completion marker for this request
          const completionMarker = `___CLAUDE_DONE_${Date.now()}___`;
          session.completionMarker = completionMarker;

          // Use Claude's --print mode with completion marker
          // Heredoc delimiter must be on its own line, then echo marker on next line
          const claudeCmd = `claude --dangerously-skip-permissions --print << 'PROMPT_EOF'
${input}
PROMPT_EOF
echo "${completionMarker}"
`;
          session.ptyProcess.write(claudeCmd);
          console.log(`[${sessionId}] Sent Claude --print command with marker: ${completionMarker}`);

          // Notify client that processing started
          ws.send(JSON.stringify({ type: 'processing-started' }));
        } else {
          console.log(`[${sessionId}] No session found for input`);
        }
      } else if (msg.type === 'resize') {
        const session = sessions.get(sessionId);
        if (session) {
          session.ptyProcess.resize(msg.cols, msg.rows);
          console.log(`Resized PTY to ${msg.cols}x${msg.rows}`);
        }
      } else if (msg.type === 'kill-session') {
        const session = sessions.get(sessionId);
        if (session) {
          session.ptyProcess.kill();
          sessions.delete(sessionId);
          console.log(`Session ${sessionId} killed`);
        }
      }
    } catch (e) {
      console.error('Error processing message:', e);
      ws.send(JSON.stringify({ type: 'error', message: e.message }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    if (sessionId) {
      const session = sessions.get(sessionId);
      if (session) {
        session.ptyProcess.kill();
        sessions.delete(sessionId);
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// List active sessions endpoint (for debugging)
console.log('\nActive sessions can be monitored via console logs.');
