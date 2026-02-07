import { Elysia, t } from 'elysia';
import { db } from '../db';
import { chatMessages, rooms, users, roomSpectators } from '../db/schema';
import { eq, and, or, desc } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';

export const chatRoutes = new Elysia({ prefix: '/chat' })
  .use(requireAuth)
  // Get room chat messages
  .get(
    '/:roomCode',
    async ({ params, user, set }) => {
      // Find room
      const [room] = await db
        .select()
        .from(rooms)
        .where(eq(rooms.code, params.roomCode))
        .limit(1);

      if (!room) {
        set.status = 404;
        return { success: false, error: 'Room not found' };
      }

      // Check if user is in the room (player or spectator)
      const isPlayer = room.player1Id === user.id || room.player2Id === user.id;
      const [isSpectator] = await db
        .select()
        .from(roomSpectators)
        .where(
          and(eq(roomSpectators.roomId, room.id), eq(roomSpectators.userId, user.id))
        )
        .limit(1);

      if (!isPlayer && !isSpectator) {
        set.status = 403;
        return { success: false, error: 'Not a member of this room' };
      }

      // Get messages with user info
      const messages = await db
        .select({
          id: chatMessages.id,
          message: chatMessages.message,
          createdAt: chatMessages.createdAt,
          userId: users.id,
          username: users.username,
        })
        .from(chatMessages)
        .innerJoin(users, eq(chatMessages.userId, users.id))
        .where(eq(chatMessages.roomId, room.id))
        .orderBy(desc(chatMessages.createdAt))
        .limit(100);

      return {
        success: true,
        messages: messages.reverse(), // Return oldest first
      };
    },
    {
      params: t.Object({
        roomCode: t.String(),
      }),
    }
  )
  // Send a chat message
  .post(
    '/:roomCode',
    async ({ params, body, user, set }) => {
      // Find room
      const [room] = await db
        .select()
        .from(rooms)
        .where(eq(rooms.code, params.roomCode))
        .limit(1);

      if (!room) {
        set.status = 404;
        return { success: false, error: 'Room not found' };
      }

      // Check if user is in the room (player or spectator)
      const isPlayer = room.player1Id === user.id || room.player2Id === user.id;
      const [isSpectator] = await db
        .select()
        .from(roomSpectators)
        .where(
          and(eq(roomSpectators.roomId, room.id), eq(roomSpectators.userId, user.id))
        )
        .limit(1);

      if (!isPlayer && !isSpectator) {
        set.status = 403;
        return { success: false, error: 'Not a member of this room' };
      }

      // Insert message
      const [newMessage] = await db
        .insert(chatMessages)
        .values({
          roomId: room.id,
          userId: user.id,
          message: body.message,
        })
        .returning();

      return {
        success: true,
        message: {
          id: newMessage.id,
          message: newMessage.message,
          createdAt: newMessage.createdAt,
          userId: user.id,
          username: user.username,
        },
      };
    },
    {
      params: t.Object({
        roomCode: t.String(),
      }),
      body: t.Object({
        message: t.String({ minLength: 1, maxLength: 500 }),
      }),
    }
  );
