import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { users, sessions } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authPlugin, requireAuth } from '../middleware/auth';

const SALT_ROUNDS = 10;

export const authRoutes = new Elysia({ prefix: '/auth' })
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'your-super-secret-key-change-in-production',
      exp: '7d',
    })
  )
  .use(authPlugin)
  .post(
    '/register',
    async ({ body, jwt, set }) => {
      const { username, email, password } = body;

      try {
        // Check if user already exists
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (existingUser) {
          set.status = 400;
          return { success: false, error: 'Username already taken' };
        }

        const [existingEmail] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (existingEmail) {
          set.status = 400;
          return { success: false, error: 'Email already registered' };
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Create user
        const [newUser] = await db
          .insert(users)
          .values({
            username,
            email,
            passwordHash,
          })
          .returning();

        // Generate JWT token
        const token = await jwt.sign({
          userId: newUser.id,
          username: newUser.username,
        });

        // Calculate expiry (7 days from now)
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        // Create session
        await db.insert(sessions).values({
          userId: newUser.id,
          token,
          expiresAt,
        });

        return {
          success: true,
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
          },
          token,
        };
      } catch (error) {
        console.error('Registration error:', error);
        set.status = 500;
        return { success: false, error: 'Registration failed' };
      }
    },
    {
      body: t.Object({
        username: t.String({ minLength: 3, maxLength: 20 }),
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 6 }),
      }),
    }
  )
  .post(
    '/login',
    async ({ body, jwt, set }) => {
      const { username, password } = body;

      try {
        // Find user by username
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          set.status = 401;
          return { success: false, error: 'Invalid username or password' };
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
          set.status = 401;
          return { success: false, error: 'Invalid username or password' };
        }

        // Generate JWT token
        const token = await jwt.sign({
          userId: user.id,
          username: user.username,
        });

        // Calculate expiry (7 days from now)
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        // Create session
        await db.insert(sessions).values({
          userId: user.id,
          token,
          expiresAt,
        });

        // Update last login
        await db
          .update(users)
          .set({ lastLoginAt: new Date() })
          .where(eq(users.id, user.id));

        return {
          success: true,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
          token,
        };
      } catch (error) {
        console.error('Login error:', error);
        set.status = 500;
        return { success: false, error: 'Login failed' };
      }
    },
    {
      body: t.Object({
        username: t.String(),
        password: t.String(),
      }),
    }
  )
  .post('/logout', async ({ bearer, set }) => {
    if (!bearer) {
      set.status = 401;
      return { success: false, error: 'Not authenticated' };
    }

    try {
      // Delete session
      await db.delete(sessions).where(eq(sessions.token, bearer));
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      set.status = 500;
      return { success: false, error: 'Logout failed' };
    }
  })
  .get('/me', async ({ getUser, set }) => {
    const user = await getUser();
    if (!user) {
      set.status = 401;
      return { success: false, error: 'Not authenticated' };
    }

    return {
      success: true,
      user,
    };
  });
