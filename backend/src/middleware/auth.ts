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

export const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';

// TTL cache for token → user lookups (30-second expiry, max 1000 entries)
const AUTH_CACHE_TTL = 30_000;
const AUTH_CACHE_MAX = 1000;
const authCache = new Map<string, { user: any; expires: number }>();

function pruneAuthCache() {
  if (authCache.size <= AUTH_CACHE_MAX) return;
  const now = Date.now();
  for (const [key, entry] of authCache) {
    if (entry.expires < now || authCache.size > AUTH_CACHE_MAX) {
      authCache.delete(key);
    }
  }
}

// Helper function to get user from token (with TTL cache)
export async function getUserFromToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  // Check cache first
  const cached = authCache.get(token);
  if (cached && cached.expires > Date.now()) {
    return cached.user;
  }

  try {
    // Decode JWT manually (we'll verify in the plugin)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString()) as JwtPayload & { exp?: number };

    // Check expiry
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }

    // Verify session is still valid
    const [session] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
      .limit(1);

    if (!session) {
      authCache.set(token, { user: null, expires: Date.now() + AUTH_CACHE_TTL });
      return null;
    }

    // Get user
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        timezone: users.timezone,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    const result = user || null;

    // Cache the result
    authCache.set(token, { user: result, expires: Date.now() + AUTH_CACHE_TTL });
    pruneAuthCache();

    return result;
  } catch (error) {
    console.error('[Auth] Error in getUserFromToken:', error);
    return null;
  }
}

export const authPlugin = new Elysia({ name: 'auth' })
  .use(
    jwt({
      name: 'jwt',
      secret: JWT_SECRET,
      exp: '7d',
    })
  )
  .use(bearer());

export const requireAuth = new Elysia({ name: 'requireAuth' })
  .use(authPlugin)
  .resolve(async ({ bearer }) => {
    const user = await getUserFromToken(bearer);
    return { user };
  })
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, error: 'Unauthorized' };
    }
  });
