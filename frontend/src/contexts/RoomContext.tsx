import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { config } from '../config';
import { useAuth } from './AuthContext';

interface Player {
  id: number;
  username: string;
}

interface Spectator {
  id: number;
  username: string;
}

interface ChatMessage {
  id: number;
  userId: number;
  username: string;
  message: string;
  createdAt: Date;
}

interface Room {
  id: number;
  code: string;
  challenge: number;
  status: 'waiting' | 'playing' | 'finished';
  hostId: number;
  player1: Player | null;
  player2: Player | null;
  player1Ready: boolean;
  player2Ready: boolean;
  spectators: Spectator[];
}

interface RoomContextType {
  room: Room | null;
  role: 'player' | 'spectator' | null;
  chatMessages: ChatMessage[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  // Actions
  createRoom: (challenge: number) => Promise<{ success: boolean; code?: string; error?: string }>;
  joinRoom: (code: string) => Promise<{ success: boolean; error?: string }>;
  spectateRoom: (code: string) => Promise<{ success: boolean; error?: string }>;
  leaveRoom: () => Promise<void>;
  toggleReady: () => Promise<void>;
  startGame: () => Promise<{ success: boolean; error?: string }>;
  sendChatMessage: (message: string) => void;
  connectToRoom: (code: string) => void;
  disconnectFromRoom: () => void;
}

const RoomContext = createContext<RoomContextType | null>(null);

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [role, setRole] = useState<'player' | 'spectator' | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case 'auth-success':
          console.log('WebSocket authenticated');
          break;

        case 'room-state':
          setRoom({
            code: msg.room.code,
            id: 0, // Will be set from other sources
            challenge: msg.room.challenge,
            status: msg.room.status,
            hostId: 0,
            player1: msg.room.player1,
            player2: msg.room.player2,
            player1Ready: msg.room.player1Ready,
            player2Ready: msg.room.player2Ready,
            spectators: msg.room.spectators || [],
          });
          setRole(msg.role);
          break;

        case 'player-joined':
        case 'player-left':
        case 'player-disconnected':
          // Refresh room state
          break;

        case 'spectator-joined':
        case 'spectator-left':
          setRoom((prev) => {
            if (!prev) return prev;
            if (msg.type === 'spectator-joined') {
              return {
                ...prev,
                spectators: [
                  ...prev.spectators,
                  { id: msg.userId, username: msg.username },
                ],
              };
            } else {
              return {
                ...prev,
                spectators: prev.spectators.filter((s) => s.id !== msg.userId),
              };
            }
          });
          break;

        case 'ready-changed':
          setRoom((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              player1Ready: msg.player1Ready,
              player2Ready: msg.player2Ready,
            };
          });
          break;

        case 'chat-message':
          setChatMessages((prev) => [
            ...prev,
            {
              id: msg.id,
              userId: msg.userId,
              username: msg.username,
              message: msg.message,
              createdAt: new Date(msg.createdAt),
            },
          ]);
          break;

        case 'game-started':
          setRoom((prev) => {
            if (!prev) return prev;
            return { ...prev, status: 'playing' };
          });
          break;

        case 'game-ended':
          setRoom((prev) => {
            if (!prev) return prev;
            return { ...prev, status: 'finished' };
          });
          break;

        case 'error':
          setError(msg.error);
          break;
      }
    } catch (e) {
      console.error('Failed to parse WebSocket message:', e);
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    if (!token || wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(config.roomWsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Room WebSocket connected');
      setIsConnected(true);
      // Authenticate immediately
      ws.send(JSON.stringify({ type: 'auth', token }));
    };

    ws.onmessage = handleWebSocketMessage;

    ws.onclose = () => {
      console.log('Room WebSocket disconnected');
      setIsConnected(false);
      wsRef.current = null;

      // Attempt reconnect after 3 seconds
      reconnectTimeoutRef.current = window.setTimeout(() => {
        if (token && room) {
          connectWebSocket();
        }
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('Room WebSocket error:', error);
    };
  }, [token, handleWebSocketMessage, room]);

  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectWebSocket();
    };
  }, [disconnectWebSocket]);

  const createRoom = async (
    challenge: number
  ): Promise<{ success: boolean; code?: string; error?: string }> => {
    if (!token) return { success: false, error: 'Not authenticated' };

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${config.apiUrl}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ challenge }),
      });

      const data = await response.json();

      if (data.success) {
        return { success: true, code: data.room.code };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Create room error:', error);
      return { success: false, error: 'Network error' };
    } finally {
      setIsLoading(false);
    }
  };

  const joinRoom = async (code: string): Promise<{ success: boolean; error?: string }> => {
    if (!token) return { success: false, error: 'Not authenticated' };

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${config.apiUrl}/rooms/${code}/join`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Join room error:', error);
      return { success: false, error: 'Network error' };
    } finally {
      setIsLoading(false);
    }
  };

  const spectateRoom = async (code: string): Promise<{ success: boolean; error?: string }> => {
    if (!token) return { success: false, error: 'Not authenticated' };

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${config.apiUrl}/rooms/${code}/spectate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Spectate room error:', error);
      return { success: false, error: 'Network error' };
    } finally {
      setIsLoading(false);
    }
  };

  const leaveRoom = async () => {
    if (!token || !room) return;

    try {
      await fetch(`${config.apiUrl}/rooms/${room.code}/leave`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Leave room error:', error);
    }

    // Send leave message via WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'leave-room' }));
    }

    setRoom(null);
    setRole(null);
    setChatMessages([]);
    disconnectWebSocket();
  };

  const toggleReady = async () => {
    if (!token || !room) return;

    // Toggle via WebSocket for real-time update
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ready-toggle' }));
    }

    // Also update via REST for persistence
    try {
      await fetch(`${config.apiUrl}/rooms/${room.code}/ready`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Toggle ready error:', error);
    }
  };

  const startGame = async (): Promise<{ success: boolean; error?: string }> => {
    if (!token || !room) return { success: false, error: 'No room' };

    // Start via WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'game-start' }));
    }

    try {
      const response = await fetch(`${config.apiUrl}/rooms/${room.code}/start`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Start game error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const sendChatMessage = (message: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'chat-message',
          message,
        })
      );
    }
  };

  const connectToRoom = useCallback(
    (code: string) => {
      if (!token) return;

      // Connect WebSocket first
      connectWebSocket();

      // Then join room via WebSocket after a short delay to ensure auth
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'join-room', roomCode: code }));
        }
      }, 500);

      // Load chat history
      fetch(`${config.apiUrl}/chat/${code}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.messages) {
            setChatMessages(
              data.messages.map((m: any) => ({
                ...m,
                createdAt: new Date(m.createdAt),
              }))
            );
          }
        })
        .catch(console.error);
    },
    [token, connectWebSocket]
  );

  const disconnectFromRoom = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'leave-room' }));
    }
    setRoom(null);
    setRole(null);
    setChatMessages([]);
  }, []);

  return (
    <RoomContext.Provider
      value={{
        room,
        role,
        chatMessages,
        isConnected,
        isLoading,
        error,
        createRoom,
        joinRoom,
        spectateRoom,
        leaveRoom,
        toggleReady,
        startGame,
        sendChatMessage,
        connectToRoom,
        disconnectFromRoom,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom() {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
}
