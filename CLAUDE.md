# Prompt Duel

A competitive prompt engineering game where two players take turns crafting prompts for Claude Code.

## Project Structure

```
promptduel/
├── frontend/          # React + Vite frontend
├── backend/           # Elysia/Bun backend with SQLite
├── claude-code-server/  # WebSocket server for Claude Code PTY sessions
├── workspaces/        # Player workspace directories (auto-created)
└── scripts/           # Start/stop scripts for all services
```

## Tech Stack

- **Frontend**: React, Vite, TypeScript, NES.css (retro styling), Tailwind CSS
- **Backend**: Bun, Elysia, Drizzle ORM, SQLite
- **Claude Code Server**: Node.js, WebSocket (ws), node-pty

## Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 5173 | Vite dev server |
| Backend | 3000 | Elysia API server |
| Claude Code Server | 3001 | WebSocket PTY server |

## Scripts

### Windows (PowerShell)
```powershell
# Start all services
.\scripts\start-all.ps1

# Stop all services
.\scripts\stop-all.ps1
```

### Unix/Git Bash
```bash
# Start all services
bash scripts/start-all.sh

# Stop all services
bash scripts/stop-all.sh
```

## Game Flow

1. **Landing Page**: Select Challenge 1 (Beginner) or Challenge 2 (Advanced)
2. **Group Setup**: Enter player names
3. **Game Screen**: Players take turns submitting prompts (max 7 each)
4. **Results**: Winner determined by prompts used

## Key Features

- Turn-based gameplay with 20-minute timer
- Each player gets 7 prompt attempts
- Players can end their prompts early
- Real-time Claude Code PTY sessions per player
- Console output display for each player

## Database Schema

- `users`: Player accounts
- `prompts`: Submitted prompts
- `duels`: Game sessions

## Development

### Install dependencies
```bash
cd frontend && bun install
cd backend && bun install
cd claude-code-server && npm install
```

### Database setup
```bash
cd backend && bun run db:setup
```

## Important Files

- `frontend/src/App.tsx` - Main game logic and state
- `frontend/src/components/LandingPage.tsx` - Challenge selection UI
- `frontend/src/components/UnifiedPromptArea.tsx` - Prompt input and turn management
- `claude-code-server/index.js` - PTY WebSocket server
- `backend/src/db/schema.ts` - Database schema
