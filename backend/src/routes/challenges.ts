import { Elysia } from 'elysia';
import { db } from '../db';
import { challenges } from '../db/schema';
import { eq } from 'drizzle-orm';

export const challengeRoutes = new Elysia()
  // GET /challenges - returns all active challenges (without systemPrompt)
  .get('/challenges', async () => {
    const allChallenges = await db
      .select({
        id: challenges.id,
        name: challenges.name,
        shortName: challenges.shortName,
        difficulty: challenges.difficulty,
        description: challenges.description,
        longDescription: challenges.longDescription,
        videoUrl: challenges.videoUrl,
        active: challenges.active,
      })
      .from(challenges)
      .where(eq(challenges.active, true));

    return { success: true, challenges: allChallenges };
  })
  // GET /challenges/:id - returns single challenge including systemPrompt
  .get('/challenges/:id', async ({ params }) => {
    const id = parseInt(params.id);
    const [challenge] = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, id));

    if (!challenge) {
      return { success: false, error: 'Challenge not found' };
    }

    return { success: true, challenge };
  });
