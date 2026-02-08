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

      const { challenge, timerMinutes = 20 } = body;

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
          timerMinutes,
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
        timerMinutes: t.Optional(t.Number({ minimum: 20, maximum: 60 })),
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

    // Parse evaluation results from JSON
    let evaluationResults = null;
    if (room.evaluationResults) {
      try {
        evaluationResults = JSON.parse(room.evaluationResults);
      } catch (e) {
        console.error('Failed to parse evaluation results:', e);
      }
    }

    return {
      success: true,
      room: {
        ...room,
        host,
        player1,
        player2,
        spectators: spectatorRows,
        player1Provider: room.player1Provider,
        player1Model: room.player1Model,
        player2Provider: room.player2Provider,
        player2Model: room.player2Model,
        evaluationResults,
        player1Score: room.player1Score,
        player2Score: room.player2Score,
        player1PromptsUsed: room.player1PromptsUsed,
        player2PromptsUsed: room.player2PromptsUsed,
        player1Penalty: room.player1Penalty || 0,
        player2Penalty: room.player2Penalty || 0,
        winnerId: room.winnerId,
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
  // Finish room (mark as finished after game ends)
  .post('/:code/finish', async ({ params, bearer, set }) => {
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

    // Only players in the room can finish it
    if (room.player1Id !== user.id && room.player2Id !== user.id) {
      set.status = 403;
      return { success: false, error: 'Only players in the room can finish the game' };
    }

    // Update room status to finished
    await db
      .update(rooms)
      .set({ status: 'finished' })
      .where(eq(rooms.id, room.id));

    console.log(`Room ${room.code} marked as finished by user ${user.id}`);

    return { success: true };
  })
  // Update provider selection for a player
  .post(
    '/:code/provider',
    async ({ params, body, bearer, set }) => {
      const user = await getUserFromToken(bearer);
      if (!user) {
        set.status = 401;
        return { success: false, error: 'Unauthorized' };
      }

      const { provider, model } = body;

      // Validate provider
      const validProviders = ['anthropic', 'openai', 'google'];
      if (!validProviders.includes(provider)) {
        set.status = 400;
        return { success: false, error: `Invalid provider. Valid options: ${validProviders.join(', ')}` };
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
        return { success: false, error: 'Cannot change provider after game has started' };
      }

      // Determine which player is making the request
      let updates: Partial<typeof rooms.$inferSelect> = {};

      if (room.player1Id === user.id) {
        updates = {
          player1Provider: provider,
          player1Model: model,
        };
      } else if (room.player2Id === user.id) {
        updates = {
          player2Provider: provider,
          player2Model: model,
        };
      } else {
        set.status = 403;
        return { success: false, error: 'You are not a player in this room' };
      }

      await db.update(rooms).set(updates).where(eq(rooms.id, room.id));

      // Get updated room
      const [updatedRoom] = await db
        .select()
        .from(rooms)
        .where(eq(rooms.id, room.id))
        .limit(1);

      return {
        success: true,
        player1Provider: updatedRoom.player1Provider,
        player1Model: updatedRoom.player1Model,
        player2Provider: updatedRoom.player2Provider,
        player2Model: updatedRoom.player2Model,
      };
    },
    {
      body: t.Object({
        provider: t.String(),
        model: t.String(),
      }),
    }
  )
  // Update penalty score during game (called when duplicate prompts are detected)
  .post(
    '/:code/penalty',
    async ({ params, body, bearer, set }) => {
      const user = await getUserFromToken(bearer);
      if (!user) {
        set.status = 401;
        return { success: false, error: 'Unauthorized' };
      }

      const { playerNum, penalty } = body;

      const [room] = await db
        .select()
        .from(rooms)
        .where(eq(rooms.code, params.code))
        .limit(1);

      if (!room) {
        set.status = 404;
        return { success: false, error: 'Room not found' };
      }

      // Only players in the room can update penalties
      if (room.player1Id !== user.id && room.player2Id !== user.id) {
        set.status = 403;
        return { success: false, error: 'Only players in the room can update penalties' };
      }

      const updateData = playerNum === 1
        ? { player1Penalty: penalty }
        : { player2Penalty: penalty };

      await db.update(rooms).set(updateData).where(eq(rooms.id, room.id));

      console.log(`Room ${room.code} player${playerNum} penalty updated to ${penalty}`);

      return { success: true, penalty };
    },
    {
      body: t.Object({
        playerNum: t.Number(),
        penalty: t.Number(),
      }),
    }
  )
  // Save game results (evaluation, scores, winner)
  .post(
    '/:code/results',
    async ({ params, body, bearer, set }) => {
      const user = await getUserFromToken(bearer);
      if (!user) {
        set.status = 401;
        return { success: false, error: 'Unauthorized' };
      }

      const { evaluationResults, player1Score, player2Score, player1PromptsUsed, player2PromptsUsed, winnerId } = body;

      const [room] = await db
        .select()
        .from(rooms)
        .where(eq(rooms.code, params.code))
        .limit(1);

      if (!room) {
        set.status = 404;
        return { success: false, error: 'Room not found' };
      }

      // Only players in the room can save results
      if (room.player1Id !== user.id && room.player2Id !== user.id) {
        set.status = 403;
        return { success: false, error: 'Only players in the room can save results' };
      }

      // Save results
      await db.update(rooms).set({
        evaluationResults: evaluationResults ? JSON.stringify(evaluationResults) : null,
        player1Score,
        player2Score,
        player1PromptsUsed,
        player2PromptsUsed,
        winnerId,
      }).where(eq(rooms.id, room.id));

      console.log(`Room ${room.code} results saved by user ${user.id}`);

      return { success: true };
    },
    {
      body: t.Object({
        evaluationResults: t.Optional(t.Any()),
        player1Score: t.Optional(t.Number()),
        player2Score: t.Optional(t.Number()),
        player1PromptsUsed: t.Optional(t.Number()),
        player2PromptsUsed: t.Optional(t.Number()),
        winnerId: t.Optional(t.Nullable(t.Number())),
      }),
    }
  )
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
