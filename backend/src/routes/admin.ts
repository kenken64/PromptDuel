import { Elysia, t } from 'elysia';
import { db } from '../db';
import { users, challenges, rooms } from '../db/schema';
import { eq, count } from 'drizzle-orm';

function checkAdminPassword(password: string | null): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  return password === adminPassword;
}

export const adminRoutes = new Elysia({ prefix: '/admin' })
  // POST /admin/validate — login gate (no header check needed)
  .post(
    '/validate',
    async ({ body, set }) => {
      const { password } = body;
      if (!checkAdminPassword(password)) {
        set.status = 401;
        return { success: false, error: 'Invalid admin password' };
      }
      return { success: true };
    },
    {
      body: t.Object({
        password: t.String(),
      }),
    }
  )
  // GET /admin/stats
  .get('/stats', async ({ headers, set }) => {
    if (!checkAdminPassword(headers['x-admin-password'] ?? null)) {
      set.status = 401;
      return { success: false, error: 'Unauthorized' };
    }

    const [userResult] = await db.select({ value: count() }).from(users);
    const [challengeResult] = await db.select({ value: count() }).from(challenges);
    const [roomResult] = await db
      .select({ value: count() })
      .from(rooms)
      .where(eq(rooms.status, 'waiting'));

    return {
      success: true,
      userCount: userResult.value,
      challengeCount: challengeResult.value,
      roomCount: roomResult.value,
    };
  })
  // GET /admin/challenges — all challenges including systemPrompt and inactive
  .get('/challenges', async ({ headers, set }) => {
    if (!checkAdminPassword(headers['x-admin-password'] ?? null)) {
      set.status = 401;
      return { success: false, error: 'Unauthorized' };
    }

    const allChallenges = await db.select().from(challenges);
    return { success: true, challenges: allChallenges };
  })
  // POST /admin/challenges — create new challenge
  .post(
    '/challenges',
    async ({ headers, body, set }) => {
      if (!checkAdminPassword(headers['x-admin-password'] ?? null)) {
        set.status = 401;
        return { success: false, error: 'Unauthorized' };
      }

      try {
        const [created] = await db
          .insert(challenges)
          .values({
            name: body.name,
            shortName: body.shortName,
            difficulty: body.difficulty,
            description: body.description,
            longDescription: body.longDescription,
            videoUrl: body.videoUrl,
            systemPrompt: body.systemPrompt,
            active: body.active ?? true,
          })
          .returning();

        return { success: true, challenge: created };
      } catch (error) {
        console.error('Failed to create challenge:', error);
        set.status = 500;
        return { success: false, error: 'Failed to create challenge' };
      }
    },
    {
      body: t.Object({
        name: t.String(),
        shortName: t.String(),
        difficulty: t.String(),
        description: t.String(),
        longDescription: t.String(),
        videoUrl: t.String(),
        systemPrompt: t.String(),
        active: t.Optional(t.Boolean()),
      }),
    }
  )
  // PUT /admin/challenges/:id — update challenge
  .put(
    '/challenges/:id',
    async ({ headers, params, body, set }) => {
      if (!checkAdminPassword(headers['x-admin-password'] ?? null)) {
        set.status = 401;
        return { success: false, error: 'Unauthorized' };
      }

      const id = parseInt(params.id);

      try {
        const updateData: Record<string, unknown> = {};
        if (body.name !== undefined) updateData.name = body.name;
        if (body.shortName !== undefined) updateData.shortName = body.shortName;
        if (body.difficulty !== undefined) updateData.difficulty = body.difficulty;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.longDescription !== undefined) updateData.longDescription = body.longDescription;
        if (body.videoUrl !== undefined) updateData.videoUrl = body.videoUrl;
        if (body.systemPrompt !== undefined) updateData.systemPrompt = body.systemPrompt;
        if (body.active !== undefined) updateData.active = body.active;

        const [updated] = await db
          .update(challenges)
          .set(updateData)
          .where(eq(challenges.id, id))
          .returning();

        if (!updated) {
          set.status = 404;
          return { success: false, error: 'Challenge not found' };
        }

        return { success: true, challenge: updated };
      } catch (error) {
        console.error('Failed to update challenge:', error);
        set.status = 500;
        return { success: false, error: 'Failed to update challenge' };
      }
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        shortName: t.Optional(t.String()),
        difficulty: t.Optional(t.String()),
        description: t.Optional(t.String()),
        longDescription: t.Optional(t.String()),
        videoUrl: t.Optional(t.String()),
        systemPrompt: t.Optional(t.String()),
        active: t.Optional(t.Boolean()),
      }),
    }
  )
  // DELETE /admin/challenges/:id
  .delete('/challenges/:id', async ({ headers, params, set }) => {
    if (!checkAdminPassword(headers['x-admin-password'] ?? null)) {
      set.status = 401;
      return { success: false, error: 'Unauthorized' };
    }

    const id = parseInt(params.id);

    try {
      const [deleted] = await db
        .delete(challenges)
        .where(eq(challenges.id, id))
        .returning();

      if (!deleted) {
        set.status = 404;
        return { success: false, error: 'Challenge not found' };
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to delete challenge:', error);
      set.status = 500;
      return { success: false, error: 'Failed to delete challenge' };
    }
  });
