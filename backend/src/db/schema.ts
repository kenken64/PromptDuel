import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  timezone: text('timezone').notNull().default('Asia/Singapore'),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const rooms = sqliteTable('rooms', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  hostId: integer('host_id')
    .notNull()
    .references(() => users.id),
  challenge: integer('challenge').notNull().default(1),
  timerMinutes: integer('timer_minutes').notNull().default(20), // 20, 30, or 60 minutes
  status: text('status').notNull().default('waiting'), // waiting, playing, finished
  player1Id: integer('player1_id').references(() => users.id),
  player2Id: integer('player2_id').references(() => users.id),
  player1Ready: integer('player1_ready', { mode: 'boolean' }).notNull().default(false),
  player2Ready: integer('player2_ready', { mode: 'boolean' }).notNull().default(false),
  player1Provider: text('player1_provider').notNull().default('anthropic'),
  player1Model: text('player1_model').notNull().default('claude-sonnet-4-20250514'),
  player2Provider: text('player2_provider').notNull().default('anthropic'),
  player2Model: text('player2_model').notNull().default('claude-sonnet-4-20250514'),
  // Game results stored as JSON for retrieval by all players/spectators
  evaluationResults: text('evaluation_results'), // JSON string of evaluation results
  player1Score: integer('player1_score'),
  player2Score: integer('player2_score'),
  player1PromptsUsed: integer('player1_prompts_used'),
  player2PromptsUsed: integer('player2_prompts_used'),
  player1Penalty: integer('player1_penalty').notNull().default(0),
  player2Penalty: integer('player2_penalty').notNull().default(0),
  winnerId: integer('winner_id').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const roomSpectators = sqliteTable('room_spectators', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  roomId: integer('room_id')
    .notNull()
    .references(() => rooms.id),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  joinedAt: integer('joined_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const chatMessages = sqliteTable('chat_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  roomId: integer('room_id')
    .notNull()
    .references(() => rooms.id),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  message: text('message').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const prompts = sqliteTable('prompts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  title: text('title').notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const duels = sqliteTable('duels', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  prompt1Id: integer('prompt1_id')
    .notNull()
    .references(() => prompts.id),
  prompt2Id: integer('prompt2_id')
    .notNull()
    .references(() => prompts.id),
  winnerId: integer('winner_id').references(() => prompts.id),
  status: text('status').notNull().default('pending'), // pending, active, completed
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Challenge prompts - pre-defined sample prompts for each challenge
export const challengePrompts = sqliteTable('challenge_prompts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  challenge: integer('challenge').notNull(), // 1 = Basic Validator, 2 = Advanced
  promptNumber: integer('prompt_number').notNull(), // 1-7
  title: text('title').notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Password reset tokens
export const passwordResetTokens = sqliteTable('password_reset_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  usedAt: integer('used_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Leaderboard table to track player scores across challenges
export const leaderboard = sqliteTable('leaderboard', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  playerName: text('player_name').notNull(),
  challenge: integer('challenge').notNull(), // 1 or 2
  score: integer('score').notNull(),
  maxScore: integer('max_score').notNull().default(100),
  percentage: integer('percentage').notNull(),
  grade: text('grade').notNull(), // A, B, C, D, F
  promptsUsed: integer('prompts_used').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});
