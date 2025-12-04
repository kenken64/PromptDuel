# Prompt Duel

A prompt dueling application with a React frontend and Elysia/Bun backend.

## Architecture

- **Frontend**: React + Vite
- **Backend**: Elysia + Bun + Drizzle ORM + SQLite

## Quick Start with Docker

### Using Docker Compose (Recommended)

Build and run both services:

```bash
docker-compose up --build
```

The application will be available at:
- Frontend: http://localhost
- Backend API: http://localhost:3000

### Stop the services:

```bash
docker-compose down
```

### Stop and remove volumes (clears database):

```bash
docker-compose down -v
```

## Development Setup

### Quick Start with Scripts

Start all services:
```bash
./scripts/start-all.sh
```

Stop all services:
```bash
./scripts/stop-all.sh
```

Check service status:
```bash
./scripts/status.sh
```

### Individual Services

**Start Backend:**
```bash
./scripts/start-backend.sh
```

**Stop Backend:**
```bash
./scripts/stop-backend.sh
```

**Start Frontend:**
```bash
./scripts/start-frontend.sh
```

**Stop Frontend:**
```bash
./scripts/stop-frontend.sh
```

### Manual Setup

**Backend:**
```bash
cd backend
bun install
bun run db:push
bun run dev
```

Backend runs on http://localhost:3000

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173 (Vite default)

## Docker Commands

### Build individual services:

```bash
# Backend
docker build -t prompt-duel-backend ./backend

# Frontend
docker build -t prompt-duel-frontend ./frontend
```

### Run individual containers:

```bash
# Backend
docker run -p 3000:3000 -v prompt-duel-data:/app/data prompt-duel-backend

# Frontend
docker run -p 80:80 prompt-duel-frontend
```

## Environment Variables

### Backend
- `DATABASE_URL` - Path to SQLite database (default: `./sqlite.db`)
- `NODE_ENV` - Environment mode (development/production)

## Project Structure

```
PromptDuel/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.ts    # Database schema
│   │   │   └── index.ts     # Database connection
│   │   └── index.ts         # Main server file
│   ├── Dockerfile
│   ├── drizzle.config.ts
│   └── package.json
├── frontend/
│   ├── src/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── scripts/
│   ├── start-all.sh         # Start both services
│   ├── stop-all.sh          # Stop both services
│   ├── start-backend.sh     # Start backend only
│   ├── stop-backend.sh      # Stop backend only
│   ├── start-frontend.sh    # Start frontend only
│   ├── stop-frontend.sh     # Stop frontend only
│   └── status.sh            # Check service status
└── docker-compose.yml
```

## Database

The SQLite database is persisted in a Docker volume named `backend-data` when using Docker Compose.

To view the database with Drizzle Studio:

```bash
cd backend
bun run db:studio
```

## API Endpoints

- `GET /` - API status
- `GET /health` - Health check
- `GET /users` - Get all users
- `GET /prompts` - Get all prompts
- `GET /duels` - Get all duels
