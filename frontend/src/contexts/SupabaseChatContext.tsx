import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase, ChatMessage } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

interface SupabaseChatContextType {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (roomCode: string, message: string) => Promise<boolean>;
  subscribeToRoom: (roomCode: string) => void;
  unsubscribeFromRoom: () => void;
  clearMessages: () => void;
}

const SupabaseChatContext = createContext<SupabaseChatContextType | null>(null);

export function SupabaseChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const currentRoomRef = useRef<string | null>(null);

  // Load existing messages for a room
  const loadMessages = useCallback(async (roomCode: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_code', roomCode)
        .order('created_at', { ascending: true })
        .limit(100);

      if (fetchError) {
        console.error('Error loading messages:', fetchError);
        setError('Failed to load messages');
        return;
      }

      setMessages(data || []);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Subscribe to realtime updates for a room
  const subscribeToRoom = useCallback((roomCode: string) => {
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
      .channel(`chat:${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_code=eq.${roomCode}`,
        },
        (payload) => {
          console.log('New message received:', payload);
          const newMessage = payload.new as ChatMessage;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
        }
      )
      .subscribe((status) => {
        console.log('Supabase channel status:', status);
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to chat room: ${roomCode}`);
        }
      });

    channelRef.current = channel;
  }, [loadMessages]);

  // Unsubscribe from current room
  const unsubscribeFromRoom = useCallback(() => {
    if (channelRef.current) {
      console.log('Unsubscribing from chat room');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    currentRoomRef.current = null;
    setMessages([]);
  }, []);

  // Send a message
  const sendMessage = useCallback(async (roomCode: string, message: string): Promise<boolean> => {
    if (!user) {
      setError('You must be logged in to send messages');
      return false;
    }

    if (!message.trim()) {
      return false;
    }

    try {
      const { error: insertError } = await supabase
        .from('chat_messages')
        .insert({
          room_code: roomCode,
          user_id: user.id,
          username: user.username,
          message: message.trim().substring(0, 500),
        });

      if (insertError) {
        console.error('Error sending message:', insertError);
        setError('Failed to send message');
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
      return false;
    }
  }, [user]);

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
    <SupabaseChatContext.Provider
      value={{
        messages,
        isLoading,
        error,
        sendMessage,
        subscribeToRoom,
        unsubscribeFromRoom,
        clearMessages,
      }}
    >
      {children}
    </SupabaseChatContext.Provider>
  );
}

export function useSupabaseChat() {
  const context = useContext(SupabaseChatContext);
  if (!context) {
    throw new Error('useSupabaseChat must be used within a SupabaseChatProvider');
  }
  return context;
}
