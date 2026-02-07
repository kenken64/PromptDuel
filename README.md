# Prompt Duel

A competitive prompt engineering game where two players battle head-to-head to write the best prompts for Claude Code. Each player gets up to 7 prompts to complete a coding challenge - the fewer prompts used with a higher score, the better!

## What is Prompt Duel?

Prompt Duel is a real-time multiplayer game that tests your prompt engineering skills. Two players compete simultaneously, each with their own Claude Code terminal session. The goal is to craft effective prompts that instruct Claude to build a working solution to the given challenge.

### How It Works

1. **Choose a Challenge** - Select from beginner or advanced coding challenges
2. **Enter Player Names** - Set up the two-player duel
3. **Take Turns Prompting** - Players alternate submitting prompts to Claude Code
4. **Watch Claude Work** - See real-time terminal output as Claude builds the solution
5. **Score & Win** - Automated evaluation scores each player's solution

## Game Mechanics

### Scoring System

Your final score is calculated as: **Raw Score × Multiplier**

The multiplier rewards efficiency - fewer prompts = higher multiplier:

| Prompts Used | Multiplier |
|--------------|------------|
| 1 prompt | 0.3× |
| 2 prompts | 0.5× |
| 3 prompts | 0.7× |
| 4 prompts | 0.85× |
| 5 prompts | 0.9× |
| 6 prompts | 0.95× |
| 7 prompts | 1.0× |

### Rules

- Each player gets a maximum of **7 prompts**
- Each prompt is limited to **280 characters** (like a tweet!)
- Game has a **20-minute timer** (configurable)
- Players can **end early** if satisfied with their solution
- Turn-based gameplay ensures fair competition

### Challenges

| Challenge | Difficulty | Description |
|-----------|------------|-------------|
| Challenge 1 | Beginner | **BracketValidator** - Build a CLI tool using stack-based bracket validation |
| Challenge 2 | Advanced | **QuantumHeist** - Build a terminal pathfinding puzzle game with Dijkstra's algorithm |

## Features

- **Real-time Claude Code Integration** - Each player gets their own PTY terminal session
- **Live Terminal Output** - Watch Claude Code work in real-time
- **Automated Scoring** - AI-powered evaluation of solutions
- **Leaderboard** - Track top scores across all games
- **Retro UI** - NES.css styled interface for that classic gaming feel
- **Turn-based Gameplay** - Fair alternating prompt submission
- **Docker Support** - Easy deployment with Docker Compose
- **Railway Ready** - Deploy to cloud with included configuration

## Screenshots

```
┌─────────────────────────────────────────────────────────┐
│                    PROMPT DUEL                          │
│                                                         │
│     ┌─────────────┐         ┌─────────────┐            │
│     │ Challenge 1 │         │ Challenge 2 │            │
│     │   ★         │         │   🏆        │            │
│     │  BEGINNER   │         │  ADVANCED   │            │
│     └─────────────┘         └─────────────┘            │
│                                                         │
│              [ View Leaderboard ]                       │
└─────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Vite, TypeScript, NES.css, Tailwind CSS |
| Backend | Bun, Elysia, Drizzle ORM, SQLite |
| Claude Integration | Node.js, WebSocket (ws), node-pty, Claude Code CLI |
| Deployment | Docker, Docker Compose, Railway |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Prompt Duel                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────────────┐ │
│  │  Frontend   │    │   Backend   │    │ Claude Code      │ │
│  │  (React)    │───▶│  (Elysia)   │    │ Server (node-pty)│ │
│  │  Port 5173  │    │  Port 3000  │    │ Port 3001        │ │
│  └──────┬──────┘    └──────┬──────┘    └────────┬─────────┘ │
│         │                  │                     │           │
│         │           ┌──────▼──────┐              │           │
│         │           │   SQLite    │              ▼           │
│         │           │  Database   │     ┌───────────────┐   │
│         │           └─────────────┘     │  Claude Code  │   │
│         │                               │     CLI       │   │
│         └───────────────────────────────┴───────────────┘   │
│                      WebSocket Connection                    │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [Bun](https://bun.sh/) (for backend)
- [Anthropic API Key](https://console.anthropic.com/) (for Claude Code)

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/promptduel.git
cd promptduel

# Install dependencies
cd frontend && npm install && cd ..
cd backend && bun install && cd ..
cd claude-code-server && npm install && cd ..
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### 3. Start Services

**Windows (PowerShell):**
```powershell
.\scripts\start-all.ps1
```

**Unix/Mac:**
```bash
bash scripts/start-all.sh
```

### 4. Play!

Open http://localhost:5173 in your browser.

## Docker Deployment

```bash
# Copy and configure environment
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

# Build and run all services
docker-compose up --build

# Access at http://localhost
```

## Cloud Deployment (Railway)

See [RAILWAY.md](./RAILWAY.md) for detailed deployment instructions.

**Quick overview - 3 services required:**

| Service | Directory | Port |
|---------|-----------|------|
| Frontend | `frontend/` | 80 |
| Backend | `backend/` | 3000 |
| Claude Code Server | `claude-code-server/` | 3001 |

## Project Structure

```
promptduel/
├── frontend/               # React + Vite frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom hooks
│   │   ├── config.ts       # API configuration
│   │   └── gameRules.ts    # Scoring logic
│   └── Dockerfile
├── backend/                # Elysia/Bun API server
│   ├── src/
│   │   ├── db/             # Database schema & setup
│   │   ├── evaluate.ts     # Solution evaluation
│   │   └── index.ts        # API routes
│   └── Dockerfile
├── claude-code-server/     # WebSocket PTY server
│   ├── index.js            # PTY session manager
│   └── Dockerfile
├── workspaces/             # Player workspace files (auto-created)
├── scripts/                # Start/stop scripts
├── docker-compose.yml      # Docker orchestration
├── RAILWAY.md              # Railway deployment guide
└── CLAUDE.md               # Project documentation
```

## Environment Variables

| Variable | Service | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | claude-code-server | **Required** - Anthropic API key |
| `DATABASE_URL` | backend | SQLite database path |
| `WORKSPACES_DIR` | claude-code-server | Player workspace directory |
| `VITE_API_URL` | frontend | Backend API URL |
| `VITE_WS_URL` | frontend | WebSocket server URL |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/evaluate` | POST | Evaluate both players' solutions |
| `/evaluate-player` | POST | Evaluate single player's solution |
| `/leaderboard` | GET | Get all leaderboard entries |
| `/leaderboard/:challenge` | GET | Get leaderboard for specific challenge |
| `/leaderboard` | POST | Add new leaderboard entry |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

Built with Claude Code
