// API configuration - uses environment variables for deployment flexibility
// In development, these default to localhost
// In production (Railway), set VITE_API_URL and VITE_WS_URL environment variables

export const config = {
  // Backend API URL (Elysia server)
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000',

  // Claude Code WebSocket server URL
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:3001',
};
