/**
 * Test Setup — generates a never-expiring JWT + session for API testing.
 *
 * Run:  bun tests/setup.ts
 *
 * It will:
 *  1. Create (or reuse) a test user "testrunner"
 *  2. Create a second test user "testrunner2" (for 2-player scenarios)
 *  3. Mint a JWT with no `exp` claim (never expires)
 *  4. Insert a session row that expires 100 years from now
 *  5. Print the tokens for use in tests
 */

import { db } from '../src/db';
import { users, sessions } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { JWT_SECRET } from '../src/middleware/auth';

// Minimal JWT encoder (HS256) — no expiry claim
function encodeJwt(payload: object, secret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };

  const encode = (obj: object) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64url');

  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const data = `${headerB64}.${payloadB64}`;

  // HS256 signature
  const crypto = require('crypto');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64url');

  return `${data}.${signature}`;
}

async function ensureUser(username: string, email: string, password: string) {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (existing) return existing;

  const passwordHash = await bcrypt.hash(password, 10);
  const [newUser] = await db
    .insert(users)
    .values({ username, email, passwordHash })
    .returning();

  return newUser;
}

async function ensureSession(userId: number, token: string) {
  // Delete any existing sessions for this token
  await db.delete(sessions).where(eq(sessions.token, token));

  // Session expires 100 years from now (effectively never)
  const expiresAt = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({ userId, token, expiresAt });
}

async function main() {
  console.log('=== Test Setup ===\n');

  // User 1
  const user1 = await ensureUser('testrunner', 'testrunner@test.com', 'testpass123');
  const token1 = encodeJwt({ userId: user1.id, username: user1.username }, JWT_SECRET);
  await ensureSession(user1.id, token1);

  // User 2
  const user2 = await ensureUser('testrunner2', 'testrunner2@test.com', 'testpass123');
  const token2 = encodeJwt({ userId: user2.id, username: user2.username }, JWT_SECRET);
  await ensureSession(user2.id, token2);

  console.log('User 1:');
  console.log(`  id:       ${user1.id}`);
  console.log(`  username: ${user1.username}`);
  console.log(`  token:    ${token1}\n`);

  console.log('User 2:');
  console.log(`  id:       ${user2.id}`);
  console.log(`  username: ${user2.username}`);
  console.log(`  token:    ${token2}\n`);

  // Write tokens to a .env.test file for the test runner to consume
  const envContent = [
    `TEST_TOKEN_1=${token1}`,
    `TEST_TOKEN_2=${token2}`,
    `TEST_USER_1_ID=${user1.id}`,
    `TEST_USER_2_ID=${user2.id}`,
    `TEST_USER_1_NAME=${user1.username}`,
    `TEST_USER_2_NAME=${user2.username}`,
    `BASE_URL=http://localhost:3000`,
  ].join('\n');

  await Bun.write('tests/.env.test', envContent);
  console.log('Written to tests/.env.test');
  console.log('\n=== Setup Complete ===');
}

main().catch(console.error);
