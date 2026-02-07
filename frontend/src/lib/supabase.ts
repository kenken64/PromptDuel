import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://eqdclyktdlkuqhkqigip.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ChatMessage {
  id: number;
  room_code: string;
  user_id: number;
  username: string;
  message: string;
  created_at: string;
}

export interface GameMessage {
  id: number;
  room_code: string;
  sender: string;
  text: string;
  message_type: 'player1' | 'player2' | 'judge' | 'system';
  created_at: string;
}
