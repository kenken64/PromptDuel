import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { supabase, GameMessage } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Message {
  sender: string;
  text: string;
  timestamp: number;
  type: 'player1' | 'player2' | 'judge' | 'system';
}

interface SupabaseGameContextType {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendGameMessage: (roomCode: string, sender: string, text: string, type: 'player1' | 'player2' | 'judge' | 'system') => Promise<boolean>;
  subscribeToGame: (roomCode: string) => void;
  unsubscribeFromGame: () => void;
  clearMessages: () => void;
}

const SupabaseGameContext = createContext<SupabaseGameContextType | null>(null);

export function SupabaseGameProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const currentRoomRef = useRef<string | null>(null);

  // Convert Supabase message to local format
  const convertMessage = (msg: GameMessage): Message => ({
    sender: msg.sender,
    text: msg.text,
    timestamp: new Date(msg.created_at).getTime(),
    type: msg.message_type,
  });

  // Load existing messages for a game room
  const loadMessages = useCallback(async (roomCode: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('game_messages')
        .select('*')
        .eq('room_code', roomCode)
        .order('created_at', { ascending: true })
        .limit(200);

      if (fetchError) {
        console.error('Error loading game messages:', fetchError);
        setError('Failed to load game messages');
        return;
      }

      setMessages((data || []).map(convertMessage));
    } catch (err) {
      console.error('Error loading game messages:', err);
      setError('Failed to load game messages');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Subscribe to realtime updates for a game room
  const subscribeToGame = useCallback((roomCode: string) => {
    // Unsubscribe from previous room if any
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    currentRoomRef.current = roomCode;

    // Load existing messages
    loadMessages(roomCode);

    // Subscribe to new messages
    const channel = supabase
      .channel(`game:${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_messages',
          filter: `room_code=eq.${roomCode}`,
        },
        (payload) => {
          console.log('New game message received:', payload);
          const newMessage = convertMessage(payload.new as GameMessage);
          setMessages((prev) => {
            // Avoid duplicates by checking timestamp and sender
            if (prev.some((m) => m.timestamp === newMessage.timestamp && m.sender === newMessage.sender && m.text === newMessage.text)) {
              return prev;
            }
            return [...prev, newMessage];
          });
        }
      )
      .subscribe((status) => {
        console.log('Supabase game channel status:', status);
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to game room: ${roomCode}`);
        }
      });

    channelRef.current = channel;
  }, [loadMessages]);

  // Unsubscribe from current room
  const unsubscribeFromGame = useCallback(() => {
    if (channelRef.current) {
      console.log('Unsubscribing from game room');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    currentRoomRef.current = null;
    setMessages([]);
  }, []);

  // Send a game message
  const sendGameMessage = useCallback(async (
    roomCode: string,
    sender: string,
    text: string,
    type: 'player1' | 'player2' | 'judge' | 'system'
  ): Promise<boolean> => {
    if (!text.trim()) {
      return false;
    }

    try {
      const { error: insertError } = await supabase
        .from('game_messages')
        .insert({
          room_code: roomCode,
          sender,
          text: text.trim().substring(0, 2000),
          message_type: type,
        });

      if (insertError) {
        console.error('Error sending game message:', insertError);
        setError('Failed to send game message');
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error sending game message:', err);
      setError('Failed to send game message');
      return false;
    }
  }, []);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return (
    <SupabaseGameContext.Provider
      value={{
        messages,
        isLoading,
        error,
        sendGameMessage,
        subscribeToGame,
        unsubscribeFromGame,
        clearMessages,
      }}
    >
      {children}
    </SupabaseGameContext.Provider>
  );
}

export function useSupabaseGame() {
  const context = useContext(SupabaseGameContext);
  if (!context) {
    throw new Error('useSupabaseGame must be used within a SupabaseGameProvider');
  }
  return context;
}
