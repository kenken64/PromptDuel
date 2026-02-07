import { Elysia, t } from 'elysia';
import { db } from '../db';
import { rooms, roomSpectators, users, sessions } from '../db/schema';
import { eq, and, ne, lt } from 'drizzle-orm';
import { authPlugin, getUserFromToken } from '../middleware/auth';

// Generate a random 6-character room code
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars (0, O, I, 1)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Clean up stale rooms (where host has no valid session)
async function cleanupStaleRooms() {
  try {
    // Get all non-finished rooms
    const activeRooms = await db
      .select()
      .from(rooms)
      .where(ne(rooms.status, 'finished'));

    const now = new Date();

    for (const room of activeRooms) {
      // Check if host has a valid session
      const [validSession] = await db
        .select()
        .from(sessions)
        .where(and(eq(sessions.userId, room.hostId), lt(now, sessions.expiresAt)))
        .limit(1);

      if (!validSession) {
        // Host has no valid session, clean up room
        if (room.status === 'waiting') {
          // Delete waiting rooms
          await db.delete(roomSpectators).where(eq(roomSpectators.roomId, room.id));
          await db.delete(rooms).where(eq(rooms.id, room.id));
          console.log(`Cleaned up stale waiting room: ${room.code}`);
        } else if (room.status === 'playing') {
          // Mark playing rooms as finished
          await db.update(rooms).set({ status: 'finished' }).where(eq(rooms.id, room.id));
          console.log(`Marked stale playing room as finished: ${room.code}`);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up stale rooms:', error);
  }
}

export const roomRoutes = new Elysia({ prefix: '/rooms' })
  .use(authPlugin)
  // List available rooms (waiting and playing status - spectators can join playing games)
  .get('/', async ({ bearer, set }) => {
    const user = await getUserFromToken(bearer);
    if (!user) {
      set.status = 401;
      return { success: false, error: 'Unauthorized' };
    }

    // Clean up stale rooms before listing
    await cleanupStaleRooms();

    const availableRooms = await db
      .select({
        id: rooms.id,
        code: rooms.code,
        challenge: rooms.challenge,
        status: rooms.status,
        hostId: rooms.hostId,
        player1Id: rooms.player1Id,
        player2Id: rooms.player2Id,
        player1Ready: rooms.player1Ready,
        player2Ready: rooms.player2Ready,
        createdAt: rooms.createdAt,
      })
      .from(rooms)
      .where(ne(rooms.status, 'finished')); // Show waiting and playing rooms

    // Enrich with host username
    const enrichedRooms = await Promise.all(
      availableRooms.map(async (room) => {
        const [host] = await db
          .select({ username: users.username })
          .from(users)
          .where(eq(users.id, room.hostId))
          .limit(1);

        const [player1] = room.player1Id
          ? await db
              .select({ username: users.username })
              .from(users)
              .where(eq(users.id, room.player1Id))
              .limit(1)
          : [null];

        const [player2] = room.player2Id
          ? await db
              .select({ username: users.username })
              .from(users)
              .where(eq(users.id, room.player2Id))
              .limit(1)
          : [null];

        // Count spectators
        const spectators = await db
          .select()
          .from(roomSpectators)
          .where(eq(roomSpectators.roomId, room.id));

        return {
          ...room,
          hostUsername: host?.username,
          player1Username: player1?.username,
          player2Username: player2?.username,
          spectatorCount: spectators.length,
        };
      })
    );

    return { success: true, rooms: enrichedRooms };
  })
  // Create a new room
  .post(
    '/',
    async ({ body, bearer, set }) => {
      const user = await getUserFromToken(bearer);
      if (!user) {
        set.status = 401;
        return { success: false, error: 'Unauthorized' };
      }

      const { challenge } = body;

      // Generate unique room code
      let code = generateRoomCode();
      let attempts = 0;
      while (attempts < 10) {
        const [existing] = await db
          .select()
          .from(rooms)
          .where(eq(rooms.code, code))
          .limit(1);

        if (!existing) break;
        code = generateRoomCode();
        attempts++;
      }

      // Create room with host as player1
      const [newRoom] = await db
        .insert(rooms)
        .values({
          code,
          hostId: user.id,
          challenge,
          player1Id: user.id,
        })
        .returning();

      return {
        success: true,
        room: {
          ...newRoom,
          hostUsername: user.username,
          player1Username: user.username,
        },
      };
    },
    {
      body: t.Object({
        challenge: t.Number({ minimum: 1, maximum: 2 }),
      }),
    }
  )
  // Get room details
  .get('/:code', async ({ params, bearer, set }) => {
    const user = await getUserFromToken(bearer);
    if (!user) {
      set.status = 401;
      return { success: false, error: 'Unauthorized' };
    }

    const [room] = await db
      .select()
      .from(rooms)
      .where(eq(rooms.code, params.code))
      .limit(1);

    if (!room) {
      set.status = 404;
      return { success: false, error: 'Room not found' };
    }

    // Get player info
    const [host] = await db
      .select({ id: users.id, username: users.username })
      .from(users)
      .where(eq(users.id, room.hostId))
      .limit(1);

    const [player1] = room.player1Id
      ? await db
          .select({ id: users.id, username: users.username })
          .from(users)
          .where(eq(users.id, room.player1Id))
          .limit(1)
      : [null];

    const [player2] = room.player2Id
      ? await db
          .select({ id: users.id, username: users.username })
          .from(users)
          .where(eq(users.id, room.player2Id))
          .limit(1)
      : [null];

    // Get spectators
    const spectatorRows = await db
      .select({
        id: roomSpectators.id,
        joinedAt: roomSpectators.joinedAt,
        userId: users.id,
        username: users.username,
      })
      .from(roomSpectators)
      .innerJoin(users, eq(roomSpectators.userId, users.id))
      .where(eq(roomSpectators.roomId, room.id));

    return {
      success: true,
      room: {
        ...room,
        host,
        player1,
        player2,
        spectators: spectatorRows,
      },
    };
  })
  // Join room as player
  .post('/:code/join', async ({ params, bearer, set }) => {
    const user = await getUserFromToken(bearer);
    if (!user) {
      set.status = 401;
      return { success: false, error: 'Unauthorized' };
    }

    const [room] = await db
      .select()
      .from(rooms)
      .where(eq(rooms.code, params.code))
      .limit(1);

    if (!room) {
      set.status = 404;
      return { success: false, error: 'Room not found' };
    }

    if (room.status !== 'waiting') {
      set.status = 400;
      return { success: false, error: 'Room is not accepting players' };
    }

    // Check if user is already in the room
    if (room.player1Id === user.id || room.player2Id === user.id) {
      return { success: true, message: 'Already in room', role: 'player' };
    }

    // Check if room is full
    if (room.player1Id && room.player2Id) {
      set.status = 400;
      return { success: false, error: 'Room is full' };
    }

    // Join as player2 (player1 is always the host)
    await db
      .update(rooms)
      .set({ player2Id: user.id })
      .where(eq(rooms.id, room.id));

    // Remove from spectators if was spectating
    await db
      .delete(roomSpectators)
      .where(
        and(eq(roomSpectators.roomId, room.id), eq(roomSpectators.userId, user.id))
      );

    return { success: true, role: 'player' };
  })
  // Join room as spectator
  .post('/:code/spectate', async ({ params, bearer, set }) => {
    const user = await getUserFromToken(bearer);
    if (!user) {
      set.status = 401;
      return { success: false, error: 'Unauthorized' };
    }

    const [room] = await db
      .select()
      .from(rooms)
      .where(eq(rooms.code, params.code))
      .limit(1);

    if (!room) {
      set.status = 404;
      return { success: false, error: 'Room not found' };
    }

    // Check if user is already a player
    if (room.player1Id === user.id || room.player2Id === user.id) {
      set.status = 400;
      return { success: false, error: 'You are a player in this room' };
    }

    // Check if already spectating
    const [existing] = await db
      .select()
      .from(roomSpectators)
      .where(
        and(eq(roomSpectators.roomId, room.id), eq(roomSpectators.userId, user.id))
      )
      .limit(1);

    if (existing) {
      return { success: true, message: 'Already spectating' };
    }

    // Add as spectator
    await db.insert(roomSpectators).values({
      roomId: room.id,
      userId: user.id,
    });

    return { success: true, role: 'spectator' };
  })
  // Toggle ready status
  .post('/:code/ready', async ({ params, bearer, set }) => {
    const user = await getUserFromToken(bearer);
    if (!user) {
      set.status = 401;
      return { success: false, error: 'Unauthorized' };
    }

    const [room] = await db
      .select()
      .from(rooms)
      .where(eq(rooms.code, params.code))
      .limit(1);

    if (!room) {
      set.status = 404;
      return { success: false, error: 'Room not found' };
    }

    if (room.status !== 'waiting') {
      set.status = 400;
      return { success: false, error: 'Game already started' };
    }

    let updates: Partial<typeof rooms.$inferSelect> = {};

    if (room.player1Id === user.id) {
      updates = { player1Ready: !room.player1Ready };
    } else if (room.player2Id === user.id) {
      updates = { player2Ready: !room.player2Ready };
    } else {
      set.status = 403;
      return { success: false, error: 'You are not a player in this room' };
    }

    await db.update(rooms).set(updates).where(eq(rooms.id, room.id));

    const [updatedRoom] = await db
      .select()
      .from(rooms)
      .where(eq(rooms.id, room.id))
      .limit(1);

    // Get player details
    const [player1] = updatedRoom.player1Id
      ? await db
          .select({ id: users.id, username: users.username })
          .from(users)
          .where(eq(users.id, updatedRoom.player1Id))
          .limit(1)
      : [null];

    const [player2] = updatedRoom.player2Id
      ? await db
          .select({ id: users.id, username: users.username })
          .from(users)
          .where(eq(users.id, updatedRoom.player2Id))
          .limit(1)
      : [null];

    return {
      success: true,
      player1Ready: updatedRoom.player1Ready,
      player2Ready: updatedRoom.player2Ready,
      room: {
        id: updatedRoom.id,
        code: updatedRoom.code,
        challenge: updatedRoom.challenge,
        status: updatedRoom.status,
        hostId: updatedRoom.hostId,
        player1,
        player2,
        player1Ready: updatedRoom.player1Ready,
        player2Ready: updatedRoom.player2Ready,
      },
    };
  })
  // Start game (host only)
  .post('/:code/start', async ({ params, bearer, set }) => {
    const user = await getUserFromToken(bearer);
    if (!user) {
      set.status = 401;
      return { success: false, error: 'Unauthorized' };
    }

    const [room] = await db
      .select()
      .from(rooms)
      .where(eq(rooms.code, params.code))
      .limit(1);

    if (!room) {
      set.status = 404;
      return { success: false, error: 'Room not found' };
    }

    if (room.hostId !== user.id) {
      set.status = 403;
      return { success: false, error: 'Only the host can start the game' };
    }

    if (!room.player1Id || !room.player2Id) {
      set.status = 400;
      return { success: false, error: 'Need two players to start' };
    }

    if (!room.player1Ready || !room.player2Ready) {
      set.status = 400;
      return { success: false, error: 'Both players must be ready' };
    }

    await db
      .update(rooms)
      .set({ status: 'playing' })
      .where(eq(rooms.id, room.id));

    return { success: true, status: 'playing' };
  })
  // Leave room
  .post('/:code/leave', async ({ params, bearer, set }) => {
    const user = await getUserFromToken(bearer);
    if (!user) {
      set.status = 401;
      return { success: false, error: 'Unauthorized' };
    }

    const [room] = await db
      .select()
      .from(rooms)
      .where(eq(rooms.code, params.code))
      .limit(1);

    if (!room) {
      set.status = 404;
      return { success: false, error: 'Room not found' };
    }

    // Remove from spectators
    await db
      .delete(roomSpectators)
      .where(
        and(eq(roomSpectators.roomId, room.id), eq(roomSpectators.userId, user.id))
      );

    // If player, handle differently
    if (room.player1Id === user.id) {
      // Host/Player1 leaving
      if (room.status === 'waiting') {
        if (room.player2Id) {
          // Promote player2 to host
          await db
            .update(rooms)
            .set({
              hostId: room.player2Id,
              player1Id: room.player2Id,
              player2Id: null,
              player1Ready: room.player2Ready,
              player2Ready: false,
            })
            .where(eq(rooms.id, room.id));
        } else {
          // No player2, delete room
          await db.delete(roomSpectators).where(eq(roomSpectators.roomId, room.id));
          await db.delete(rooms).where(eq(rooms.id, room.id));
        }
      } else if (room.status === 'playing') {
        // Player leaves during game - mark as finished
        await db
          .update(rooms)
          .set({ status: 'finished' })
          .where(eq(rooms.id, room.id));
      }
    } else if (room.player2Id === user.id) {
      if (room.status === 'waiting') {
        await db
          .update(rooms)
          .set({ player2Id: null, player2Ready: false })
          .where(eq(rooms.id, room.id));
      } else if (room.status === 'playing') {
        // Player leaves during game - mark as finished
        await db
          .update(rooms)
          .set({ status: 'finished' })
          .where(eq(rooms.id, room.id));
      }
    }

    return { success: true };
  })
  // Delete room (host only)
  .delete('/:code', async ({ params, bearer, set }) => {
    const user = await getUserFromToken(bearer);
    if (!user) {
      set.status = 401;
      return { success: false, error: 'Unauthorized' };
    }

    const [room] = await db
      .select()
      .from(rooms)
      .where(eq(rooms.code, params.code))
      .limit(1);

    if (!room) {
      set.status = 404;
      return { success: false, error: 'Room not found' };
    }

    if (room.hostId !== user.id) {
      set.status = 403;
      return { success: false, error: 'Only the host can delete the room' };
    }

    // Delete spectators first
    await db.delete(roomSpectators).where(eq(roomSpectators.roomId, room.id));

    // Delete room
    await db.delete(rooms).where(eq(rooms.id, room.id));

    return { success: true };
  });
