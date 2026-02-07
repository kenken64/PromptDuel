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

  -- Challenge prompts - sample/answer prompts shown after game ends
  CREATE TABLE IF NOT EXISTS challenge_prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    challenge INTEGER NOT NULL,
    prompt_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  -- Create indexes for better query performance
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
  CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
  CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
  CREATE INDEX IF NOT EXISTS idx_room_spectators_room_id ON room_spectators(room_id);
  CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
  CREATE INDEX IF NOT EXISTS idx_challenge_prompts_challenge ON challenge_prompts(challenge);
`);

// Seed Challenge 1 prompts (Bracket Validator)
const challenge1Prompts = [
  {
    promptNumber: 1,
    title: 'Basic Validator Setup',
    content: 'Create a bracket validator class that checks if opening brackets (, [, { match their closing counterparts ), ], }. Use a stack data structure to track open brackets and validate proper nesting order.',
  },
  {
    promptNumber: 2,
    title: 'Input Processing',
    content: "Add a method to process input strings character by character. Identify bracket characters and ignore non-bracket characters. Return boolean true for valid sequences, false for invalid ones.",
  },
  {
    promptNumber: 3,
    title: 'Stack Implementation',
    content: 'Implement push operation when encountering opening brackets and pop operation for closing brackets. Verify that popped bracket matches the current closing bracket type.',
  },
  {
    promptNumber: 4,
    title: 'Edge Case Handling',
    content: 'Handle edge cases: empty strings (valid), strings with only opening brackets (invalid), strings with only closing brackets (invalid), and mismatched bracket types like ([)].',
  },
  {
    promptNumber: 5,
    title: 'Multiple Test Cases',
    content: 'Create unit tests for: valid nested brackets {[()]}, invalid sequences {[(])}, mixed content a(b[c]d)e, empty input, and single bracket cases ( or ).',
  },
  {
    promptNumber: 6,
    title: 'Error Messages',
    content: "Enhance validator to return descriptive error messages indicating position and type of bracket mismatch. Example: 'Missing closing bracket for [ at position 3'.",
  },
  {
    promptNumber: 7,
    title: 'CLI Interface',
    content: 'Build command-line interface accepting bracket sequences as arguments. Display validation result with color-coded output: green for valid, red for invalid with error details.',
  },
];

// Seed Challenge 2 prompts (Quantum Heist - Advanced)
const challenge2Prompts = [
  {
    promptNumber: 1,
    title: 'MinHeap Data Structure',
    content: 'Create a Node.js MinHeap class with insert, extractMin, bubbleUp, bubbleDown, isEmpty, and size methods. Items have a .time property used for priority comparison. Export the class. Use array-based heap with standard parent/child index math.',
  },
  {
    promptNumber: 2,
    title: 'Grid Parser & State Class',
    content: 'Write a parseMuseum(grid) function that takes a string array grid and finds positions of S, E, G, K, D, P, L, T elements. Assign bitmask indices to gems, keys, portals. Also create a State class storing row, col, time, gems, keys, portals, rifts, path.',
  },
  {
    promptNumber: 3,
    title: 'Core Solver (Dijkstra + Bitmask)',
    content: 'Implement solveQuantumHeist(grid) using Dijkstra with MinHeap. State = [row,col,gemMask,keyMask,portalMask,riftMask]. Handle walls, gems, keys, doors, portals(0 cost), lasers(blocked if time%3==0), time rifts(-2 time, single use). Return min time & path.',
  },
  {
    promptNumber: 4,
    title: 'Worst Path Solver & Visualization',
    content: 'Add solveWorstPath(grid) that finds the longest valid path to exit with all gems using modified Dijkstra maximizing time. Add visualizeMuseum(grid) that prints a colorized grid using ANSI codes: green=S, red=E, yellow=G, cyan=K, magenta=D, blue=P.',
  },
  {
    promptNumber: 5,
    title: 'Test Cases & Test Runner',
    content: 'Create 10 test cases as grid string arrays: simple path, key+door, portal shortcut, laser timing, multi-gem, time rift, impossible(-1), and 3 complex combos. Add runTests() that runs solveQuantumHeist on each, compares results, prints pass/fail summary.',
  },
  {
    promptNumber: 6,
    title: 'ASCII Animation & Demo Mode',
    content: 'Add animatePath(grid,path) that animates player movement step-by-step using console clear and ANSI colors. Show gems/keys collected. Add interactiveDemo() with a 12x15 demo puzzle featuring all elements. Include best path, worst path, and both options.',
  },
  {
    promptNumber: 7,
    title: 'Interactive CLI, Menus & Exports',
    content: 'Add interactive CLI with readline: main menu (run tests, single test, demo, custom puzzle input, complexity analysis, game rules, exit). Parse --test, --demo, --help CLI args. Export solveQuantumHeist, parseMuseum, visualizeMuseum, MinHeap, State, testCases.',
  },
];

// Insert Challenge 1 prompts if not exists
const existingPrompts1 = db.query('SELECT COUNT(*) as count FROM challenge_prompts WHERE challenge = 1').get() as { count: number };
if (existingPrompts1.count === 0) {
  console.log('Seeding Challenge 1 prompts...');
  const insertStmt = db.prepare('INSERT INTO challenge_prompts (challenge, prompt_number, title, content) VALUES (?, ?, ?, ?)');
  for (const prompt of challenge1Prompts) {
    insertStmt.run(1, prompt.promptNumber, prompt.title, prompt.content);
  }
  console.log('Challenge 1 prompts seeded!');
} else {
  console.log('Challenge 1 prompts already exist, skipping seed.');
}

// Insert Challenge 2 prompts if not exists
const existingPrompts2 = db.query('SELECT COUNT(*) as count FROM challenge_prompts WHERE challenge = 2').get() as { count: number };
if (existingPrompts2.count === 0) {
  console.log('Seeding Challenge 2 prompts...');
  const insertStmt = db.prepare('INSERT INTO challenge_prompts (challenge, prompt_number, title, content) VALUES (?, ?, ?, ?)');
  for (const prompt of challenge2Prompts) {
    insertStmt.run(2, prompt.promptNumber, prompt.title, prompt.content);
  }
  console.log('Challenge 2 prompts seeded!');
} else {
  console.log('Challenge 2 prompts already exist, skipping seed.');
}

console.log('Database setup complete!');
db.close();
