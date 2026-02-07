import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { db } from '../db';
import { users, rooms, roomSpectators, sessions, chatMessages } from '../db/schema';
import { eq, and, gt } from 'drizzle-orm';

interface Client {
  id: string;
  userId: number;
  username: string;
  roomCode: string | null;
  role: 'player' | 'spectator' | null;
  ws: any;
}

interface RoomState {
  code: string;
  players: Map<number, Client>;
  spectators: Map<number, Client>;
}

// Store connected clients and room states
const clients = new Map<string, Client>();
const roomStates = new Map<string, RoomState>();

// Cleanup stale connections every 5 minutes
setInterval(() => {
  let cleanedClients = 0;
  let cleanedRooms = 0;

  clients.forEach((client, clientId) => {
    if (client.ws.readyState !== 1) { // Not OPEN
      clients.delete(clientId);
      cleanedClients++;
    }
  });

  roomStates.forEach((room, roomCode) => {
    // Remove disconnected players/spectators from room
    room.players.forEach((client, userId) => {
      if (client.ws.readyState !== 1) {
        room.players.delete(userId);
      }
    });
    room.spectators.forEach((client, userId) => {
      if (client.ws.readyState !== 1) {
        room.spectators.delete(userId);
      }
    });

    // Remove empty rooms
    if (room.players.size === 0 && room.spectators.size === 0) {
      roomStates.delete(roomCode);
      cleanedRooms++;
    }
  });

  if (cleanedClients > 0 || cleanedRooms > 0) {
    console.log(`Cleanup: removed ${cleanedClients} stale clients, ${cleanedRooms} empty rooms`);
  }
}, 5 * 60 * 1000);

// Helper to broadcast to all room members
function broadcastToRoom(roomCode: string, message: object, excludeClientId?: string) {
  const room = roomStates.get(roomCode);
  if (!room) {
    console.log(`broadcastToRoom: No room state for ${roomCode}`);
    return;
  }

  const data = JSON.stringify(message);
  let sentCount = 0;

  room.players.forEach((client) => {
    if (client.id !== excludeClientId && client.ws.readyState === 1) {
      client.ws.send(data);
      sentCount++;
      console.log(`Broadcast to player ${client.username} (${client.id})`);
    }
  });

  room.spectators.forEach((client) => {
    if (client.id !== excludeClientId && client.ws.readyState === 1) {
      client.ws.send(data);
      sentCount++;
      console.log(`Broadcast to spectator ${client.username} (${client.id})`);
    }
  });

  console.log(`broadcastToRoom: Sent to ${sentCount} clients in ${roomCode}, message type: ${(message as any).type}`);
}

// Helper to broadcast only to spectators
function broadcastToSpectators(roomCode: string, message: object) {
  const room = roomStates.get(roomCode);
  if (!room) return;

  const data = JSON.stringify(message);
  room.spectators.forEach((client) => {
    if (client.ws.readyState === 1) {
      client.ws.send(data);
    }
  });
}

export const roomWebSocket = new Elysia({ prefix: '/ws' })
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'your-super-secret-key-change-in-production',
    })
  )
  .ws('/room', {
    body: t.Object({
      type: t.String(),
      token: t.Optional(t.String()),
      roomCode: t.Optional(t.String()),
      message: t.Optional(t.String()),
      data: t.Optional(t.Any()),
    }),
    open(ws) {
      const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      (ws as any).clientId = clientId;
      console.log(`WebSocket client connected: ${clientId}`);
    },
    async message(ws, msg) {
      const clientId = (ws as any).clientId;

      try {
        switch (msg.type) {
          case 'auth': {
            console.log(`Auth attempt from ${clientId}`);
            // Authenticate the connection
            if (!msg.token) {
              console.log(`Auth failed: No token provided`);
              ws.send(JSON.stringify({ type: 'error', error: 'Token required' }));
              return;
            }

            const payload = await (this as any).jwt.verify(msg.token);
            if (!payload) {
              console.log(`Auth failed: Invalid token`);
              ws.send(JSON.stringify({ type: 'error', error: 'Invalid token' }));
              return;
            }
            console.log(`Auth token verified for userId: ${payload.userId}`);

            // Verify session
            const [session] = await db
              .select()
              .from(sessions)
              .where(and(eq(sessions.token, msg.token), gt(sessions.expiresAt, new Date())))
              .limit(1);

            if (!session) {
              ws.send(JSON.stringify({ type: 'error', error: 'Session expired' }));
              return;
            }

            // Get user
            const [user] = await db
              .select({ id: users.id, username: users.username })
              .from(users)
              .where(eq(users.id, payload.userId))
              .limit(1);

            if (!user) {
              ws.send(JSON.stringify({ type: 'error', error: 'User not found' }));
              return;
            }

            // Store client info
            clients.set(clientId, {
              id: clientId,
              userId: user.id,
              username: user.username,
              roomCode: null,
              role: null,
              ws,
            });

            ws.send(
              JSON.stringify({
                type: 'auth-success',
                userId: user.id,
                username: user.username,
              })
            );
            console.log(`Auth success: ${user.username} (${user.id}) - clientId: ${clientId}`);
            break;
          }

          case 'join-room': {
            console.log(`Join-room request from clientId: ${clientId}, roomCode: ${msg.roomCode}`);
            const client = clients.get(clientId);
            if (!client) {
              ws.send(JSON.stringify({ type: 'error', error: 'Not authenticated' }));
              return;
            }

            const roomCode = msg.roomCode;
            if (!roomCode) {
              ws.send(JSON.stringify({ type: 'error', error: 'Room code required' }));
              return;
            }

            // Get room from DB
            const [room] = await db
              .select()
              .from(rooms)
              .where(eq(rooms.code, roomCode))
              .limit(1);

            if (!room) {
              ws.send(JSON.stringify({ type: 'error', error: 'Room not found' }));
              return;
            }

            // Determine role
            const isPlayer = room.player1Id === client.userId || room.player2Id === client.userId;
            const [isSpectator] = await db
              .select()
              .from(roomSpectators)
              .where(
                and(
                  eq(roomSpectators.roomId, room.id),
                  eq(roomSpectators.userId, client.userId)
                )
              )
              .limit(1);

            if (!isPlayer && !isSpectator) {
              ws.send(JSON.stringify({ type: 'error', error: 'Not a member of this room' }));
              return;
            }

            client.roomCode = roomCode;
            client.role = isPlayer ? 'player' : 'spectator';

            // Initialize room state if needed
            if (!roomStates.has(roomCode)) {
              roomStates.set(roomCode, {
                code: roomCode,
                players: new Map(),
                spectators: new Map(),
              });
            }

            const roomState = roomStates.get(roomCode)!;
            if (isPlayer) {
              roomState.players.set(client.userId, client);
              console.log(`Player ${client.username} (${client.userId}) joined room ${roomCode}. Total players: ${roomState.players.size}`);
            } else {
              roomState.spectators.set(client.userId, client);
              console.log(`Spectator ${client.username} (${client.userId}) joined room ${roomCode}. Total spectators: ${roomState.spectators.size}`);
            }

            // Send room state to the joining client (moved before broadcast so we can include full state)
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

            const spectatorRows = await db
              .select({
                id: users.id,
                username: users.username,
              })
              .from(roomSpectators)
              .innerJoin(users, eq(roomSpectators.userId, users.id))
              .where(eq(roomSpectators.roomId, room.id));

            ws.send(
              JSON.stringify({
                type: 'room-state',
                room: {
                  code: room.code,
                  challenge: room.challenge,
                  status: room.status,
                  player1,
                  player2,
                  player1Ready: room.player1Ready,
                  player2Ready: room.player2Ready,
                  spectators: spectatorRows,
                },
                role: client.role,
              })
            );

            // Broadcast player/spectator joined with full room state to others
            broadcastToRoom(roomCode, {
              type: isPlayer ? 'player-joined' : 'spectator-joined',
              userId: client.userId,
              username: client.username,
              room: {
                code: room.code,
                challenge: room.challenge,
                status: room.status,
                player1,
                player2,
                player1Ready: room.player1Ready,
                player2Ready: room.player2Ready,
                spectators: spectatorRows,
              },
            }, clientId);
            break;
          }

          case 'leave-room': {
            const client = clients.get(clientId);
            if (!client || !client.roomCode) return;

            const roomCode = client.roomCode;
            const roomState = roomStates.get(roomCode);

            if (roomState) {
              if (client.role === 'player') {
                roomState.players.delete(client.userId);
              } else {
                roomState.spectators.delete(client.userId);
              }

              // Notify room
              broadcastToRoom(roomCode, {
                type: client.role === 'player' ? 'player-left' : 'spectator-left',
                userId: client.userId,
                username: client.username,
              });

              // Clean up empty room state
              if (roomState.players.size === 0 && roomState.spectators.size === 0) {
                roomStates.delete(roomCode);
              }
            }

            client.roomCode = null;
            client.role = null;
            break;
          }

          case 'ready-toggle': {
            const client = clients.get(clientId);
            if (!client || !client.roomCode || client.role !== 'player') {
              ws.send(JSON.stringify({ type: 'error', error: 'Not a player in a room' }));
              return;
            }

            // Get current room state from DB
            const [room] = await db
              .select()
              .from(rooms)
              .where(eq(rooms.code, client.roomCode))
              .limit(1);

            if (!room) return;

            let newReady: boolean;
            if (room.player1Id === client.userId) {
              newReady = !room.player1Ready;
              await db
                .update(rooms)
                .set({ player1Ready: newReady })
                .where(eq(rooms.id, room.id));
            } else if (room.player2Id === client.userId) {
              newReady = !room.player2Ready;
              await db
                .update(rooms)
                .set({ player2Ready: newReady })
                .where(eq(rooms.id, room.id));
            } else {
              return;
            }

            // Broadcast ready state change
            broadcastToRoom(client.roomCode, {
              type: 'ready-changed',
              userId: client.userId,
              isReady: newReady,
              player1Ready: room.player1Id === client.userId ? newReady : room.player1Ready,
              player2Ready: room.player2Id === client.userId ? newReady : room.player2Ready,
            });
            break;
          }

          case 'chat-message': {
            const client = clients.get(clientId);
            console.log(`Chat message from ${client?.username} in room ${client?.roomCode}: ${msg.message}`);

            if (!client || !client.roomCode) {
              console.log('Chat rejected: client not in a room');
              ws.send(JSON.stringify({ type: 'error', error: 'Not in a room' }));
              return;
            }

            if (!msg.message || msg.message.trim().length === 0) return;

            // Get room
            const [room] = await db
              .select()
              .from(rooms)
              .where(eq(rooms.code, client.roomCode))
              .limit(1);

            if (!room) return;

            // Save message to DB
            const [newMessage] = await db
              .insert(chatMessages)
              .values({
                roomId: room.id,
                userId: client.userId,
                message: msg.message.trim().substring(0, 500),
              })
              .returning();

            // Broadcast to room
            broadcastToRoom(client.roomCode, {
              type: 'chat-message',
              id: newMessage.id,
              userId: client.userId,
              username: client.username,
              message: newMessage.message,
              createdAt: newMessage.createdAt,
            });
            break;
          }

          case 'game-start': {
            const client = clients.get(clientId);
            if (!client || !client.roomCode || client.role !== 'player') return;

            const [room] = await db
              .select()
              .from(rooms)
              .where(eq(rooms.code, client.roomCode))
              .limit(1);

            if (!room || room.hostId !== client.userId) {
              ws.send(JSON.stringify({ type: 'error', error: 'Only host can start' }));
              return;
            }

            if (!room.player1Ready || !room.player2Ready) {
              ws.send(JSON.stringify({ type: 'error', error: 'Both players must be ready' }));
              return;
            }

            // Update room status
            await db.update(rooms).set({ status: 'playing' }).where(eq(rooms.id, room.id));

            // Broadcast game start
            broadcastToRoom(client.roomCode, {
              type: 'game-started',
              roomCode: client.roomCode,
              challenge: room.challenge,
            });
            break;
          }

          case 'game-state': {
            // Forward game state updates to spectators and players
            const client = clients.get(clientId);
            if (!client || !client.roomCode) return;

            broadcastToRoom(
              client.roomCode,
              {
                type: 'game-state-update',
                data: msg.data,
              },
              clientId
            );
            break;
          }

          case 'terminal-output': {
            // Forward terminal output to spectators
            const client = clients.get(clientId);
            if (!client || !client.roomCode || client.role !== 'player') return;

            broadcastToSpectators(client.roomCode, {
              type: 'terminal-output',
              playerId: client.userId,
              playerUsername: client.username,
              data: msg.data,
            });
            break;
          }

          case 'ping': {
            // Respond to heartbeat
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            break;
          }

          case 'game-end': {
            const client = clients.get(clientId);
            if (!client || !client.roomCode) return;

            const [room] = await db
              .select()
              .from(rooms)
              .where(eq(rooms.code, client.roomCode))
              .limit(1);

            if (room) {
              await db
                .update(rooms)
                .set({ status: 'finished' })
                .where(eq(rooms.id, room.id));
            }

            broadcastToRoom(client.roomCode, {
              type: 'game-ended',
              data: msg.data,
            });
            break;
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', error: 'Internal error' }));
      }
    },
    close(ws) {
      const clientId = (ws as any).clientId;
      const client = clients.get(clientId);

      if (client) {
        // Leave room if in one
        if (client.roomCode) {
          const roomState = roomStates.get(client.roomCode);
          if (roomState) {
            if (client.role === 'player') {
              roomState.players.delete(client.userId);
            } else {
              roomState.spectators.delete(client.userId);
            }

            broadcastToRoom(client.roomCode, {
              type: client.role === 'player' ? 'player-disconnected' : 'spectator-left',
              userId: client.userId,
              username: client.username,
            });

            if (roomState.players.size === 0 && roomState.spectators.size === 0) {
              roomStates.delete(client.roomCode);
            }
          }
        }

        clients.delete(clientId);
      }

      console.log(`WebSocket client disconnected: ${clientId}`);
    },
  });
