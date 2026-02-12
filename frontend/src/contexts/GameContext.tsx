import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { config } from '../config';
import { MAX_PROMPTS } from '../gameRules';
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
  connectPlayer: (playerNum: 1 | 2, playerName: string, challenge: number, roomCode?: string, provider?: string, model?: string) => void;
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
  const { user, token } = useAuth();
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
  const lastProcessedIndexRef = useRef<number>(0);
  const gameEndedRef = useRef<boolean>(false);
  // Track which player number this browser controls (set in connectPlayer)
  // Used to prevent Supabase sync from overriding local WebSocket-driven processing state
  const localPlayerNumRef = useRef<1 | 2 | null>(null);

  // Track accumulated penalties (e.g. -10 per duplicate prompt) separately
  // so they survive when evaluatePlayerScore / runEvaluation overwrites scores
  const player1PenaltyRef = useRef<number>(0);
  const player2PenaltyRef = useRef<number>(0);

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
      lastProcessedIndexRef.current = 0;
      subscribeToGame(room.code);
    }
  }, [room?.code, subscribeToGame]);

  // Set game timeout from room settings
  useEffect(() => {
    if (room?.timerMinutes && room.timerMinutes !== gameTimeoutMinutes) {
      console.log('Setting game timeout from room:', room.timerMinutes, 'minutes');
      setGameTimeoutMinutes(room.timerMinutes);
      setTimeLeft(room.timerMinutes * 60);
    }
  }, [room?.timerMinutes]);

  // Listen for turn switch messages from Supabase to sync turn state across browsers
  // IMPORTANT: Process ALL new messages, not just the last one, to avoid missing turn switches
  useEffect(() => {
    if (supabaseMessages.length === 0) return;

    // Only process new messages since last index
    const startIndex = lastProcessedIndexRef.current;
    if (startIndex >= supabaseMessages.length) return;

    // Check new messages for GAME_END
    for (let i = startIndex; i < supabaseMessages.length; i++) {
      const msg = supabaseMessages[i];
      if (msg.type === 'system' && msg.sender === 'System' && msg.text.startsWith('GAME_END')) {
        gameEndedRef.current = true;
        break;
      }
    }

    // Process only new messages
    for (let i = startIndex; i < supabaseMessages.length; i++) {
      const message = supabaseMessages[i];
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

        // Sync "AI is working" messages to set processing state for the REMOTE player only.
        // The local player's processing state is managed by handleSubmit + WebSocket handler
        // to prevent race conditions where Supabase messages override local state.
        if (text.includes('AI is working on')) {
          console.log('[Supabase Sync] AI is working message detected');
          if (text.includes(player1NameRef.current) && localPlayerNumRef.current !== 1) {
            console.log('[Supabase Sync] Setting player1Processing = true (remote sync)');
            setPlayer1Processing(true);
          } else if (text.includes(player2NameRef.current) && localPlayerNumRef.current !== 2) {
            console.log('[Supabase Sync] Setting player2Processing = true (remote sync)');
            setPlayer2Processing(true);
          }
        }

        // Sync processing complete from "AI finished" messages — REMOTE player only.
        // The local player's processing is reset by the WebSocket processing-complete handler.
        if (text.includes('AI finished processing')) {
          console.log('[Supabase Sync] Processing complete message detected');
          if (text.includes(player1NameRef.current) && localPlayerNumRef.current !== 1) {
            console.log('[Supabase Sync] Resetting player1 processing state (remote sync)');
            setPlayer1Processing(false);
          } else if (text.includes(player2NameRef.current) && localPlayerNumRef.current !== 2) {
            console.log('[Supabase Sync] Resetting player2 processing state (remote sync)');
            setPlayer2Processing(false);
          }
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
            console.log('[Supabase Sync] Received results:', gameResults);

            // Merge with existing localStorage results (host has full results, other player gets simplified)
            const existingResults = localStorage.getItem('promptduel_results');
            if (existingResults) {
              try {
                const existing = JSON.parse(existingResults);
                // Keep detailed evaluationResults if we already have them
                if (existing.evaluationResults && !gameResults.evaluationResults) {
                  gameResults.evaluationResults = existing.evaluationResults;
                }
              } catch (e) {
                // Ignore parse errors from existing results
              }
            }

            localStorage.setItem('promptduel_results', JSON.stringify(gameResults));

            // Update local state
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

    // Update the last processed index
    lastProcessedIndexRef.current = supabaseMessages.length;
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

  const MAX_CONSOLE_LINES = 500;

  const addConsoleLog = useCallback((player: Player, log: string) => {
    if (player === 'player1') {
      setPlayer1Console((prev) => {
        const next = [...prev, log];
        return next.length > MAX_CONSOLE_LINES ? next.slice(-MAX_CONSOLE_LINES) : next;
      });
    } else {
      setPlayer2Console((prev) => {
        const next = [...prev, log];
        return next.length > MAX_CONSOLE_LINES ? next.slice(-MAX_CONSOLE_LINES) : next;
      });
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
          // Subtract accumulated penalties (e.g. from duplicate prompts) from the API score
          const penalty = playerNum === 1 ? player1PenaltyRef.current : player2PenaltyRef.current;
          const adjustedScore = result.totalScore - penalty;
          console.log(`[evaluatePlayerScore] API score=${result.totalScore}, penalty=${penalty}, adjusted=${adjustedScore}`);

          if (playerNum === 1) {
            setPlayer1((prev) => ({ ...prev, score: adjustedScore }));
          } else {
            setPlayer2((prev) => ({ ...prev, score: adjustedScore }));
          }

          const setConsole = playerNum === 1 ? setPlayer1Console : setPlayer2Console;
          setConsole((prev) => [
            ...prev,
            `[Score] ${playerName}: ${adjustedScore}/${result.maxScore}${penalty > 0 ? ` (includes -${penalty} penalty)` : ''} - Grade: ${result.grade}`,
          ]);

          // Broadcast score update via Supabase so both players see the score
          const playerKey = playerNum === 1 ? 'player1' : 'player2';
          const promptsUsed = playerNum === 1 ? player1PromptsUsedRef.current : player2PromptsUsedRef.current;
          console.log(`[evaluatePlayerScore] Broadcasting score: ${playerKey}, score=${adjustedScore}, promptsUsed=${promptsUsed}`);
          addGameMessageRef.current(
            'System',
            `SCORE_UPDATE:${playerKey}:${adjustedScore}:${promptsUsed}`,
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
    (playerNum: 1 | 2, playerName: string, challenge: number, roomCode?: string, provider?: string, model?: string) => {
      const wsRef = playerNum === 1 ? player1WsRef : player2WsRef;
      const setConnected = playerNum === 1 ? setPlayer1Connected : setPlayer2Connected;
      const setConsole = playerNum === 1 ? setPlayer1Console : setPlayer2Console;
      const setProcessing = playerNum === 1 ? setPlayer1Processing : setPlayer2Processing;

      // Track which player this browser controls
      localPlayerNumRef.current = playerNum;

      console.log(`[connectPlayer] Player ${playerNum} connecting to room ${roomCode}`);
      console.log(`[connectPlayer] Provider: ${provider}, Model: ${model}`);
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
          setConsole((prev) => [...prev, `[System] Connected to AI Server (${provider || 'anthropic'})`]);

          ws.send(
            JSON.stringify({
              type: 'start-session',
              playerName,
              challenge,
              roomCode, // Pass roomCode to enable spectator broadcasting
              provider: provider || 'anthropic',
              model: model || undefined,
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
              addGameMessageRef.current('System', `AI is working on ${pName}'s prompt...`, 'system');
            } else if (msg.type === 'processing-complete') {
              console.log(`Player ${playerNum} processing complete`);
              console.log(`[processing-complete] msg:`, msg);
              setProcessing(false);
              // Reset the submitting ref and clear the safety timeout
              if (playerNum === 1) {
                player1SubmittingRef.current = false;
                if (player1TimeoutRef.current) {
                  clearTimeout(player1TimeoutRef.current);
                  player1TimeoutRef.current = null;
                }
              } else {
                player2SubmittingRef.current = false;
                if (player2TimeoutRef.current) {
                  clearTimeout(player2TimeoutRef.current);
                  player2TimeoutRef.current = null;
                }
              }
              setConsole((prev) => [...prev, `[System] AI finished processing`]);
              // Broadcast completion to both players
              const pName = playerNum === 1 ? player1NameRef.current : player2NameRef.current;
              addGameMessageRef.current('System', `AI finished processing ${pName}'s prompt`, 'system');

              // Display generation stats in chat
              if (msg.stats) {
                const { elapsedSeconds, codeSize, codeLines, outputTokens, status } = msg.stats;
                const statsText = status === 'success'
                  ? `Generation stats: ${elapsedSeconds}s | ${codeLines} lines | ${codeSize} chars | ${outputTokens} tokens`
                  : status === 'error'
                    ? `Generation failed: ${elapsedSeconds}s elapsed`
                    : `Generation incomplete: ${elapsedSeconds}s elapsed | ${outputTokens} tokens used`;
                addGameMessageRef.current('System', statsText, 'system');
              }

              console.log(`[processing-complete] playerName=${msg.playerName}, challenge=${msg.challenge}`);
              if (msg.playerName && msg.challenge) {
                console.log(`[processing-complete] Calling evaluatePlayerScore for player ${playerNum}`);
                evaluatePlayerScoreRef.current(playerNum, msg.playerName, msg.challenge);
              } else {
                console.log(`[processing-complete] Missing playerName or challenge, not evaluating score`);
              }

              // Switch turn to the other player after processing completes
              // A player can receive turns only if they haven't ended AND still have prompts left
              console.log(`[processing-complete] Checking turn switch: playerNum=${playerNum}, p1HasEnded=${player1HasEndedRef.current}, p2HasEnded=${player2HasEndedRef.current}, p1Prompts=${player1PromptsUsedRef.current}, p2Prompts=${player2PromptsUsedRef.current}`);
              const otherCanPlay = playerNum === 1
                ? (!player2HasEndedRef.current && player2PromptsUsedRef.current < MAX_PROMPTS)
                : (!player1HasEndedRef.current && player1PromptsUsedRef.current < MAX_PROMPTS);

              if (otherCanPlay) {
                if (playerNum === 1) {
                  console.log(`[processing-complete] Switching turn to player2 (${player2NameRef.current})`);
                  setCurrentTurnRef.current('player2');
                  addGameMessageRef.current('System', `TURN:player2 It's now ${player2NameRef.current}'s turn!`, 'system');
                } else {
                  console.log(`[processing-complete] Switching turn to player1 (${player1NameRef.current})`);
                  setCurrentTurnRef.current('player1');
                  addGameMessageRef.current('System', `TURN:player1 It's now ${player1NameRef.current}'s turn!`, 'system');
                }
              } else {
                // Other player can't play — check if both are effectively done
                const p1Done = player1HasEndedRef.current || player1PromptsUsedRef.current >= MAX_PROMPTS;
                const p2Done = player2HasEndedRef.current || player2PromptsUsedRef.current >= MAX_PROMPTS;
                console.log(`[processing-complete] Not switching turn. p1Done=${p1Done}, p2Done=${p2Done}`);
                if (p1Done && p2Done) {
                  console.log('[processing-complete] Both players are done — auto-ending game');
                  handleBothEndedRef.current();
                }
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

        // Fetch penalties from backend (source of truth, survives page refresh)
        let p1Penalty = player1PenaltyRef.current;
        let p2Penalty = player2PenaltyRef.current;
        const roomCode = room?.code || currentRoomCodeRef.current;
        if (roomCode && token) {
          try {
            const penaltyRes = await fetch(`${config.apiUrl}/rooms/${roomCode}`, {
              headers: { 'Authorization': `Bearer ${token}` },
            });
            const penaltyData = await penaltyRes.json();
            if (penaltyData.success && penaltyData.room) {
              const dbP1 = penaltyData.room.player1Penalty || 0;
              const dbP2 = penaltyData.room.player2Penalty || 0;
              // Use whichever is higher (backend or local ref) to avoid missing penalties
              p1Penalty = Math.max(p1Penalty, dbP1);
              p2Penalty = Math.max(p2Penalty, dbP2);
              console.log(`[runEvaluation] Penalties from DB: p1=${dbP1}, p2=${dbP2}. Using max: p1=${p1Penalty}, p2=${p2Penalty}`);
            }
          } catch (err) {
            console.error('[runEvaluation] Failed to fetch penalties from backend, using local refs:', err);
          }
        }

        const p1AdjustedScore = results.player1.totalScore - p1Penalty;
        const p2AdjustedScore = results.player2.totalScore - p2Penalty;
        console.log(`[runEvaluation] Penalties: p1=${p1Penalty}, p2=${p2Penalty}. Adjusted: p1=${p1AdjustedScore}, p2=${p2AdjustedScore}`);

        setPlayer1((prev) => ({ ...prev, score: p1AdjustedScore }));
        setPlayer2((prev) => ({ ...prev, score: p2AdjustedScore }));

        let evalWinner: 'player1' | 'player2' | null;
        let winnerReason = '';

        // If host (player 1) forfeited by ending duel early, player 2 wins
        if (forfeitByHost) {
          evalWinner = 'player2';
          winnerReason = ' by forfeit (host ended duel early)';
        } else {
          // Normal evaluation - compare final scores (with penalties applied)
          const { getFinalScore } = await import('../gameRules');
          const p1Final = getFinalScore(p1AdjustedScore, player1.promptsUsed);
          const p2Final = getFinalScore(p2AdjustedScore, player2.promptsUsed);
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

        // roomCode already resolved above for penalty fetch
        console.log('[runEvaluation] Room code resolution:', { roomFromContext: room?.code, roomFromRef: currentRoomCodeRef.current, resolved: roomCode });

        // Save full results to localStorage for the Results page to read
        const gameResults = {
          player1: {
            name: player1.name,
            score: p1AdjustedScore,
            promptsUsed: player1.promptsUsed,
          },
          player2: {
            name: player2.name,
            score: p2AdjustedScore,
            promptsUsed: player2.promptsUsed,
          },
          winner: evalWinner,
          evaluationResults: results,
          challenge: selectedChallenge,
          roomCode: roomCode,
        };
        console.log('Saving game results to localStorage:', gameResults);
        localStorage.setItem('promptduel_results', JSON.stringify(gameResults));

        // Save full results to backend database so all players/spectators can access
        console.log('[runEvaluation] Checking save conditions:', { roomCode, hasToken: !!token, roomFromContext: room?.code, roomFromRef: currentRoomCodeRef.current });
        if (roomCode && token) {
          try {
            console.log('Saving game results to backend...', { roomCode });
            const saveResponse = await fetch(`${config.apiUrl}/rooms/${roomCode}/results`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                evaluationResults: results,
                player1Score: p1AdjustedScore,
                player2Score: p2AdjustedScore,
                player1PromptsUsed: player1.promptsUsed,
                player2PromptsUsed: player2.promptsUsed,
                winnerId: evalWinner === 'player1' ? room?.player1?.id : evalWinner === 'player2' ? room?.player2?.id : null,
              }),
            });
            const saveResult = await saveResponse.json();
            console.log('Game results save response:', saveResult);
            if (!saveResult.success) {
              console.error('Backend rejected save:', saveResult.error);
            }
          } catch (backendError) {
            console.error('Failed to save results to backend:', backendError);
          }
        } else {
          console.error('[runEvaluation] Cannot save to backend - missing room code or token:', { roomCode, hasToken: !!token, roomFromContext: room?.code, roomFromRef: currentRoomCodeRef.current });
        }

        // Broadcast simplified results via Supabase (without detailed evaluationResults to avoid size limits)
        const simplifiedResults = {
          player1: { name: player1.name, score: p1AdjustedScore, promptsUsed: player1.promptsUsed },
          player2: { name: player2.name, score: p2AdjustedScore, promptsUsed: player2.promptsUsed },
          winner: evalWinner,
          challenge: selectedChallenge,
          roomCode: roomCode,
        };
        addGameMessage(
          'System',
          `RESULTS:${JSON.stringify(simplifiedResults)}`,
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

          // Create adjusted result objects for leaderboard (with penalties applied)
          const p1LeaderboardResult = { ...results.player1, totalScore: p1AdjustedScore };
          const p2LeaderboardResult = { ...results.player2, totalScore: p2AdjustedScore };
          await Promise.all([
            saveToLeaderboard(player1.name, p1LeaderboardResult, player1.promptsUsed),
            saveToLeaderboard(player2.name, p2LeaderboardResult, player2.promptsUsed),
          ]);
          console.log('Leaderboard entries saved successfully');
        } catch (leaderboardError) {
          console.error('Failed to save leaderboard entries:', leaderboardError);
        }

        // Mark the room as finished and navigate to results
        console.log('Calling finishRoom after successful evaluation');
        const finishResult = await finishRoom(roomCode || undefined);
        console.log('finishRoom result:', finishResult);

        // Navigate to results page directly since useEffect might not trigger
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
  }, [player1.name, player1.promptsUsed, player2.name, player2.promptsUsed, selectedChallenge, addGameMessage, finishRoom, room?.code, token]);

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

  // Refs to track processing timeout IDs (cleared when processing-complete arrives)
  const player1TimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const player2TimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track previously submitted prompts to block duplicates (saves API costs)
  const player1PromptHistoryRef = useRef<Set<string>>(new Set());
  const player2PromptHistoryRef = useRef<Set<string>>(new Set());

  // Persist penalty to backend SQLite so it survives page refreshes
  const savePenaltyToBackend = useCallback(async (playerNum: 1 | 2, penalty: number) => {
    const roomCode = currentRoomCodeRef.current || room?.code;
    if (!roomCode || !token) return;
    try {
      await fetch(`${config.apiUrl}/rooms/${roomCode}/penalty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ playerNum, penalty }),
      });
      console.log(`[savePenaltyToBackend] Player${playerNum} penalty=${penalty} saved to backend`);
    } catch (err) {
      console.error('[savePenaltyToBackend] Failed:', err);
    }
  }, [room?.code, token]);

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
        const normalizedPrompt = prompt.toLowerCase().replace(/\s+/g, ' ');
        const isDuplicate = player1PromptHistoryRef.current.has(normalizedPrompt);
        player1PromptHistoryRef.current.add(normalizedPrompt);
        const newPromptsUsed = player1.promptsUsed + 1;

        if (isDuplicate) {
          console.log(`[handleSubmit] Player1 duplicate prompt — wasted turn, -10 penalty`);
          player1PenaltyRef.current += 10;
          savePenaltyToBackend(1, player1PenaltyRef.current);
          const penaltyScore = player1.score - 10;
          setPlayer1((prev) => ({ ...prev, promptsUsed: prev.promptsUsed + 1, prompt: '', score: prev.score - 10 }));
          addGameMessage(player1.name, `Prompt #${newPromptsUsed}: "${prompt}"`, 'player1');
          addGameMessage('Judge Alpha', `Duplicate prompt detected! ${player1.name} loses 10 marks as penalty. Turn wasted — no AI generation.`, 'judge');
          // Broadcast score update
          addGameMessage('System', `SCORE_UPDATE:player1:${penaltyScore}:${newPromptsUsed}`, 'system');

          // Check if both players are effectively done
          const p1Done = player1.hasEnded || newPromptsUsed >= MAX_PROMPTS;
          const p2Done = player2HasEndedRef.current || player2PromptsUsedRef.current >= MAX_PROMPTS;
          if (p1Done && p2Done) {
            handleBothEndedRef.current();
          } else if (!player2HasEndedRef.current && player2PromptsUsedRef.current < MAX_PROMPTS) {
            setCurrentTurn('player2');
            addGameMessage('System', `TURN:player2 It's now ${player2NameRef.current}'s turn!`, 'system');
          }
          player1SubmittingRef.current = false;
          return;
        }

        console.log(`[handleSubmit] Player1 submitting prompt #${newPromptsUsed}`);

        // Set processing FIRST before any other state updates
        setPlayer1Processing(true);

        setPlayer1((prev) => {
          console.log(`[handleSubmit] Player1 promptsUsed: ${prev.promptsUsed} -> ${prev.promptsUsed + 1}`);
          return { ...prev, promptsUsed: prev.promptsUsed + 1, prompt: '' };
        });
        addGameMessage(player1.name, `Prompt #${newPromptsUsed}: "${prompt}"`, 'player1');

        sendPlayerInput(1, prompt + '\n');

        // Safety timeout fallback (5 min) — cleared when processing-complete arrives
        if (player1TimeoutRef.current) clearTimeout(player1TimeoutRef.current);
        player1TimeoutRef.current = setTimeout(() => {
          console.warn('[handleSubmit] Player1 processing timeout (5 min) — force unlocking');
          setPlayer1Processing(false);
          player1SubmittingRef.current = false;
          player1TimeoutRef.current = null;
        }, 300000);

        // Don't switch turn here - wait for processing to complete
      } else if (player === 'player2' && player2.prompt.trim()) {
        // Prevent double-submit: check if already submitting or processing
        if (player2SubmittingRef.current || player2Processing) {
          console.log(`[handleSubmit] Player2 already submitting or processing, ignoring duplicate submit`);
          return;
        }
        player2SubmittingRef.current = true;

        const prompt = player2.prompt.trim();
        const normalizedPrompt = prompt.toLowerCase().replace(/\s+/g, ' ');
        const isDuplicate = player2PromptHistoryRef.current.has(normalizedPrompt);
        player2PromptHistoryRef.current.add(normalizedPrompt);
        const newPromptsUsed = player2.promptsUsed + 1;

        if (isDuplicate) {
          console.log(`[handleSubmit] Player2 duplicate prompt — wasted turn, -10 penalty`);
          player2PenaltyRef.current += 10;
          savePenaltyToBackend(2, player2PenaltyRef.current);
          const penaltyScore = player2.score - 10;
          setPlayer2((prev) => ({ ...prev, promptsUsed: prev.promptsUsed + 1, prompt: '', score: prev.score - 10 }));
          addGameMessage(player2.name, `Prompt #${newPromptsUsed}: "${prompt}"`, 'player2');
          addGameMessage('Judge Alpha', `Duplicate prompt detected! ${player2.name} loses 10 marks as penalty. Turn wasted — no AI generation.`, 'judge');
          // Broadcast score update
          addGameMessage('System', `SCORE_UPDATE:player2:${penaltyScore}:${newPromptsUsed}`, 'system');

          // Check if both players are effectively done
          const p2Done = player2.hasEnded || newPromptsUsed >= MAX_PROMPTS;
          const p1Done = player1HasEndedRef.current || player1PromptsUsedRef.current >= MAX_PROMPTS;
          if (p1Done && p2Done) {
            handleBothEndedRef.current();
          } else if (!player1HasEndedRef.current && player1PromptsUsedRef.current < MAX_PROMPTS) {
            setCurrentTurn('player1');
            addGameMessage('System', `TURN:player1 It's now ${player1NameRef.current}'s turn!`, 'system');
          }
          player2SubmittingRef.current = false;
          return;
        }

        console.log(`[handleSubmit] Player2 submitting prompt #${newPromptsUsed}`);

        // Set processing FIRST before any other state updates
        setPlayer2Processing(true);

        setPlayer2((prev) => {
          console.log(`[handleSubmit] Player2 promptsUsed: ${prev.promptsUsed} -> ${prev.promptsUsed + 1}`);
          return { ...prev, promptsUsed: prev.promptsUsed + 1, prompt: '' };
        });
        addGameMessage(player2.name, `Prompt #${newPromptsUsed}: "${prompt}"`, 'player2');

        sendPlayerInput(2, prompt + '\n');

        // Safety timeout fallback (5 min) — cleared when processing-complete arrives
        if (player2TimeoutRef.current) clearTimeout(player2TimeoutRef.current);
        player2TimeoutRef.current = setTimeout(() => {
          console.warn('[handleSubmit] Player2 processing timeout (5 min) — force unlocking');
          setPlayer2Processing(false);
          player2SubmittingRef.current = false;
          player2TimeoutRef.current = null;
        }, 300000);

        // Don't switch turn here - wait for processing to complete
      } else {
        console.log(`[handleSubmit] No prompt to submit for ${player}. player1.prompt="${player1.prompt}", player2.prompt="${player2.prompt}"`);
      }
    },
    [player1, player2, player1Processing, player2Processing, addGameMessage, sendPlayerInput]
  );

  const handleBothEnded = useCallback(async () => {
    console.log('[handleBothEnded] Both players are done — triggering evaluation');
    if (gameEndedRef.current) {
      console.log('[handleBothEnded] Game already ended, skipping');
      return;
    }
    gameEndedRef.current = true;
    setIsActive(false);

    // Broadcast GAME_END to notify all players
    addGameMessage('System', 'GAME_END Both players have finished!', 'system');
    addGameMessage('Judge Alpha', 'Both players are done! Evaluating workspaces...', 'judge');

    await runEvaluation();
  }, [addGameMessage, runEvaluation]);

  const handleBothEndedRef = useRef(handleBothEnded);
  useEffect(() => {
    handleBothEndedRef.current = handleBothEnded;
  }, [handleBothEnded]);

  const handleEndPrompts = useCallback(
    (player: Player) => {
      if (player === 'player1') {
        setPlayer1((prev) => ({ ...prev, hasEnded: true }));
        addGameMessage(player1.name, 'Has ended their prompts early!', 'player1');

        if (currentTurn === 'player1' && !player2.hasEnded && player2.promptsUsed < MAX_PROMPTS) {
          setCurrentTurn('player2');
          // Broadcast turn switch via Supabase
          addGameMessage('System', `TURN:player2 It's now ${player2.name}'s turn!`, 'system');
        }

        if (player2.hasEnded || player2.promptsUsed >= MAX_PROMPTS) {
          handleBothEnded();
        }
      } else {
        setPlayer2((prev) => ({ ...prev, hasEnded: true }));
        addGameMessage(player2.name, 'Has ended their prompts early!', 'player2');

        if (currentTurn === 'player2' && !player1.hasEnded && player1.promptsUsed < MAX_PROMPTS) {
          setCurrentTurn('player1');
          // Broadcast turn switch via Supabase
          addGameMessage('System', `TURN:player1 It's now ${player1.name}'s turn!`, 'system');
        }

        if (player1.hasEnded || player1.promptsUsed >= MAX_PROMPTS) {
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
    lastProcessedIndexRef.current = 0;
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
    player1PromptHistoryRef.current = new Set();
    player2PromptHistoryRef.current = new Set();
    player1PenaltyRef.current = 0;
    player2PenaltyRef.current = 0;
    gameStartTimeRef.current = 0;
    localPlayerNumRef.current = null;
  }, [disconnectPlayer, clearSupabaseMessages, unsubscribeFromGame]);

  // Timer countdown (syncs with game start time to prevent drift)
  // Uses a ref to avoid recreating the interval every second
  const timeLeftRef = useRef(timeLeft);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
  const handleTimeUpRef = useRef(handleTimeUp);
  useEffect(() => { handleTimeUpRef.current = handleTimeUp; }, [handleTimeUp]);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      // If we have a game start time, calculate remaining based on elapsed
      if (gameStartTimeRef.current > 0) {
        const elapsed = Math.floor((Date.now() - gameStartTimeRef.current) / 1000);
        const remaining = Math.max(0, (gameTimeoutMinutes * 60) - elapsed);
        setTimeLeft(remaining);
        if (remaining === 0) {
          handleTimeUpRef.current();
        }
      } else {
        // Fallback to local countdown
        setTimeLeft((time) => {
          const next = Math.max(0, time - 1);
          if (next === 0) {
            handleTimeUpRef.current();
          }
          return next;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, gameTimeoutMinutes]);

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
