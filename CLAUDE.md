# Prompt Duel

A competitive prompt engineering game where two players take turns crafting prompts for Claude Code.

## Development Rules

**IMPORTANT: Service Management**
- Always use the provided scripts to start/stop services
- **Windows (PowerShell)**: `.\scripts\start-all.ps1` and `.\scripts\stop-all.ps1`
- **Linux/Unix/Git Bash**: `bash scripts/start-all.sh` and `bash scripts/stop-all.sh`
- Never start individual services manually unless debugging a specific service
- After schema changes, run `bun run db:setup` in backend, then restart all services using the scripts

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

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Service | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | claude-code-server | Required for Claude CLI auth |
| `DATABASE_URL` | backend | SQLite database path |
| `WORKSPACES_DIR` | claude-code-server | Player workspace directory |
| `VITE_API_URL` | frontend | Backend API URL |
| `VITE_WS_URL` | frontend | WebSocket server URL |

## Docker Deployment

```bash
# Build and run all services
docker-compose up --build

# Access at http://localhost
```

## Railway Deployment

See [RAILWAY.md](./RAILWAY.md) for detailed deployment instructions.

**Quick overview - 3 services required:**

| Service | Directory | Volume |
|---------|-----------|--------|
| Frontend | `frontend/` | No |
| Backend | `backend/` | `/app/data` |
| Claude Code Server | `claude-code-server/` | `/app/workspaces`
