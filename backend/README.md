# Prompt Duel Backend

Backend API for Prompt Duel built with Elysia and Bun, using Drizzle ORM with SQLite.

## Tech Stack

- **Runtime**: Bun
- **Framework**: Elysia
- **Database**: SQLite
- **ORM**: Drizzle ORM

## Getting Started

### Install Dependencies

```bash
bun install
```

### Database Setup

Generate and apply database migrations:

```bash
bun run db:push
```

Or use the traditional migration approach:

```bash
bun run db:generate
bun run db:migrate
```

### Development

Start the development server with hot reload:

```bash
bun run dev
```

The API will be available at `http://localhost:3000`

### Production

```bash
bun run start
```

## Database Management

- `bun run db:generate` - Generate migration files from schema
- `bun run db:migrate` - Apply migrations to database
- `bun run db:push` - Push schema changes directly to database (development)
- `bun run db:studio` - Open Drizzle Studio (visual database browser)

## API Endpoints

- `GET /` - API status
- `GET /health` - Health check
- `GET /users` - Get all users
- `GET /prompts` - Get all prompts
- `GET /duels` - Get all duels

## Database Schema

### Users
- `id` - Auto-incrementing primary key
- `username` - Unique username
- `email` - Unique email
- `createdAt` - Timestamp

### Prompts
- `id` - Auto-incrementing primary key
- `userId` - Foreign key to users
- `title` - Prompt title
- `content` - Prompt content
- `createdAt` - Timestamp

### Duels
- `id` - Auto-incrementing primary key
- `prompt1Id` - Foreign key to first prompt
- `prompt2Id` - Foreign key to second prompt
- `winnerId` - Foreign key to winning prompt (nullable)
- `status` - Duel status (pending, active, completed)
- `createdAt` - Timestamp
