import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRoom } from '../contexts/RoomContext';
import { useSupabaseGame } from '../contexts/SupabaseGameContext';
import { config } from '../config';
import { Timer } from '../components/Timer';
import { CombinedChat } from '../components/CombinedChat';
import { getFinalScore, getMultiplier } from '../gameRules';

interface PlayerState {
  name: string;
  score: number;
  promptsUsed: number;
  hasEnded: boolean;
}

interface Message {
  sender: string;
  text: string;
  timestamp: number;
  type: 'player1' | 'player2' | 'judge' | 'system';
}

export function SpectatorView() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { room, leaveRoom, connectToRoom, disconnectFromRoom } = useRoom();
  const { messages: supabaseMessages, subscribeToGame, unsubscribeFromGame } = useSupabaseGame();

  const [player1, setPlayer1] = useState<PlayerState>({
    name: 'Player 1',
    score: 0,
    promptsUsed: 0,
    hasEnded: false,
  });
  const [player2, setPlayer2] = useState<PlayerState>({
    name: 'Player 2',
    score: 0,
    promptsUsed: 0,
    hasEnded: false,
  });

  const [currentTurn, setCurrentTurn] = useState<'player1' | 'player2'>('player1');
  const [timeLeft, setTimeLeft] = useState(20 * 60);
  const [isActive, setIsActive] = useState(false);
  const [player1Console, setPlayer1Console] = useState<string[]>([]);
  const [player2Console, setPlayer2Console] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'player1' | 'player2'>('player1');
  const [isFinished, setIsFinished] = useState(false);

  const [isLoadingRoom, setIsLoadingRoom] = useState(true);

  const consoleRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const claudeWsRef = useRef<WebSocket | null>(null);
  const processedMessageIdsRef = useRef<Set<string>>(new Set());
  const gameStartTimeRef = useRef<number>(0);
  const gameTotalSecondsRef = useRef<number>(20 * 60);

  // Fetch room details first to get player names
  useEffect(() => {
    if (!code || !token) return;

    const fetchRoom = async () => {
      try {
        const response = await fetch(`${config.apiUrl}/rooms/${code}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        if (data.success && data.room) {
          if (data.room.player1) {
            setPlayer1((prev) => ({ ...prev, name: data.room.player1.username }));
          }
          if (data.room.player2) {
            setPlayer2((prev) => ({ ...prev, name: data.room.player2.username }));
          }
          // Check if game is active
          if (data.room.status === 'playing') {
            setIsActive(true);
          }
        }
      } catch (error) {
        console.error('Failed to fetch room:', error);
      } finally {
        setIsLoadingRoom(false);
      }
    };

    fetchRoom();
  }, [code, token]);

  // Subscribe to Supabase game messages for real-time updates
  useEffect(() => {
    if (code && !isLoadingRoom) {
      console.log('[Spectator] Subscribing to Supabase game messages for room:', code);
      subscribeToGame(code);
    }

    return () => {
      unsubscribeFromGame();
    };
  }, [code, isLoadingRoom, subscribeToGame, unsubscribeFromGame]);

  // Process Supabase messages to sync game state (scores, turns, game end)
  useEffect(() => {
    if (supabaseMessages.length === 0) return;

    for (const message of supabaseMessages) {
      // Create a unique ID for each message
      const messageId = `${message.timestamp}-${message.sender}-${message.text.substring(0, 50)}`;

      // Skip if already processed
      if (processedMessageIdsRef.current.has(messageId)) {
        continue;
      }

      // Mark as processed
      processedMessageIdsRef.current.add(messageId);
      console.log('[Spectator Supabase] Processing message:', message);

      // Process system messages
      if (message.type === 'system' && message.sender === 'System') {
        const text = message.text;

        // Sync turn changes
        if (text.startsWith('TURN:player1')) {
          console.log('[Spectator] Turn switch to player1');
          setCurrentTurn('player1');
        } else if (text.startsWith('TURN:player2')) {
          console.log('[Spectator] Turn switch to player2');
          setCurrentTurn('player2');
        }

        // Sync score updates
        if (text.startsWith('SCORE_UPDATE:')) {
          const parts = text.split(':');
          if (parts.length >= 3) {
            const playerKey = parts[1];
            const score = parseInt(parts[2], 10);
            const promptsUsed = parts.length >= 4 ? parseInt(parts[3], 10) : undefined;
            console.log(`[Spectator] Score update: ${playerKey} = ${score}, promptsUsed = ${promptsUsed}`);

            if (playerKey === 'player1') {
              setPlayer1((prev) => ({
                ...prev,
                score,
                ...(promptsUsed !== undefined && { promptsUsed }),
              }));
            } else if (playerKey === 'player2') {
              setPlayer2((prev) => ({
                ...prev,
                score,
                ...(promptsUsed !== undefined && { promptsUsed }),
              }));
            }
          }
        }

        // Handle game end - navigate to results
        if (text.startsWith('GAME_END')) {
          console.log('[Spectator] Game ended - navigating to results');
          setIsFinished(true);
          setIsActive(false);
          // Navigate to results after a short delay
          setTimeout(() => {
            navigate(`/results/${code}`);
          }, 2000);
        }

        // Handle RESULTS message - save results to localStorage for the results page
        if (text.startsWith('RESULTS:')) {
          console.log('[Spectator] Results received');
          try {
            const resultsJson = text.substring('RESULTS:'.length);
            const gameResults = JSON.parse(resultsJson);
            console.log('[Spectator] Saving results to localStorage:', gameResults);
            localStorage.setItem('promptduel_results', JSON.stringify(gameResults));
            // Update local player state with final scores
            if (gameResults.player1) {
              setPlayer1((prev) => ({
                ...prev,
                score: gameResults.player1.score,
                promptsUsed: gameResults.player1.promptsUsed,
              }));
            }
            if (gameResults.player2) {
              setPlayer2((prev) => ({
                ...prev,
                score: gameResults.player2.score,
                promptsUsed: gameResults.player2.promptsUsed,
              }));
            }
          } catch (e) {
            console.error('[Spectator] Failed to parse results:', e);
          }
        }
      }

      // Sync game start from judge message
      if (message.type === 'judge' && message.sender === 'Judge Alpha') {
        if (message.text.includes('Challenge') && message.text.includes('begins!')) {
          console.log('[Spectator] Game started');
          setIsActive(true);

          // Parse start timestamp and total seconds from message: [START:timestamp:totalSeconds]
          const startMatch = message.text.match(/\[START:(\d+):(\d+)\]/);
          if (startMatch) {
            const startTime = parseInt(startMatch[1], 10);
            const totalSeconds = parseInt(startMatch[2], 10);
            gameStartTimeRef.current = startTime;
            gameTotalSecondsRef.current = totalSeconds;

            // Calculate remaining time based on elapsed time
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const remaining = Math.max(0, totalSeconds - elapsed);
            console.log(`[Spectator] Timer sync: startTime=${startTime}, totalSeconds=${totalSeconds}, elapsed=${elapsed}, remaining=${remaining}`);
            setTimeLeft(remaining);
          }
        }
        // Check for evaluation complete (game end)
        if (message.text.includes('Evaluation complete!')) {
          console.log('[Spectator] Evaluation complete - navigating to results');
          setIsFinished(true);
          setIsActive(false);
          setTimeout(() => {
            navigate(`/results/${code}`);
          }, 2000);
        }
      }

      // Sync prompts used from player messages
      if (message.type === 'player1' || message.type === 'player2') {
        const promptMatch = message.text.match(/Prompt #(\d+):/);
        if (promptMatch) {
          const promptNum = parseInt(promptMatch[1], 10);
          if (message.type === 'player1') {
            setPlayer1((prev) => ({
              ...prev,
              promptsUsed: Math.max(prev.promptsUsed, promptNum),
            }));
          } else {
            setPlayer2((prev) => ({
              ...prev,
              promptsUsed: Math.max(prev.promptsUsed, promptNum),
            }));
          }
        }

        // Sync hasEnded
        if (message.text.includes('Has ended their prompts early!')) {
          if (message.type === 'player1') {
            setPlayer1((prev) => ({ ...prev, hasEnded: true }));
          } else {
            setPlayer2((prev) => ({ ...prev, hasEnded: true }));
          }
        }
      }
    }

    // Limit processed IDs to prevent memory issues
    if (processedMessageIdsRef.current.size > 500) {
      const idsArray = Array.from(processedMessageIdsRef.current);
      processedMessageIdsRef.current = new Set(idsArray.slice(-250));
    }
  }, [supabaseMessages, code, navigate]);

  // Connect to room WebSocket for spectator updates
  useEffect(() => {
    if (code && !isLoadingRoom) {
      connectToRoom(code);
    }

    return () => {
      disconnectFromRoom();
    };
  }, [code, isLoadingRoom, connectToRoom, disconnectFromRoom]);

  // Connect to Claude Code server for terminal output (after room data is loaded)
  useEffect(() => {
    if (!code || isLoadingRoom || player1.name === 'Player 1') return;

    const claudeWs = new WebSocket(config.wsUrl);
    claudeWsRef.current = claudeWs;

    claudeWs.onopen = () => {
      console.log('Claude Code spectator WebSocket connected');
      // Register as spectator for this room
      claudeWs.send(JSON.stringify({ type: 'spectate-session', roomCode: code }));
    };

    claudeWs.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'terminal-output') {
          // Route to correct player console based on playerName
          if (msg.playerName === player1.name) {
            setPlayer1Console((prev) => [...prev, msg.data]);
          } else if (msg.playerName === player2.name) {
            setPlayer2Console((prev) => [...prev, msg.data]);
          } else {
            // If we can't match by name, add to both for visibility
            console.log('Terminal output from:', msg.playerName);
            setPlayer1Console((prev) => [...prev, `[${msg.playerName}] ${msg.data}`]);
          }
        } else if (msg.type === 'spectate-started') {
          console.log('Successfully joined as spectator for room:', msg.roomCode);
        }
      } catch (e) {
        console.error('Claude WS message error:', e);
      }
    };

    claudeWs.onclose = () => {
      console.log('Claude Code spectator WebSocket disconnected');
    };

    claudeWs.onerror = (error) => {
      console.error('Claude WS error:', error);
    };

    return () => {
      if (claudeWs.readyState === WebSocket.OPEN) {
        claudeWs.send(JSON.stringify({ type: 'leave-spectate' }));
      }
      claudeWs.close();
    };
  }, [code, isLoadingRoom, player1.name, player2.name]);

  // Connect to backend WebSocket for game state updates
  useEffect(() => {
    if (!code || !token) return;

    const ws = new WebSocket(config.roomWsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Spectator WebSocket connected');
      // Authenticate
      ws.send(JSON.stringify({ type: 'auth', token }));

      // Join room after auth
      setTimeout(() => {
        ws.send(JSON.stringify({ type: 'join-room', roomCode: code }));
      }, 500);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'terminal-output':
            // Forward terminal output to the appropriate console
            if (msg.playerId) {
              // Determine which player based on username match
              if (msg.playerUsername === player1.name) {
                setPlayer1Console((prev) => [...prev, msg.data]);
              } else if (msg.playerUsername === player2.name) {
                setPlayer2Console((prev) => [...prev, msg.data]);
              }
            }
            break;

          case 'game-state-update':
            // Update game state from players
            if (msg.data) {
              if (msg.data.player1) {
                setPlayer1((prev) => ({ ...prev, ...msg.data.player1 }));
              }
              if (msg.data.player2) {
                setPlayer2((prev) => ({ ...prev, ...msg.data.player2 }));
              }
              if (msg.data.currentTurn) {
                setCurrentTurn(msg.data.currentTurn);
              }
              if (msg.data.timeLeft !== undefined) {
                setTimeLeft(msg.data.timeLeft);
              }
              if (msg.data.isActive !== undefined) {
                setIsActive(msg.data.isActive);
              }
            }
            break;

          case 'game-ended':
            setIsFinished(true);
            if (msg.data) {
              if (msg.data.player1) setPlayer1((prev) => ({ ...prev, ...msg.data.player1 }));
              if (msg.data.player2) setPlayer2((prev) => ({ ...prev, ...msg.data.player2 }));
            }
            break;
        }
      } catch (e) {
        console.error('Failed to parse spectator message:', e);
      }
    };

    ws.onclose = () => {
      console.log('Spectator WebSocket disconnected');
    };

    return () => {
      ws.close();
    };
  }, [code, token, player1.name, player2.name]);

  // Update player names from room data
  useEffect(() => {
    if (room) {
      if (room.player1) {
        setPlayer1((prev) => ({ ...prev, name: room.player1!.username }));
      }
      if (room.player2) {
        setPlayer2((prev) => ({ ...prev, name: room.player2!.username }));
      }
    }
  }, [room]);

  // Timer countdown (spectator syncs with game start time)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        // If we have a game start time, calculate remaining based on elapsed
        if (gameStartTimeRef.current > 0) {
          const elapsed = Math.floor((Date.now() - gameStartTimeRef.current) / 1000);
          const remaining = Math.max(0, gameTotalSecondsRef.current - elapsed);
          setTimeLeft(remaining);
        } else {
          // Fallback to local countdown
          setTimeLeft((time) => Math.max(0, time - 1));
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  // Scroll console to bottom
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [player1Console, player2Console, activeTab]);

  const handleLeave = async () => {
    await leaveRoom(code);
    navigate('/lobby');
  };

  const currentConsole = activeTab === 'player1' ? player1Console : player2Console;

  if (isLoadingRoom) {
    return (
      <div className="page-container flex items-center justify-center font-['Press_Start_2P']">
        <div className="bg-pattern"></div>
        <div className="loading-container">
          <i className="nes-icon trophy is-large trophy-bounce"></i>
          <p className="loading-text text-sm">Connecting to game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container font-['Press_Start_2P']">
      <div className="bg-pattern"></div>

      {/* Header */}
      <header className="app-header p-4">
        <div className="container mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 animate-fade-in">
            <i className="nes-icon trophy is-medium trophy-bounce"></i>
            <div>
              <h1 className="text-lg text-primary glow-text">Spectating: {code}</h1>
              <p className="text-xs text-[#92cc41]">
                Challenge {room?.challenge || 1} - Live View
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 animate-fade-in animate-delay-1">
            <div className="nes-badge">
              <span className="is-warning">SPECTATOR</span>
            </div>
            <Timer timeLeft={timeLeft} isActive={isActive} />
            <span style={{ fontSize: '0.7rem', color: '#888' }}>
              Watching as <span style={{ color: '#92cc41' }}>{user?.username}</span>
            </span>
            <button onClick={handleLeave} className="nes-btn is-error text-xs">
              Leave
            </button>
          </div>
        </div>
      </header>

      <main className="page-content">
        {/* Game Status */}
        {isFinished ? (
          <div className="text-center mb-6 animate-fade-in">
            <div className="nes-container is-dark is-rounded inline-block glow-primary">
              <p className="text-[#92cc41] glow-text">Game Finished!</p>
            </div>
          </div>
        ) : !isActive ? (
          <div className="text-center mb-6 animate-fade-in">
            <div className="nes-container is-dark is-rounded inline-block">
              <p className="text-yellow-400 loading-text">Waiting for game to start...</p>
            </div>
          </div>
        ) : (
          <div className="text-center mb-6 animate-fade-in">
            <div className="nes-container is-dark is-rounded inline-block glow-secondary">
              <p className="text-[#92cc41]">
                {currentTurn === 'player1' ? player1.name : player2.name}'s turn
              </p>
            </div>
          </div>
        )}

        {/* Score Display */}
        <div className="nes-container is-dark mb-6 glow-primary animate-fade-in animate-delay-2">
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <div className="text-center animate-slide-left">
              <p className="text-xs mb-2">{player1.name}</p>
              <p className="text-2xl text-[#209cee] glow-text">
                {getFinalScore(player1.score, player1.promptsUsed)}
              </p>
              <p className="text-xs text-gray-500">
                {player1.score} x {getMultiplier(player1.promptsUsed)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Prompts: {player1.promptsUsed}/7
              </p>
            </div>

            <div className="vs-divider text-2xl">VS</div>

            <div className="text-center animate-slide-right">
              <p className="text-xs mb-2">{player2.name}</p>
              <p className="text-2xl text-[#92cc41] glow-text">
                {getFinalScore(player2.score, player2.promptsUsed)}
              </p>
              <p className="text-xs text-gray-500">
                {player2.score} x {getMultiplier(player2.promptsUsed)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Prompts: {player2.promptsUsed}/7
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Terminal Output */}
          <div className="nes-container is-dark with-title animate-fade-in animate-delay-3">
            <p className="title">Terminal Output</p>

            {/* Player Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setActiveTab('player1')}
                className={`nes-btn ${activeTab === 'player1' ? 'is-primary' : ''} text-xs flex-1`}
              >
                {player1.name}
              </button>
              <button
                onClick={() => setActiveTab('player2')}
                className={`nes-btn ${activeTab === 'player2' ? 'is-success' : ''} text-xs flex-1`}
              >
                {player2.name}
              </button>
            </div>

            {/* Console Output */}
            <div className="terminal-window">
              <div className="terminal-header">
                <span className="dot red"></span>
                <span className="dot yellow"></span>
                <span className="dot green"></span>
                <span className="text-xs text-gray-400 ml-2">{activeTab === 'player1' ? player1.name : player2.name}'s terminal</span>
              </div>
              <div
                ref={consoleRef}
                className="terminal-content h-64"
              >
                {currentConsole.length === 0 ? (
                  <p className="text-gray-500">Waiting for terminal output...</p>
                ) : (
                  currentConsole.map((line, idx) => (
                    <pre
                      key={idx}
                      className="whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{
                        __html: line
                          .replace(/\x1b\[[0-9;]*m/g, '')
                          .replace(/</g, '&lt;')
                          .replace(/>/g, '&gt;'),
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Chat & Commentary Section (Read-only for spectators) */}
          <div className="animate-fade-in animate-delay-4">
            <CombinedChat messages={supabaseMessages} />
            <div
              className="mt-2 text-center"
              style={{ fontSize: 'clamp(0.4rem, 1.5vw, 0.55rem)', color: '#666' }}
            >
              Spectators can view messages only
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
