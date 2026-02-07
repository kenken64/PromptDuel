-- Supabase Chat Messages Table
-- Run this in Supabase SQL Editor (SQL Editor > New Query)

-- Create the chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  room_code TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries by room_code
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_code ON chat_messages(room_code);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read messages (for simplicity)
CREATE POLICY "Anyone can read chat messages"
  ON chat_messages
  FOR SELECT
  USING (true);

-- Policy: Anyone can insert messages (we validate on client side)
CREATE POLICY "Anyone can insert chat messages"
  ON chat_messages
  FOR INSERT
  WITH CHECK (true);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
