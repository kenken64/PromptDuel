import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { config } from '../config';
import { useAuth } from './AuthContext';
import { useRoom } from './RoomContext';

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
  type: 'player1' | 'player2' | 'judge';
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
  addGameMessage: (sender: string, text: string, type: 'player1' | 'player2' | 'judge') => void;
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
  const [gameMessages, setGameMessages] = useState<Message[]>([]);
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
  const evaluatePlayerScoreRef = useRef<
    (playerNum: 1 | 2, playerName: string, challenge: number) => void
  >(() => {});

  const isSpectator = role === 'spectator';

  const addGameMessage = useCallback(
    (sender: string, text: string, type: 'player1' | 'player2' | 'judge') => {
      const newMessage: Message = {
        sender,
        text,
        timestamp: Date.now(),
        type,
      };
      setGameMessages((prev) => [...prev, newMessage]);
    },
    []
  );

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
            } else if (msg.type === 'processing-complete') {
              console.log(`Player ${playerNum} processing complete`);
              setProcessing(false);
              setConsole((prev) => [...prev, `[System] Claude finished processing`]);

              if (msg.playerName && msg.challenge) {
                evaluatePlayerScoreRef.current(playerNum, msg.playerName, msg.challenge);
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
        setPlayer1((prev) => ({ ...prev, promptsUsed: prev.promptsUsed + 1, prompt: '' }));
        addGameMessage(player1.name, `Prompt #${player1.promptsUsed + 1}: "${prompt}"`, 'player1');

        setPlayer1Processing(true);
        sendPlayerInput(1, prompt + '\n');

        setTimeout(() => setPlayer1Processing(false), 120000);

        if (!player2.hasEnded) {
          setPlayer2((prev) => ({ ...prev, isReady: false }));
          setCurrentTurn('player2');
        }
      } else if (player === 'player2' && player2.prompt.trim()) {
        const prompt = player2.prompt.trim();
        setPlayer2((prev) => ({ ...prev, promptsUsed: prev.promptsUsed + 1, prompt: '' }));
        addGameMessage(player2.name, `Prompt #${player2.promptsUsed + 1}: "${prompt}"`, 'player2');

        setPlayer2Processing(true);
        sendPlayerInput(2, prompt + '\n');

        setTimeout(() => setPlayer2Processing(false), 120000);

        if (!player1.hasEnded) {
          setPlayer1((prev) => ({ ...prev, isReady: false }));
          setCurrentTurn('player1');
        }
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
    setGameMessages([]);
    setPlayer1Console([]);
    setPlayer2Console([]);
    setPlayer1Connected(false);
    setPlayer2Connected(false);
    setPlayer1Processing(false);
    setPlayer2Processing(false);
  }, [disconnectPlayer]);

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
