import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { config } from '../config';
import { useAuth } from './AuthContext';
import { useRoom } from './RoomContext';
import { useSupabaseGame } from './SupabaseGameContext';

type Player = 'player1' | 'player2';

interface PlayerState {
  name: string;
  prompt: string;
  score: number;
  isReady: boolean;
  promptsUsed: number;
  hasEnded: boolean;
}

interface Message {
  sender: string;
  text: string;
  timestamp: number;
  type: 'player1' | 'player2' | 'judge' | 'system';
}

interface GameContextType {
  // Game state
  player1: PlayerState;
  player2: PlayerState;
  currentTurn: Player;
  timeLeft: number;
  isActive: boolean;
  winner: Player | null;
  gameMessages: Message[];
  player1Console: string[];
  player2Console: string[];
  player1Connected: boolean;
  player2Connected: boolean;
  player1Processing: boolean;
  player2Processing: boolean;
  evaluationResults: any;
  isEvaluating: boolean;
  shouldNavigateToResults: boolean;
  selectedChallenge: 1 | 2;
  gameTimeoutMinutes: number;

  // Actions
  setPlayer1: React.Dispatch<React.SetStateAction<PlayerState>>;
  setPlayer2: React.Dispatch<React.SetStateAction<PlayerState>>;
  setCurrentTurn: React.Dispatch<React.SetStateAction<Player>>;
  setTimeLeft: React.Dispatch<React.SetStateAction<number>>;
  setIsActive: React.Dispatch<React.SetStateAction<boolean>>;
  setWinner: React.Dispatch<React.SetStateAction<Player | null>>;
  setSelectedChallenge: React.Dispatch<React.SetStateAction<1 | 2>>;
  setGameTimeoutMinutes: React.Dispatch<React.SetStateAction<number>>;
  addGameMessage: (sender: string, text: string, type: 'player1' | 'player2' | 'judge' | 'system') => void;
  addConsoleLog: (player: Player, log: string) => void;
  connectPlayer: (playerNum: 1 | 2, playerName: string, challenge: number, roomCode?: string) => void;
  disconnectPlayer: (playerNum: 1 | 2) => void;
  sendPlayerInput: (playerNum: 1 | 2, input: string) => void;
  handleSubmit: (player: Player) => void;
  handleEndPrompts: (player: Player) => void;
  startDuel: () => void;
  handleTimeUp: () => void;
  handleEndDuel: () => Promise<void>;
  resetGame: () => void;
  setEvaluationResults: React.Dispatch<React.SetStateAction<any>>;

  // For spectators
  isSpectator: boolean;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { room, role, finishRoom } = useRoom();
  const {
    messages: supabaseMessages,
    sendGameMessage,
    subscribeToGame,
    unsubscribeFromGame,
    clearMessages: clearSupabaseMessages,
  } = useSupabaseGame();

  const [selectedChallenge, setSelectedChallenge] = useState<1 | 2>(1);
  const [gameTimeoutMinutes, setGameTimeoutMinutes] = useState(20);

  const [player1, setPlayer1] = useState<PlayerState>({
    name: 'Player 1',
    prompt: '',
    score: 0,
    isReady: false,
    promptsUsed: 0,
    hasEnded: false,
  });

  const [player2, setPlayer2] = useState<PlayerState>({
    name: 'Player 2',
    prompt: '',
    score: 0,
    isReady: false,
    promptsUsed: 0,
    hasEnded: false,
  });

  const [currentTurn, setCurrentTurn] = useState<Player>('player1');
  const [timeLeft, setTimeLeft] = useState(20 * 60);
  const [isActive, setIsActive] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [player1Console, setPlayer1Console] = useState<string[]>([]);
  const [player2Console, setPlayer2Console] = useState<string[]>([]);
  const [player1Connected, setPlayer1Connected] = useState(false);
  const [player2Connected, setPlayer2Connected] = useState(false);
  const [evaluationResults, setEvaluationResults] = useState<any>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [player1Processing, setPlayer1Processing] = useState(false);
  const [player2Processing, setPlayer2Processing] = useState(false);
  const [shouldNavigateToResults, setShouldNavigateToResults] = useState(false);

  const player1WsRef = useRef<WebSocket | null>(null);
  const player2WsRef = useRef<WebSocket | null>(null);
  const currentRoomCodeRef = useRef<string | null>(null);
  const evaluatePlayerScoreRef = useRef<
    (playerNum: 1 | 2, playerName: string, challenge: number) => void
  >(() => {});
  const addGameMessageRef = useRef<
    (sender: string, text: string, type: 'player1' | 'player2' | 'judge' | 'system') => void
  >(() => {});
  const player1NameRef = useRef<string>('Player 1');
  const player2NameRef = useRef<string>('Player 2');
  const player1HasEndedRef = useRef<boolean>(false);
  const player2HasEndedRef = useRef<boolean>(false);
  const setCurrentTurnRef = useRef<(turn: Player) => void>(() => {});
  const processedMessageIdsRef = useRef<Set<string>>(new Set());
  const gameEndedRef = useRef<boolean>(false);

  const isSpectator = role === 'spectator';

  // Use Supabase messages as game messages
  const gameMessages = supabaseMessages;

  // Subscribe to game messages when room code is available
  useEffect(() => {
    if (room?.code && room.code !== currentRoomCodeRef.current) {
      console.log('Subscribing to game messages for room:', room.code);
      currentRoomCodeRef.current = room.code;
      // Reset game state for new room
      gameEndedRef.current = false;
      processedMessageIdsRef.current = new Set();
      subscribeToGame(room.code);
    }
  }, [room?.code, subscribeToGame]);

  // Listen for turn switch messages from Supabase to sync turn state across browsers
  // IMPORTANT: Process ALL new messages, not just the last one, to avoid missing turn switches
  useEffect(() => {
    if (supabaseMessages.length === 0) return;

    // Check if ANY message contains GAME_END - if so, mark game as ended
    const hasGameEndMessage = supabaseMessages.some(
      (msg) => msg.type === 'system' && msg.sender === 'System' && msg.text.startsWith('GAME_END')
    );
    if (hasGameEndMessage) {
      gameEndedRef.current = true;
    }

    // Process all messages that haven't been processed yet
    for (const message of supabaseMessages) {
      // Create a unique ID for each message based on timestamp and content
      const messageId = `${message.timestamp}-${message.sender}-${message.text.substring(0, 50)}`;

      // Skip if already processed
      if (processedMessageIdsRef.current.has(messageId)) {
        continue;
      }

      // Mark as processed
      processedMessageIdsRef.current.add(messageId);
      console.log('[Supabase Sync] Processing message:', message);

      // Check if this is a system message
      if (message.type === 'system' && message.sender === 'System') {
        const text = message.text;
        console.log('[Supabase Sync] System message:', text);

        // Detect turn switch messages with TURN:player1 or TURN:player2 prefix
        if (text.startsWith('TURN:')) {
          console.log('[Supabase Sync] Turn switch message detected:', text);

          if (text.startsWith('TURN:player1')) {
            console.log('[Supabase Sync] Switching turn to player1');
            setCurrentTurn('player1');
          } else if (text.startsWith('TURN:player2')) {
            console.log('[Supabase Sync] Switching turn to player2');
            setCurrentTurn('player2');
          }
        }

        // Sync "Claude is working" messages to set processing state on both browsers
        // This ensures both players see when the opponent is processing
        if (text.includes('Claude is working on')) {
          console.log('[Supabase Sync] Claude is working message detected');
          // Determine which player is processing from the message
          if (text.includes(player1NameRef.current)) {
            console.log('[Supabase Sync] Setting player1Processing = true');
            setPlayer1Processing(true);
            player1SubmittingRef.current = true;
          } else if (text.includes(player2NameRef.current)) {
            console.log('[Supabase Sync] Setting player2Processing = true');
            setPlayer2Processing(true);
            player2SubmittingRef.current = true;
          }
        }

        // Sync processing complete from "Claude finished" messages
        if (text.includes('Claude finished processing')) {
          console.log('[Supabase Sync] Processing complete message detected - resetting ALL processing states');
          // Reset both processing states to be safe
          setPlayer1Processing(false);
          setPlayer2Processing(false);
          // Also reset submitting refs
          player1SubmittingRef.current = false;
          player2SubmittingRef.current = false;
        }

        // Handle GAME_END message - host ended the duel or both players ended
        if (text.startsWith('GAME_END')) {
          console.log('[Supabase Sync] Game end detected - stopping game and triggering navigation');
          gameEndedRef.current = true;
          setIsActive(false);
          setPlayer1Processing(false);
          setPlayer2Processing(false);
          // Signal that we should navigate to results
          setShouldNavigateToResults(true);
        }

        // Handle RESULTS message - save results to localStorage so both players can access them
        if (text.startsWith('RESULTS:')) {
          console.log('[Supabase Sync] Results received');
          try {
            const resultsJson = text.substring('RESULTS:'.length);
            const gameResults = JSON.parse(resultsJson);
            console.log('[Supabase Sync] Saving results to localStorage:', gameResults);
            localStorage.setItem('promptduel_results', JSON.stringify(gameResults));
            // Also update local state
            if (gameResults.evaluationResults) {
              setEvaluationResults(gameResults.evaluationResults);
            }
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
            if (gameResults.winner) {
              setWinner(gameResults.winner);
            }
          } catch (e) {
            console.error('[Supabase Sync] Failed to parse results:', e);
          }
        }

        // Sync score updates from SCORE_UPDATE messages
        if (text.startsWith('SCORE_UPDATE:')) {
          const parts = text.split(':');
          if (parts.length >= 3) {
            const playerKey = parts[1];
            const score = parseInt(parts[2], 10);
            const promptsUsed = parts.length >= 4 ? parseInt(parts[3], 10) : undefined;
            console.log(`[Supabase Sync] Score update: ${playerKey} = ${score}, promptsUsed = ${promptsUsed}`);
            if (playerKey === 'player1') {
              setPlayer1((prev) => {
                const updates: any = {};
                if (prev.score !== score) {
                  console.log(`Syncing player1 score to ${score}`);
                  updates.score = score;
                }
                if (promptsUsed !== undefined && prev.promptsUsed < promptsUsed) {
                  console.log(`Syncing player1 promptsUsed to ${promptsUsed}`);
                  updates.promptsUsed = promptsUsed;
                }
                if (Object.keys(updates).length > 0) {
                  return { ...prev, ...updates };
                }
                return prev;
              });
            } else if (playerKey === 'player2') {
              setPlayer2((prev) => {
                const updates: any = {};
                if (prev.score !== score) {
                  console.log(`Syncing player2 score to ${score}`);
                  updates.score = score;
                }
                if (promptsUsed !== undefined && prev.promptsUsed < promptsUsed) {
                  console.log(`Syncing player2 promptsUsed to ${promptsUsed}`);
                  updates.promptsUsed = promptsUsed;
                }
                if (Object.keys(updates).length > 0) {
                  return { ...prev, ...updates };
                }
                return prev;
              });
            }
          }
        }
      }

      // Sync isActive from judge "Challenge begins" message
      // BUT only if the game hasn't been ended yet
      if (message.type === 'judge' && message.sender === 'Judge Alpha') {
        if (message.text.includes('Challenge') && message.text.includes('begins!')) {
          if (!gameEndedRef.current) {
            console.log('Syncing isActive=true from Judge message');
            setIsActive(true);
            // Also reset isReady for both players when game starts
            setPlayer1((prev) => ({ ...prev, isReady: false, prompt: '' }));
            setPlayer2((prev) => ({ ...prev, isReady: false, prompt: '' }));

            // Parse start timestamp and total seconds from message for timer sync
            // Format: [START:timestamp:totalSeconds]
            const startMatch = message.text.match(/\[START:(\d+):(\d+)\]/);
            if (startMatch) {
              const startTime = parseInt(startMatch[1], 10);
              const totalSeconds = parseInt(startMatch[2], 10);
              gameStartTimeRef.current = startTime;

              // Calculate remaining time based on elapsed time (for Player 2 who receives via Supabase)
              const elapsed = Math.floor((Date.now() - startTime) / 1000);
              const remaining = Math.max(0, totalSeconds - elapsed);
              console.log(`[Timer Sync] startTime=${startTime}, totalSeconds=${totalSeconds}, elapsed=${elapsed}, remaining=${remaining}`);
              setTimeLeft(remaining);
            }
          } else {
            console.log('Ignoring "begins" message - game has already ended');
          }
        }
      }

      // Sync promptsUsed from prompt submission messages (e.g., "Prompt #3: ...")
      if ((message.type === 'player1' || message.type === 'player2')) {
        const promptMatch = message.text.match(/Prompt #(\d+):/);
        if (promptMatch) {
          const promptNum = parseInt(promptMatch[1], 10);
          if (message.type === 'player1') {
            setPlayer1((prev) => {
              if (prev.promptsUsed < promptNum) {
                console.log(`Syncing player1 promptsUsed to ${promptNum}`);
                return { ...prev, promptsUsed: promptNum };
              }
              return prev;
            });
          } else {
            setPlayer2((prev) => {
              if (prev.promptsUsed < promptNum) {
                console.log(`Syncing player2 promptsUsed to ${promptNum}`);
                return { ...prev, promptsUsed: promptNum };
              }
              return prev;
            });
          }
        }

        // Sync hasEnded from "Has ended their prompts early!" messages
        if (message.text.includes('Has ended their prompts early!')) {
          if (message.type === 'player1') {
            setPlayer1((prev) => ({ ...prev, hasEnded: true }));
          } else {
            setPlayer2((prev) => ({ ...prev, hasEnded: true }));
          }
        }
      }
    }

    // Limit the size of processed message IDs to prevent memory issues
    if (processedMessageIdsRef.current.size > 500) {
      const idsArray = Array.from(processedMessageIdsRef.current);
      processedMessageIdsRef.current = new Set(idsArray.slice(-250));
    }
  }, [supabaseMessages]);

  const addGameMessage = useCallback(
    (sender: string, text: string, type: 'player1' | 'player2' | 'judge' | 'system') => {
      const roomCode = currentRoomCodeRef.current || room?.code;
      if (roomCode) {
        sendGameMessage(roomCode, sender, text, type);
      } else {
        console.warn('Cannot send game message: no room code');
      }
    },
    [room?.code, sendGameMessage]
  );

  // Keep refs updated for use in WebSocket handlers
  useEffect(() => {
    addGameMessageRef.current = addGameMessage;
  }, [addGameMessage]);

  // Refs for promptsUsed
  const player1PromptsUsedRef = useRef<number>(0);
  const player2PromptsUsedRef = useRef<number>(0);

  useEffect(() => {
    player1NameRef.current = player1.name;
    player2NameRef.current = player2.name;
    player1HasEndedRef.current = player1.hasEnded;
    player2HasEndedRef.current = player2.hasEnded;
    player1PromptsUsedRef.current = player1.promptsUsed;
    player2PromptsUsedRef.current = player2.promptsUsed;
  }, [player1.name, player2.name, player1.hasEnded, player2.hasEnded, player1.promptsUsed, player2.promptsUsed]);

  useEffect(() => {
    setCurrentTurnRef.current = setCurrentTurn;
  }, []);

  const addConsoleLog = useCallback((player: Player, log: string) => {
    if (player === 'player1') {
      setPlayer1Console((prev) => [...prev, log]);
    } else {
      setPlayer2Console((prev) => [...prev, log]);
    }
  }, []);

  const evaluatePlayerScore = useCallback(
    async (playerNum: 1 | 2, playerName: string, challenge: number) => {
      try {
        const response = await fetch(`${config.apiUrl}/evaluate-player`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName, challenge }),
        });

        const result = await response.json();

        if (result.success) {
          if (playerNum === 1) {
            setPlayer1((prev) => ({ ...prev, score: result.totalScore }));
          } else {
            setPlayer2((prev) => ({ ...prev, score: result.totalScore }));
          }

          const setConsole = playerNum === 1 ? setPlayer1Console : setPlayer2Console;
          setConsole((prev) => [
            ...prev,
            `[Score] ${playerName}: ${result.totalScore}/${result.maxScore} (${result.percentage}%) - Grade: ${result.grade}`,
          ]);

          // Broadcast score update via Supabase so both players see the score
          const playerKey = playerNum === 1 ? 'player1' : 'player2';
          const promptsUsed = playerNum === 1 ? player1PromptsUsedRef.current : player2PromptsUsedRef.current;
          console.log(`[evaluatePlayerScore] Broadcasting score: ${playerKey}, score=${result.totalScore}, promptsUsed=${promptsUsed}`);
          addGameMessageRef.current(
            'System',
            `SCORE_UPDATE:${playerKey}:${result.totalScore}:${promptsUsed}`,
            'system'
          );
        }
      } catch (error) {
        console.error('Failed to evaluate player:', error);
      }
    },
    []
  );

  useEffect(() => {
    evaluatePlayerScoreRef.current = evaluatePlayerScore;
  }, [evaluatePlayerScore]);

  const connectPlayer = useCallback(
    (playerNum: 1 | 2, playerName: string, challenge: number, roomCode?: string) => {
      const wsRef = playerNum === 1 ? player1WsRef : player2WsRef;
      const setConnected = playerNum === 1 ? setPlayer1Connected : setPlayer2Connected;
      const setConsole = playerNum === 1 ? setPlayer1Console : setPlayer2Console;
      const setProcessing = playerNum === 1 ? setPlayer1Processing : setPlayer2Processing;

      console.log(`[connectPlayer] Player ${playerNum} connecting to room ${roomCode}`);
      console.log(`[connectPlayer] Current room: ${currentRoomCodeRef.current}`);
      console.log(`[connectPlayer] WebSocket exists: ${!!wsRef.current}, readyState: ${wsRef.current?.readyState}`);

      // If room code changed, close existing connection
      if (roomCode && currentRoomCodeRef.current && currentRoomCodeRef.current !== roomCode) {
        console.log(`[connectPlayer] Room changed from ${currentRoomCodeRef.current} to ${roomCode}, closing old connection`);
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
        setConnected(false);
      }

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log(`Player ${playerNum} already connected to room ${roomCode}`);
        return;
      }

      // Update room code
      if (roomCode) {
        currentRoomCodeRef.current = roomCode;
      }

      try {
        const ws = new WebSocket(config.wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log(`Player ${playerNum} (${playerName}) WebSocket connected`);
          setConnected(true);
          setConsole((prev) => [...prev, `[System] Connected to Claude Code Server`]);

          ws.send(
            JSON.stringify({
              type: 'start-session',
              playerName,
              challenge,
              roomCode, // Pass roomCode to enable spectator broadcasting
              cols: 120,
              rows: 30,
            })
          );
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);

            if (msg.type === 'output') {
              setConsole((prev) => [...prev, msg.data]);
            } else if (msg.type === 'session-started') {
              setConsole((prev) => [
                ...prev,
                `[System] Session started in workspace: ${msg.workspace}`,
              ]);
            } else if (msg.type === 'processing-started') {
              console.log(`Player ${playerNum} processing started`);
              setProcessing(true);
              // Broadcast to both players via Supabase
              const pName = playerNum === 1 ? player1NameRef.current : player2NameRef.current;
              addGameMessageRef.current('System', `Claude is working on ${pName}'s prompt...`, 'system');
            } else if (msg.type === 'processing-complete') {
              console.log(`Player ${playerNum} processing complete`);
              console.log(`[processing-complete] msg:`, msg);
              setProcessing(false);
              // Reset the submitting ref
              if (playerNum === 1) {
                player1SubmittingRef.current = false;
              } else {
                player2SubmittingRef.current = false;
              }
              setConsole((prev) => [...prev, `[System] Claude finished processing`]);
              // Broadcast completion to both players
              const pName = playerNum === 1 ? player1NameRef.current : player2NameRef.current;
              addGameMessageRef.current('System', `Claude finished processing ${pName}'s prompt`, 'system');

              console.log(`[processing-complete] playerName=${msg.playerName}, challenge=${msg.challenge}`);
              if (msg.playerName && msg.challenge) {
                console.log(`[processing-complete] Calling evaluatePlayerScore for player ${playerNum}`);
                evaluatePlayerScoreRef.current(playerNum, msg.playerName, msg.challenge);
              } else {
                console.log(`[processing-complete] Missing playerName or challenge, not evaluating score`);
              }

              // Switch turn to the other player after processing completes
              console.log(`[processing-complete] Checking turn switch: playerNum=${playerNum}, player2HasEnded=${player2HasEndedRef.current}, player1HasEnded=${player1HasEndedRef.current}`);
              if (playerNum === 1 && !player2HasEndedRef.current) {
                console.log(`[processing-complete] Switching turn to player2 (${player2NameRef.current})`);
                setCurrentTurnRef.current('player2');
                // Include TURN:player2 for reliable syncing
                addGameMessageRef.current('System', `TURN:player2 It's now ${player2NameRef.current}'s turn!`, 'system');
                console.log(`[processing-complete] Turn switch message sent`);
              } else if (playerNum === 2 && !player1HasEndedRef.current) {
                console.log(`[processing-complete] Switching turn to player1 (${player1NameRef.current})`);
                setCurrentTurnRef.current('player1');
                // Include TURN:player1 for reliable syncing
                addGameMessageRef.current('System', `TURN:player1 It's now ${player1NameRef.current}'s turn!`, 'system');
                console.log(`[processing-complete] Turn switch message sent`);
              } else {
                console.log(`[processing-complete] Not switching turn`);
              }
            } else if (msg.type === 'exit') {
              setConsole((prev) => [...prev, `[System] Session exited with code: ${msg.exitCode}`]);
              setProcessing(false);
            } else if (msg.type === 'error') {
              setConsole((prev) => [...prev, `[Error] ${msg.message}`]);
              setProcessing(false);
            }
          } catch (e) {
            console.error('Error parsing message:', e);
          }
        };

        ws.onclose = () => {
          console.log(`Player ${playerNum} WebSocket disconnected`);
          setConnected(false);
          setConsole((prev) => [...prev, `[System] Disconnected from server`]);
          wsRef.current = null;
        };

        ws.onerror = (error) => {
          console.error(`Player ${playerNum} WebSocket error:`, error);
          setConsole((prev) => [...prev, `[Error] Connection failed`]);
        };
      } catch (error) {
        console.error('Failed to connect:', error);
        setConsole((prev) => [...prev, `[Error] Failed to connect to server`]);
      }
    },
    []
  );

  const disconnectPlayer = useCallback((playerNum: 1 | 2) => {
    const wsRef = playerNum === 1 ? player1WsRef : player2WsRef;
    const setConnected = playerNum === 1 ? setPlayer1Connected : setPlayer2Connected;

    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'kill-session' }));
      }
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  const sendPlayerInput = useCallback((playerNum: 1 | 2, input: string) => {
    const wsRef = playerNum === 1 ? player1WsRef : player2WsRef;
    console.log(`[sendPlayerInput] Player ${playerNum} attempting to send input`);
    console.log(`[sendPlayerInput] WebSocket exists: ${!!wsRef.current}`);
    console.log(`[sendPlayerInput] WebSocket readyState: ${wsRef.current?.readyState} (OPEN=1)`);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log(`[sendPlayerInput] Sending input: "${input.substring(0, 50)}..."`);
      wsRef.current.send(JSON.stringify({ type: 'input', data: input }));
      console.log(`[sendPlayerInput] Input sent successfully`);
    } else {
      console.error(`[sendPlayerInput] FAILED - WebSocket not connected!`);
    }
  }, []);

  // Ref to store game start timestamp for timer sync
  const gameStartTimeRef = useRef<number>(0);

  const startDuel = useCallback(() => {
    // Reset game ended flag for new game
    gameEndedRef.current = false;
    setIsActive(true);
    const totalSeconds = gameTimeoutMinutes * 60;
    setTimeLeft(totalSeconds);
    setPlayer1((prev) => ({ ...prev, isReady: false, prompt: '' }));
    setPlayer2((prev) => ({ ...prev, isReady: false, prompt: '' }));

    // Store game start time for sync
    const startTime = Date.now();
    gameStartTimeRef.current = startTime;

    // Include start timestamp and timeout in the message for spectator sync
    addGameMessage(
      'Judge Alpha',
      `Challenge ${selectedChallenge} begins! You have ${gameTimeoutMinutes} minutes. Good luck! [START:${startTime}:${totalSeconds}]`,
      'judge'
    );
  }, [gameTimeoutMinutes, selectedChallenge, addGameMessage]);

  const runEvaluation = useCallback(async (forfeitByHost: boolean = false) => {
    setIsEvaluating(true);
    try {
      const response = await fetch(`${config.apiUrl}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player1Name: player1.name,
          player2Name: player2.name,
          challenge: selectedChallenge,
        }),
      });

      const results = await response.json();

      if (results.success) {
        setEvaluationResults(results);
        setPlayer1((prev) => ({ ...prev, score: results.player1.totalScore }));
        setPlayer2((prev) => ({ ...prev, score: results.player2.totalScore }));

        let evalWinner: 'player1' | 'player2' | null;
        let winnerReason = '';

        // If host (player 1) forfeited by ending duel early, player 2 wins
        if (forfeitByHost) {
          evalWinner = 'player2';
          winnerReason = ' by forfeit (host ended duel early)';
        } else {
          // Normal evaluation - compare final scores
          const { getFinalScore } = await import('../gameRules');
          const p1Final = getFinalScore(results.player1.totalScore, player1.promptsUsed);
          const p2Final = getFinalScore(results.player2.totalScore, player2.promptsUsed);
          evalWinner =
            p1Final > p2Final ? ('player1' as const) : p2Final > p1Final ? ('player2' as const) : null;
        }

        setWinner(evalWinner);
        const winnerName =
          evalWinner === 'player1'
            ? player1.name
            : evalWinner === 'player2'
              ? player2.name
              : null;
        addGameMessage(
          'Judge Alpha',
          `Evaluation complete! ${winnerName ? `${winnerName} wins${winnerReason}!` : "It's a tie!"}`,
          'judge'
        );

        // Save results to localStorage for the Results page to read
        const gameResults = {
          player1: {
            name: player1.name,
            score: results.player1.totalScore,
            promptsUsed: player1.promptsUsed,
          },
          player2: {
            name: player2.name,
            score: results.player2.totalScore,
            promptsUsed: player2.promptsUsed,
          },
          winner: evalWinner,
          evaluationResults: results,
          challenge: selectedChallenge,
          roomCode: room?.code,
        };
        console.log('Saving game results to localStorage:', gameResults);
        localStorage.setItem('promptduel_results', JSON.stringify(gameResults));

        // Broadcast results via Supabase so both players can save them
        // Using a compact format to avoid message size issues
        addGameMessage(
          'System',
          `RESULTS:${JSON.stringify(gameResults)}`,
          'system'
        );

        // Save both players to leaderboard
        try {
          const saveToLeaderboard = async (playerName: string, result: any, promptsUsed: number) => {
            await fetch(`${config.apiUrl}/leaderboard`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                playerName,
                challenge: selectedChallenge,
                score: result.totalScore,
                maxScore: result.maxScore,
                percentage: result.percentage,
                grade: result.grade,
                promptsUsed,
              }),
            });
          };

          await Promise.all([
            saveToLeaderboard(player1.name, results.player1, player1.promptsUsed),
            saveToLeaderboard(player2.name, results.player2, player2.promptsUsed),
          ]);
          console.log('Leaderboard entries saved successfully');
        } catch (leaderboardError) {
          console.error('Failed to save leaderboard entries:', leaderboardError);
        }

        // Mark the room as finished and navigate to results
        console.log('Calling finishRoom after successful evaluation');
        const finishResult = await finishRoom(room?.code);
        console.log('finishRoom result:', finishResult);

        // Navigate to results page directly since useEffect might not trigger
        const roomCode = room?.code || gameResults.roomCode;
        if (roomCode) {
          console.log('Navigating to results page with code:', roomCode);
          // Small delay to ensure state updates are processed
          setTimeout(() => {
            window.location.href = `/results/${roomCode}`;
          }, 500);
        } else {
          console.error('No room code available for navigation!');
        }
      } else {
        addGameMessage('Judge Alpha', 'Evaluation failed. Please check the workspaces.', 'judge');
      }
    } catch (error) {
      console.error('Evaluation error:', error);
      addGameMessage('Judge Alpha', 'Could not connect to evaluation server.', 'judge');
    }
    setIsEvaluating(false);
  }, [player1.name, player1.promptsUsed, player2.name, player2.promptsUsed, selectedChallenge, addGameMessage, finishRoom, room?.code]);

  const handleTimeUp = useCallback(() => {
    setIsActive(false);
    addGameMessage('Judge Alpha', 'Time is up! Evaluating both workspaces...', 'judge');
    runEvaluation();
  }, [addGameMessage, runEvaluation]);

  const handleEndDuel = useCallback(async () => {
    console.log('[handleEndDuel] Ending game...');
    gameEndedRef.current = true;
    setIsActive(false);

    // Check if player 2 has already ended their prompts
    // If so, no penalty for host ending early
    const isForfeit = !player2.hasEnded;

    // Broadcast GAME_END to notify all players
    addGameMessage('System', 'GAME_END Host ended the duel!', 'system');

    if (isForfeit) {
      addGameMessage('Judge Alpha', 'Host ended the duel early - Player 2 wins by forfeit! Evaluating workspaces...', 'judge');
    } else {
      addGameMessage('Judge Alpha', 'Duel ended! Both players finished - Evaluating workspaces...', 'judge');
    }

    await runEvaluation(isForfeit);
  }, [addGameMessage, runEvaluation, player2.hasEnded]);

  // Refs to track if a submission is in progress (prevents double-submit)
  const player1SubmittingRef = useRef<boolean>(false);
  const player2SubmittingRef = useRef<boolean>(false);

  const handleSubmit = useCallback(
    (player: Player) => {
      if (player === 'player1' && player1.prompt.trim()) {
        // Prevent double-submit: check if already submitting or processing
        if (player1SubmittingRef.current || player1Processing) {
          console.log(`[handleSubmit] Player1 already submitting or processing, ignoring duplicate submit`);
          return;
        }
        player1SubmittingRef.current = true;

        const prompt = player1.prompt.trim();
        const newPromptsUsed = player1.promptsUsed + 1;
        console.log(`[handleSubmit] Player1 submitting prompt #${newPromptsUsed}`);

        // Set processing FIRST before any other state updates
        setPlayer1Processing(true);

        setPlayer1((prev) => {
          console.log(`[handleSubmit] Player1 promptsUsed: ${prev.promptsUsed} -> ${prev.promptsUsed + 1}`);
          return { ...prev, promptsUsed: prev.promptsUsed + 1, prompt: '' };
        });
        addGameMessage(player1.name, `Prompt #${newPromptsUsed}: "${prompt}"`, 'player1');

        sendPlayerInput(1, prompt + '\n');

        // Timeout fallback - turn switches after processing completes
        setTimeout(() => {
          setPlayer1Processing(false);
          player1SubmittingRef.current = false;
        }, 120000);

        // Don't switch turn here - wait for processing to complete
      } else if (player === 'player2' && player2.prompt.trim()) {
        // Prevent double-submit: check if already submitting or processing
        if (player2SubmittingRef.current || player2Processing) {
          console.log(`[handleSubmit] Player2 already submitting or processing, ignoring duplicate submit`);
          return;
        }
        player2SubmittingRef.current = true;

        const prompt = player2.prompt.trim();
        const newPromptsUsed = player2.promptsUsed + 1;
        console.log(`[handleSubmit] Player2 submitting prompt #${newPromptsUsed}`);

        // Set processing FIRST before any other state updates
        setPlayer2Processing(true);

        setPlayer2((prev) => {
          console.log(`[handleSubmit] Player2 promptsUsed: ${prev.promptsUsed} -> ${prev.promptsUsed + 1}`);
          return { ...prev, promptsUsed: prev.promptsUsed + 1, prompt: '' };
        });
        addGameMessage(player2.name, `Prompt #${newPromptsUsed}: "${prompt}"`, 'player2');

        sendPlayerInput(2, prompt + '\n');

        // Timeout fallback - turn switches after processing completes
        setTimeout(() => {
          setPlayer2Processing(false);
          player2SubmittingRef.current = false;
        }, 120000);

        // Don't switch turn here - wait for processing to complete
      } else {
        console.log(`[handleSubmit] No prompt to submit for ${player}. player1.prompt="${player1.prompt}", player2.prompt="${player2.prompt}"`);
      }
    },
    [player1, player2, player1Processing, player2Processing, addGameMessage, sendPlayerInput]
  );

  const handleBothEnded = useCallback(async () => {
    console.log('[handleBothEnded] Both players have ended their prompts');
    gameEndedRef.current = true;
    setIsActive(false);

    // Broadcast GAME_END to notify all players (including Player 1 who ended first)
    addGameMessage('System', 'GAME_END Both players have ended their prompts!', 'system');
    addGameMessage('Judge Alpha', 'Both players have ended! Evaluating workspaces...', 'judge');

    await runEvaluation();
  }, [addGameMessage, runEvaluation]);

  const handleEndPrompts = useCallback(
    (player: Player) => {
      if (player === 'player1') {
        setPlayer1((prev) => ({ ...prev, hasEnded: true }));
        addGameMessage(player1.name, 'Has ended their prompts early!', 'player1');

        if (currentTurn === 'player1' && !player2.hasEnded) {
          setCurrentTurn('player2');
          // Broadcast turn switch via Supabase
          addGameMessage('System', `TURN:player2 It's now ${player2.name}'s turn!`, 'system');
        }

        if (player2.hasEnded) {
          handleBothEnded();
        }
      } else {
        setPlayer2((prev) => ({ ...prev, hasEnded: true }));
        addGameMessage(player2.name, 'Has ended their prompts early!', 'player2');

        if (currentTurn === 'player2' && !player1.hasEnded) {
          setCurrentTurn('player1');
          // Broadcast turn switch via Supabase
          addGameMessage('System', `TURN:player1 It's now ${player1.name}'s turn!`, 'system');
        }

        if (player1.hasEnded) {
          handleBothEnded();
        }
      }
    },
    [player1, player2, currentTurn, addGameMessage, handleBothEnded]
  );

  const resetGame = useCallback(() => {
    disconnectPlayer(1);
    disconnectPlayer(2);

    setPlayer1({
      name: 'Player 1',
      prompt: '',
      score: 0,
      isReady: false,
      promptsUsed: 0,
      hasEnded: false,
    });
    setPlayer2({
      name: 'Player 2',
      prompt: '',
      score: 0,
      isReady: false,
      promptsUsed: 0,
      hasEnded: false,
    });
    setGameTimeoutMinutes(20);
    setTimeLeft(20 * 60);
    setIsActive(false);
    setEvaluationResults(null);
    setIsEvaluating(false);
    setWinner(null);
    setCurrentTurn('player1');
    clearSupabaseMessages();
    unsubscribeFromGame();
    currentRoomCodeRef.current = null;
    processedMessageIdsRef.current = new Set();
    gameEndedRef.current = false;
    setPlayer1Console([]);
    setPlayer2Console([]);
    setPlayer1Connected(false);
    setPlayer2Connected(false);
    setPlayer1Processing(false);
    setPlayer2Processing(false);
    setShouldNavigateToResults(false);
    player1SubmittingRef.current = false;
    player2SubmittingRef.current = false;
    gameStartTimeRef.current = 0;
  }, [disconnectPlayer, clearSupabaseMessages, unsubscribeFromGame]);

  // Timer countdown (syncs with game start time to prevent drift)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        // If we have a game start time, calculate remaining based on elapsed
        if (gameStartTimeRef.current > 0) {
          const elapsed = Math.floor((Date.now() - gameStartTimeRef.current) / 1000);
          const remaining = Math.max(0, (gameTimeoutMinutes * 60) - elapsed);
          setTimeLeft(remaining);
        } else {
          // Fallback to local countdown
          setTimeLeft((time) => Math.max(0, time - 1));
        }
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      handleTimeUp();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, handleTimeUp, gameTimeoutMinutes]);

  // Cleanup WebSocket connections on unmount
  useEffect(() => {
    return () => {
      disconnectPlayer(1);
      disconnectPlayer(2);
    };
  }, [disconnectPlayer]);

  return (
    <GameContext.Provider
      value={{
        player1,
        player2,
        currentTurn,
        timeLeft,
        isActive,
        winner,
        gameMessages,
        player1Console,
        player2Console,
        player1Connected,
        player2Connected,
        player1Processing,
        player2Processing,
        evaluationResults,
        isEvaluating,
        shouldNavigateToResults,
        selectedChallenge,
        gameTimeoutMinutes,
        setPlayer1,
        setPlayer2,
        setCurrentTurn,
        setTimeLeft,
        setIsActive,
        setWinner,
        setSelectedChallenge,
        setGameTimeoutMinutes,
        addGameMessage,
        addConsoleLog,
        connectPlayer,
        disconnectPlayer,
        sendPlayerInput,
        handleSubmit,
        handleEndPrompts,
        startDuel,
        handleTimeUp,
        handleEndDuel,
        resetGame,
        setEvaluationResults,
        isSpectator,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
