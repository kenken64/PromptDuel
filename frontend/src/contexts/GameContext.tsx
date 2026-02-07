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
  const { room, role } = useRoom();
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

  const isSpectator = role === 'spectator';

  // Use Supabase messages as game messages
  const gameMessages = supabaseMessages;

  // Subscribe to game messages when room code is available
  useEffect(() => {
    if (room?.code && room.code !== currentRoomCodeRef.current) {
      console.log('Subscribing to game messages for room:', room.code);
      currentRoomCodeRef.current = room.code;
      subscribeToGame(room.code);
    }
  }, [room?.code, subscribeToGame]);

  // Listen for turn switch messages from Supabase to sync turn state across browsers
  useEffect(() => {
    if (supabaseMessages.length === 0) return;

    const lastMessage = supabaseMessages[supabaseMessages.length - 1];
    console.log('[Supabase Sync] Last message:', lastMessage);

    // Check if this is a turn switch message
    if (lastMessage.type === 'system' && lastMessage.sender === 'System') {
      const text = lastMessage.text;
      console.log('[Supabase Sync] System message:', text);

      // Detect "It's now {player}'s turn!" messages
      if (text.includes("'s turn!")) {
        // Extract player name and determine which turn it is
        if (text.includes(player1.name) && text.includes("It's now")) {
          if (currentTurn !== 'player1') {
            console.log('Syncing turn to player1 from Supabase message');
            setCurrentTurn('player1');
          }
        } else if (text.includes(player2.name) && text.includes("It's now")) {
          if (currentTurn !== 'player2') {
            console.log('Syncing turn to player2 from Supabase message');
            setCurrentTurn('player2');
          }
        }
      }

      // Also sync processing state from "Claude is working" messages
      if (text.includes('Claude is working on')) {
        if (text.includes(player1.name)) {
          setPlayer1Processing(true);
        } else if (text.includes(player2.name)) {
          setPlayer2Processing(true);
        }
      }

      // Sync processing complete from "Claude finished" messages
      if (text.includes('Claude finished processing')) {
        if (text.includes(player1.name)) {
          setPlayer1Processing(false);
        } else if (text.includes(player2.name)) {
          setPlayer2Processing(false);
        }
      }
    }

    // Sync isActive from judge "Challenge begins" message
    if (lastMessage.type === 'judge' && lastMessage.sender === 'Judge Alpha') {
      if (lastMessage.text.includes('Challenge') && lastMessage.text.includes('begins!')) {
        if (!isActive) {
          console.log('Syncing isActive=true from Judge message');
          setIsActive(true);
          // Also reset isReady for both players when game starts
          setPlayer1((prev) => ({ ...prev, isReady: false, prompt: '' }));
          setPlayer2((prev) => ({ ...prev, isReady: false, prompt: '' }));
        }
      }
    }

    // Sync promptsUsed from prompt submission messages (e.g., "Prompt #3: ...")
    if ((lastMessage.type === 'player1' || lastMessage.type === 'player2')) {
      const promptMatch = lastMessage.text.match(/Prompt #(\d+):/);
      if (promptMatch) {
        const promptNum = parseInt(promptMatch[1], 10);
        if (lastMessage.type === 'player1') {
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
      if (lastMessage.text.includes('Has ended their prompts early!')) {
        if (lastMessage.type === 'player1') {
          setPlayer1((prev) => ({ ...prev, hasEnded: true }));
        } else {
          setPlayer2((prev) => ({ ...prev, hasEnded: true }));
        }
      }
    }
  }, [supabaseMessages, player1.name, player2.name, currentTurn, isActive]);

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

  useEffect(() => {
    player1NameRef.current = player1.name;
    player2NameRef.current = player2.name;
    player1HasEndedRef.current = player1.hasEnded;
    player2HasEndedRef.current = player2.hasEnded;
  }, [player1.name, player2.name, player1.hasEnded, player2.hasEnded]);

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

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log(`Player ${playerNum} already connected`);
        return;
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
              setProcessing(false);
              setConsole((prev) => [...prev, `[System] Claude finished processing`]);
              // Broadcast completion to both players
              const pName = playerNum === 1 ? player1NameRef.current : player2NameRef.current;
              addGameMessageRef.current('System', `Claude finished processing ${pName}'s prompt`, 'system');

              if (msg.playerName && msg.challenge) {
                evaluatePlayerScoreRef.current(playerNum, msg.playerName, msg.challenge);
              }

              // Switch turn to the other player after processing completes
              if (playerNum === 1 && !player2HasEndedRef.current) {
                setCurrentTurnRef.current('player2');
                addGameMessageRef.current('System', `It's now ${player2NameRef.current}'s turn!`, 'system');
              } else if (playerNum === 2 && !player1HasEndedRef.current) {
                setCurrentTurnRef.current('player1');
                addGameMessageRef.current('System', `It's now ${player1NameRef.current}'s turn!`, 'system');
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
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'input', data: input }));
    }
  }, []);

  const startDuel = useCallback(() => {
    setIsActive(true);
    setTimeLeft(gameTimeoutMinutes * 60);
    setPlayer1((prev) => ({ ...prev, isReady: false, prompt: '' }));
    setPlayer2((prev) => ({ ...prev, isReady: false, prompt: '' }));
    addGameMessage(
      'Judge Alpha',
      `Challenge ${selectedChallenge} begins! You have ${gameTimeoutMinutes} minutes. Good luck!`,
      'judge'
    );
  }, [gameTimeoutMinutes, selectedChallenge, addGameMessage]);

  const runEvaluation = useCallback(async () => {
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

        // Import game rules for final score calculation
        const { getFinalScore } = await import('../gameRules');
        const p1Final = getFinalScore(results.player1.totalScore, player1.promptsUsed);
        const p2Final = getFinalScore(results.player2.totalScore, player2.promptsUsed);
        const evalWinner =
          p1Final > p2Final ? ('player1' as const) : p2Final > p1Final ? ('player2' as const) : null;
        setWinner(evalWinner);
        const winnerName =
          evalWinner === 'player1'
            ? player1.name
            : evalWinner === 'player2'
              ? player2.name
              : null;
        addGameMessage(
          'Judge Alpha',
          `Evaluation complete! ${winnerName ? `${winnerName} wins!` : "It's a tie!"}`,
          'judge'
        );
      } else {
        addGameMessage('Judge Alpha', 'Evaluation failed. Please check the workspaces.', 'judge');
      }
    } catch (error) {
      console.error('Evaluation error:', error);
      addGameMessage('Judge Alpha', 'Could not connect to evaluation server.', 'judge');
    }
    setIsEvaluating(false);
  }, [player1.name, player1.promptsUsed, player2.name, player2.promptsUsed, selectedChallenge, addGameMessage]);

  const handleTimeUp = useCallback(() => {
    setIsActive(false);
    addGameMessage('Judge Alpha', 'Time is up! Evaluating both workspaces...', 'judge');
    runEvaluation();
  }, [addGameMessage, runEvaluation]);

  const handleEndDuel = useCallback(async () => {
    setIsActive(false);
    addGameMessage('Judge Alpha', 'Duel ended! Evaluating both workspaces...', 'judge');
    await runEvaluation();
  }, [addGameMessage, runEvaluation]);

  const handleSubmit = useCallback(
    (player: Player) => {
      if (player === 'player1' && player1.prompt.trim()) {
        const prompt = player1.prompt.trim();
        const newPromptsUsed = player1.promptsUsed + 1;
        console.log(`[handleSubmit] Player1 submitting prompt #${newPromptsUsed}`);

        setPlayer1((prev) => {
          console.log(`[handleSubmit] Player1 promptsUsed: ${prev.promptsUsed} -> ${prev.promptsUsed + 1}`);
          return { ...prev, promptsUsed: prev.promptsUsed + 1, prompt: '' };
        });
        addGameMessage(player1.name, `Prompt #${newPromptsUsed}: "${prompt}"`, 'player1');

        setPlayer1Processing(true);
        sendPlayerInput(1, prompt + '\n');

        // Timeout fallback - turn switches after processing completes
        setTimeout(() => setPlayer1Processing(false), 120000);

        // Don't switch turn here - wait for processing to complete
      } else if (player === 'player2' && player2.prompt.trim()) {
        const prompt = player2.prompt.trim();
        const newPromptsUsed = player2.promptsUsed + 1;
        console.log(`[handleSubmit] Player2 submitting prompt #${newPromptsUsed}`);

        setPlayer2((prev) => {
          console.log(`[handleSubmit] Player2 promptsUsed: ${prev.promptsUsed} -> ${prev.promptsUsed + 1}`);
          return { ...prev, promptsUsed: prev.promptsUsed + 1, prompt: '' };
        });
        addGameMessage(player2.name, `Prompt #${newPromptsUsed}: "${prompt}"`, 'player2');

        setPlayer2Processing(true);
        sendPlayerInput(2, prompt + '\n');

        // Timeout fallback - turn switches after processing completes
        setTimeout(() => setPlayer2Processing(false), 120000);

        // Don't switch turn here - wait for processing to complete
      } else {
        console.log(`[handleSubmit] No prompt to submit for ${player}. player1.prompt="${player1.prompt}", player2.prompt="${player2.prompt}"`);
      }
    },
    [player1, player2, addGameMessage, sendPlayerInput]
  );

  const handleBothEnded = useCallback(async () => {
    setIsActive(false);
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
        }

        if (player2.hasEnded) {
          handleBothEnded();
        }
      } else {
        setPlayer2((prev) => ({ ...prev, hasEnded: true }));
        addGameMessage(player2.name, 'Has ended their prompts early!', 'player2');

        if (currentTurn === 'player2' && !player1.hasEnded) {
          setCurrentTurn('player1');
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
    setPlayer1Console([]);
    setPlayer2Console([]);
    setPlayer1Connected(false);
    setPlayer2Connected(false);
    setPlayer1Processing(false);
    setPlayer2Processing(false);
  }, [disconnectPlayer, clearSupabaseMessages, unsubscribeFromGame]);

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      handleTimeUp();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, handleTimeUp]);

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
