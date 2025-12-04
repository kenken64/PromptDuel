import { Elysia } from 'elysia';
import { db } from './db';
import { users, prompts, duels } from './db/schema';

const app = new Elysia()
  .get('/', () => 'Prompt Duel API')
  .get('/health', () => ({ status: 'ok', database: 'connected' }))
  .get('/users', async () => {
    const allUsers = await db.select().from(users);
    return allUsers;
  })
  .get('/prompts', async () => {
    const allPrompts = await db.select().from(prompts);
    return allPrompts;
  })
  .get('/duels', async () => {
    const allDuels = await db.select().from(duels);
    return allDuels;
  })
  .listen(3000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
