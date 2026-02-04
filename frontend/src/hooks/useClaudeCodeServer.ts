import { useState, useEffect, useCallback, useRef } from 'react';

const CLAUDE_CODE_SERVER_URL = 'ws://localhost:3001';

interface SessionInfo {
  sessionId: string;
  workspace: string;
  playerName: string;
  challenge: number;
}

interface UseClaudeCodeServerProps {
  playerName: string;
  challenge: number;
  onOutput?: (data: string) => void;
  onSessionStarted?: (session: SessionInfo) => void;
  onExit?: (exitCode: number) => void;
  onError?: (error: string) => void;
}

interface UseClaudeCodeServerReturn {
  connect: () => void;
  disconnect: () => void;
  sendInput: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  isConnected: boolean;
  isConnecting: boolean;
  sessionInfo: SessionInfo | null;
  output: string[];
}

export function useClaudeCodeServer({
  playerName,
  challenge,
  onOutput,
  onSessionStarted,
  onExit,
  onError,
}: UseClaudeCodeServerProps): UseClaudeCodeServerReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [output, setOutput] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('Already connected');
      return;
    }

    setIsConnecting(true);
    setOutput([]);

    try {
      const ws = new WebSocket(CLAUDE_CODE_SERVER_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log(`WebSocket connected for ${playerName}`);
        setIsConnected(true);
        setIsConnecting(false);

        // Start session with player info
        ws.send(JSON.stringify({
          type: 'start-session',
          playerName,
          challenge,
          cols: 120,
          rows: 30,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'output') {
            setOutput((prev) => [...prev, msg.data]);
            onOutput?.(msg.data);
          } else if (msg.type === 'session-started') {
            const session: SessionInfo = {
              sessionId: msg.sessionId,
              workspace: msg.workspace,
              playerName: msg.playerName,
              challenge: msg.challenge,
            };
            setSessionInfo(session);
            onSessionStarted?.(session);
          } else if (msg.type === 'exit') {
            onExit?.(msg.exitCode);
          } else if (msg.type === 'error') {
            onError?.(msg.message);
          }
        } catch (e) {
          console.error('Error parsing message:', e);
        }
      };

      ws.onclose = () => {
        console.log(`WebSocket disconnected for ${playerName}`);
        setIsConnected(false);
        setIsConnecting(false);
        setSessionInfo(null);
        wsRef.current = null;
      };

      ws.onerror = (error) => {
        console.error(`WebSocket error for ${playerName}:`, error);
        setIsConnecting(false);
        onError?.('Connection error');
      };
    } catch (error) {
      console.error('Failed to connect:', error);
      setIsConnecting(false);
      onError?.('Failed to connect to server');
    }
  }, [playerName, challenge, onOutput, onSessionStarted, onExit, onError]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      // Send kill session message before closing
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'kill-session' }));
      }
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setSessionInfo(null);
  }, []);

  const sendInput = useCallback((data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'input', data }));
    }
  }, []);

  const resize = useCallback((cols: number, rows: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'resize', cols, rows }));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    sendInput,
    resize,
    isConnected,
    isConnecting,
    sessionInfo,
    output,
  };
}
