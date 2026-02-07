import { Database } from 'bun:sqlite';

const dbPath = process.env.DATABASE_URL || 'sqlite.db';
const db = new Database(dbPath);

console.log('Setting up database...');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    last_login_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    token TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    host_id INTEGER NOT NULL REFERENCES users(id),
    challenge INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'waiting',
    player1_id INTEGER REFERENCES users(id),
    player2_id INTEGER REFERENCES users(id),
    player1_ready INTEGER NOT NULL DEFAULT 0,
    player2_ready INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS room_spectators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL REFERENCES rooms(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    joined_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL REFERENCES rooms(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS duels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt1_id INTEGER NOT NULL REFERENCES prompts(id),
    prompt2_id INTEGER NOT NULL REFERENCES prompts(id),
    winner_id INTEGER REFERENCES prompts(id),
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS leaderboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_name TEXT NOT NULL,
    challenge INTEGER NOT NULL,
    score INTEGER NOT NULL,
    max_score INTEGER NOT NULL DEFAULT 100,
    percentage INTEGER NOT NULL,
    grade TEXT NOT NULL,
    prompts_used INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  -- Create indexes for better query performance
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
  CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
  CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
  CREATE INDEX IF NOT EXISTS idx_room_spectators_room_id ON room_spectators(room_id);
  CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
`);

console.log('Database setup complete!');
db.close();
