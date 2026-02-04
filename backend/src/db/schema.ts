import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
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
