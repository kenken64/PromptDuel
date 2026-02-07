import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { bearer } from '@elysiajs/bearer';
import { db } from '../db';
import { users, sessions } from '../db/schema';
import { eq, and, gt } from 'drizzle-orm';

export interface JwtPayload {
  userId: number;
  username: string;
}

export const authPlugin = new Elysia({ name: 'auth' })
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'your-super-secret-key-change-in-production',
      exp: '7d',
    })
  )
  .use(bearer())
  .derive(async ({ jwt, bearer, set }) => {
    const getUser = async () => {
      if (!bearer) {
        return null;
      }

      try {
        const payload = await jwt.verify(bearer) as JwtPayload | false;
        if (!payload) {
          return null;
        }

        // Verify session is still valid
        const [session] = await db
          .select()
          .from(sessions)
          .where(
            and(
              eq(sessions.token, bearer),
              gt(sessions.expiresAt, new Date())
            )
          )
          .limit(1);

        if (!session) {
          return null;
        }

        // Get user
        const [user] = await db
          .select({
            id: users.id,
            username: users.username,
            email: users.email,
            createdAt: users.createdAt,
          })
          .from(users)
          .where(eq(users.id, payload.userId))
          .limit(1);

        return user || null;
      } catch {
        return null;
      }
    };

    return { getUser };
  });

export const requireAuth = new Elysia({ name: 'requireAuth' })
  .use(authPlugin)
  .derive(async ({ getUser, set }) => {
    const user = await getUser();
    if (!user) {
      set.status = 401;
      throw new Error('Unauthorized');
    }
    return { user };
  });
