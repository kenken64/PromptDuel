-- Supabase Game Messages Table
-- Run this in Supabase SQL Editor (SQL Editor > New Query)

-- Create the game_messages table
CREATE TABLE IF NOT EXISTS game_messages (
  id BIGSERIAL PRIMARY KEY,
  room_code TEXT NOT NULL,
  sender TEXT NOT NULL,
  text TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('player1', 'player2', 'judge', 'system')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries by room_code
CREATE INDEX IF NOT EXISTS idx_game_messages_room_code ON game_messages(room_code);
CREATE INDEX IF NOT EXISTS idx_game_messages_created_at ON game_messages(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE game_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read messages (for simplicity)
CREATE POLICY "Anyone can read game messages"
  ON game_messages
  FOR SELECT
  USING (true);

-- Policy: Anyone can insert messages (we validate on client side)
CREATE POLICY "Anyone can insert game messages"
  ON game_messages
  FOR INSERT
  WITH CHECK (true);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE game_messages;
