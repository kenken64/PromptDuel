import { useState, useEffect, useRef, useCallback } from 'react';
import { UnifiedPromptArea } from './components/UnifiedPromptArea';
import { Timer } from './components/Timer';
import { DuelResults } from './components/DuelResults';
import { CombinedChat } from './components/CombinedChat';
import { InfoTabs } from './components/InfoTabs';
import { LandingPage } from './components/LandingPage';
import { GroupSetup } from './components/GroupSetup';
import { getFinalScore, getMultiplier } from './gameRules';

type Player = 'player1' | 'player2';
type AppScreen = 'landing' | 'group-setup' | 'game' | 'results';

const CLAUDE_CODE_SERVER_URL = 'ws://localhost:3001';

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

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('landing');
  const [selectedChallenge, setSelectedChallenge] = useState<1 | 2>(1);
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
  const [gameTimeoutMinutes, setGameTimeoutMinutes] = useState(20);
  const [timeLeft, setTimeLeft] = useState(20 * 60); // 20 minutes in seconds
  const [isActive, setIsActive] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [player1Console, setPlayer1Console] = useState<string[]>([]);
  const [player2Console, setPlayer2Console] = useState<string[]>([]);
  const [player1Connected, setPlayer1Connected] = useState(false);
  const [player2Connected, setPlayer2Connected] = useState(false);
  const [evaluationResults, setEvaluationResults] = useState<any>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [player1Processing, setPlayer1Processing] = useState(false);
  const [player2Processing, setPlayer2Processing] = useState(false);

  // WebSocket refs for both players
  const player1WsRef = useRef<WebSocket | null>(null);
  const player2WsRef = useRef<WebSocket | null>(null);

  // Ref to hold the evaluation function (so it's accessible in WebSocket callbacks)
  const evaluatePlayerScoreRef = useRef<(playerNum: 1 | 2, playerName: string, challenge: number) => void>(() => {});

  // Connect player to Claude Code Server
  const connectPlayer = useCallback((playerNum: 1 | 2, playerName: string, challenge: number) => {
    const wsRef = playerNum === 1 ? player1WsRef : player2WsRef;
    const setConnected = playerNum === 1 ? setPlayer1Connected : setPlayer2Connected;
    const setConsole = playerNum === 1 ? setPlayer1Console : setPlayer2Console;
    const setProcessing = playerNum === 1 ? setPlayer1Processing : setPlayer2Processing;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log(`Player ${playerNum} already connected`);
      return;
    }

    try {
      const ws = new WebSocket(CLAUDE_CODE_SERVER_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log(`Player ${playerNum} (${playerName}) WebSocket connected`);
        setConnected(true);
        setConsole(prev => [...prev, `[System] Connected to Claude Code Server`]);

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
            // Parse ANSI and add to console
            setConsole(prev => [...prev, msg.data]);
          } else if (msg.type === 'session-started') {
            setConsole(prev => [...prev, `[System] Session started in workspace: ${msg.workspace}`]);
          } else if (msg.type === 'processing-started') {
            // Server confirmed processing started
            console.log(`Player ${playerNum} processing started`);
            setProcessing(true);
          } else if (msg.type === 'processing-complete') {
            // Server confirmed Claude command completed
            console.log(`Player ${playerNum} processing complete`);
            setProcessing(false);
            setConsole(prev => [...prev, `[System] Claude finished processing`]);

            // Evaluate the player's workspace and update score
            if (msg.playerName && msg.challenge) {
              evaluatePlayerScoreRef.current(playerNum, msg.playerName, msg.challenge);
            }
          } else if (msg.type === 'exit') {
            setConsole(prev => [...prev, `[System] Session exited with code: ${msg.exitCode}`]);
            setProcessing(false);
          } else if (msg.type === 'error') {
            setConsole(prev => [...prev, `[Error] ${msg.message}`]);
            setProcessing(false);
          }
        } catch (e) {
          console.error('Error parsing message:', e);
        }
      };

      ws.onclose = () => {
        console.log(`Player ${playerNum} WebSocket disconnected`);
        setConnected(false);
        setConsole(prev => [...prev, `[System] Disconnected from server`]);
        wsRef.current = null;
      };

      ws.onerror = (error) => {
        console.error(`Player ${playerNum} WebSocket error:`, error);
        setConsole(prev => [...prev, `[Error] Connection failed`]);
      };
    } catch (error) {
      console.error('Failed to connect:', error);
      setConsole(prev => [...prev, `[Error] Failed to connect to server`]);
    }
  }, []);

  // Disconnect player from Claude Code Server
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

  // Send input to player's Claude Code session
  const sendPlayerInput = useCallback((playerNum: 1 | 2, input: string) => {
    const wsRef = playerNum === 1 ? player1WsRef : player2WsRef;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'input', data: input }));
    }
  }, []);

  // Evaluate a single player's workspace and update their score
  const evaluatePlayerScore = useCallback(async (playerNum: 1 | 2, playerName: string, challenge: number) => {
    try {
      const response = await fetch('http://localhost:3000/evaluate-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName, challenge }),
      });

      const result = await response.json();

      if (result.success) {
        // Update the player's score
        if (playerNum === 1) {
          setPlayer1((prev) => ({ ...prev, score: result.totalScore }));
        } else {
          setPlayer2((prev) => ({ ...prev, score: result.totalScore }));
        }

        // Add score update to console
        const setConsole = playerNum === 1 ? setPlayer1Console : setPlayer2Console;
        setConsole(prev => [...prev, `[Score] ${playerName}: ${result.totalScore}/${result.maxScore} (${result.percentage}%) - Grade: ${result.grade}`]);
      }
    } catch (error) {
      console.error('Failed to evaluate player:', error);
    }
  }, []);

  // Keep the ref updated with the latest function
  useEffect(() => {
    evaluatePlayerScoreRef.current = evaluatePlayerScore;
  }, [evaluatePlayerScore]);

  const handleChallengeSelect = (challenge: 1 | 2) => {
    setSelectedChallenge(challenge);
    setCurrentScreen('group-setup');
  };

  const handleGroupSetup = (p1Name: string, p2Name: string, timeoutMinutes: number) => {
    setPlayer1((prev) => ({ ...prev, name: p1Name }));
    setPlayer2((prev) => ({ ...prev, name: p2Name }));
    setGameTimeoutMinutes(timeoutMinutes);
    setTimeLeft(timeoutMinutes * 60);
    setCurrentScreen('game');

    // Connect both players to Claude Code Server
    setTimeout(() => {
      connectPlayer(1, p1Name, selectedChallenge);
      connectPlayer(2, p2Name, selectedChallenge);
    }, 100);
  };

  const handleBackToLanding = () => {
    setCurrentScreen('landing');
  };

  const startDuel = () => {
    setIsActive(true);
    setTimeLeft(gameTimeoutMinutes * 60);
    setPlayer1({ ...player1, isReady: false, prompt: '' });
    setPlayer2({ ...player2, isReady: false, prompt: '' });
    addMessage(
      'Judge Alpha',
      `Challenge ${selectedChallenge} begins! You have ${gameTimeoutMinutes} minutes. Good luck!`,
      'judge',
    );
  };

  const handleTimeUp = () => {
    setIsActive(false);
    addMessage('Judge Alpha', 'Time is up! Evaluating both workspaces...', 'judge');
    runEvaluation();
  };

  const handlePromptChange = (player: Player, prompt: string) => {
    if (player === 'player1') {
      setPlayer1({ ...player1, prompt });
    } else {
      setPlayer2({ ...player2, prompt });
    }
  };

  const handleSubmit = (player: Player) => {
    if (player === 'player1' && player1.prompt.trim()) {
      const prompt = player1.prompt.trim();
      setPlayer1({ ...player1, promptsUsed: player1.promptsUsed + 1, prompt: '' });
      // Show the actual prompt in chat
      addMessage(player1.name, `Prompt #${player1.promptsUsed + 1}: "${prompt}"`, 'player1');

      // Set processing state immediately for responsive UI (server will confirm)
      setPlayer1Processing(true);
      sendPlayerInput(1, prompt + '\n');

      // Safety timeout - clear processing after 2 minutes max (Claude might take a while)
      setTimeout(() => setPlayer1Processing(false), 120000);

      // Switch to player 2's turn (reset player2's isReady for their turn)
      // If player2 has ended, skip to check if game should end
      if (player2.hasEnded) {
        // Player 2 already ended, player 1 continues
      } else {
        setPlayer2((prev) => ({ ...prev, isReady: false }));
        setCurrentTurn('player2');
      }
    } else if (player === 'player2' && player2.prompt.trim()) {
      const prompt = player2.prompt.trim();
      setPlayer2({ ...player2, promptsUsed: player2.promptsUsed + 1, prompt: '' });
      // Show the actual prompt in chat
      addMessage(player2.name, `Prompt #${player2.promptsUsed + 1}: "${prompt}"`, 'player2');

      // Set processing state immediately for responsive UI (server will confirm)
      setPlayer2Processing(true);
      sendPlayerInput(2, prompt + '\n');

      // Safety timeout - clear processing after 2 minutes max (Claude might take a while)
      setTimeout(() => setPlayer2Processing(false), 120000);

      // Switch to player 1's turn (reset player1's isReady for their turn)
      // If player1 has ended, skip to check if game should end
      if (player1.hasEnded) {
        // Player 1 already ended, player 2 continues
      } else {
        setPlayer1((prev) => ({ ...prev, isReady: false }));
        setCurrentTurn('player1');
      }
    }
  };

  const handleEndPrompts = (player: Player) => {
    if (player === 'player1') {
      setPlayer1((prev) => ({ ...prev, hasEnded: true }));
      addMessage(player1.name, 'Has ended their prompts early!', 'player1');

      // If it was player1's turn, switch to player2
      if (currentTurn === 'player1' && !player2.hasEnded) {
        setCurrentTurn('player2');
      }

      // Check if both players have ended
      if (player2.hasEnded) {
        handleBothEnded();
      }
    } else {
      setPlayer2((prev) => ({ ...prev, hasEnded: true }));
      addMessage(player2.name, 'Has ended their prompts early!', 'player2');

      // If it was player2's turn, switch to player1
      if (currentTurn === 'player2' && !player1.hasEnded) {
        setCurrentTurn('player1');
      }

      // Check if both players have ended
      if (player1.hasEnded) {
        handleBothEnded();
      }
    }
  };

  const handleBothEnded = async () => {
    setIsActive(false);
    addMessage('Judge Alpha', 'Both players have ended! Evaluating workspaces...', 'judge');
    await runEvaluation();
  };

  const handleEndDuel = async () => {
    setIsActive(false);
    addMessage('Judge Alpha', 'Duel ended! Evaluating both workspaces...', 'judge');
    await runEvaluation();
  };

  const runEvaluation = async () => {
    setIsEvaluating(true);
    try {
      const response = await fetch('http://localhost:3000/evaluate', {
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
        // Update raw scores based on evaluation
        setPlayer1((prev) => ({ ...prev, score: results.player1.totalScore }));
        setPlayer2((prev) => ({ ...prev, score: results.player2.totalScore }));
        // Determine winner using final scores (raw × multiplier)
        const p1Final = getFinalScore(results.player1.totalScore, player1.promptsUsed);
        const p2Final = getFinalScore(results.player2.totalScore, player2.promptsUsed);
        const evalWinner = p1Final > p2Final ? 'player1' as const :
                           p2Final > p1Final ? 'player2' as const : null;
        setWinner(evalWinner);
        const winnerName = evalWinner === 'player1' ? player1.name : evalWinner === 'player2' ? player2.name : null;
        addMessage('Judge Alpha', `Evaluation complete! ${winnerName ? `${winnerName} wins!` : "It's a tie!"}`, 'judge');
      } else {
        addMessage('Judge Alpha', 'Evaluation failed. Please check the workspaces.', 'judge');
        const p1Final = getFinalScore(player1.score, player1.promptsUsed);
        const p2Final = getFinalScore(player2.score, player2.promptsUsed);
        const finalWinner = p1Final > p2Final ? 'player1' :
                            p2Final > p1Final ? 'player2' : null;
        setWinner(finalWinner);
      }
    } catch (error) {
      console.error('Evaluation error:', error);
      addMessage('Judge Alpha', 'Could not connect to evaluation server.', 'judge');
      const p1Final = getFinalScore(player1.score, player1.promptsUsed);
      const p2Final = getFinalScore(player2.score, player2.promptsUsed);
      const finalWinner = p1Final > p2Final ? 'player1' :
                          p2Final > p1Final ? 'player2' : null;
      setWinner(finalWinner);
    }
    setIsEvaluating(false);
    setCurrentScreen('results');
  };

  const addMessage = (sender: string, text: string, type: 'player1' | 'player2' | 'judge') => {
    const newMessage: Message = {
      sender,
      text,
      timestamp: Date.now(),
      type,
    };
    setChatMessages((prev) => [...prev, newMessage]);
  };

  const addConsoleLog = (player: 'player1' | 'player2', log: string) => {
    if (player === 'player1') {
      setPlayer1Console((prev) => [...prev, log]);
    } else {
      setPlayer2Console((prev) => [...prev, log]);
    }
  };

  const resetGame = () => {
    // Disconnect both players from Claude Code Server
    disconnectPlayer(1);
    disconnectPlayer(2);

    setPlayer1({ name: 'Player 1', prompt: '', score: 0, isReady: false, promptsUsed: 0, hasEnded: false });
    setPlayer2({ name: 'Player 2', prompt: '', score: 0, isReady: false, promptsUsed: 0, hasEnded: false });
    setGameTimeoutMinutes(20);
    setTimeLeft(20 * 60);
    setIsActive(false);
    setEvaluationResults(null);
    setIsEvaluating(false);
    setCurrentScreen('landing');
    setWinner(null);
    setCurrentTurn('player1');
    setChatMessages([]);
    setPlayer1Console([]);
    setPlayer2Console([]);
    setPlayer1Connected(false);
    setPlayer2Connected(false);
    setPlayer1Processing(false);
    setPlayer2Processing(false);
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, timeLeft]);

  // Warn user before leaving/refreshing during an active game
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentScreen === 'game' || currentScreen === 'group-setup') {
        e.preventDefault();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentScreen]);

  // Cleanup WebSocket connections on unmount
  useEffect(() => {
    return () => {
      disconnectPlayer(1);
      disconnectPlayer(2);
    };
  }, [disconnectPlayer]);

  if (currentScreen === 'landing') {
    return <LandingPage onSelectChallenge={handleChallengeSelect} />;
  }

  if (currentScreen === 'group-setup') {
    return (
      <GroupSetup
        challenge={selectedChallenge}
        onSetupComplete={handleGroupSetup}
        onBack={handleBackToLanding}
      />
    );
  }

  if (currentScreen === 'results') {
    return (
      <DuelResults
        player1={player1}
        player2={player2}
        winner={winner}
        onPlayAgain={resetGame}
        evaluationResults={evaluationResults}
        challenge={selectedChallenge}
      />
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#212529', color: '#fff' }}>
      {/* Header */}
      <div
        style={{ backgroundColor: '#000', padding: '1rem 0', borderBottom: '4px solid #92cc41' }}
      >
        <div className="container mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <i className="nes-icon trophy is-medium sm:is-large"></i>
              <div>
                <h1 style={{ fontSize: 'clamp(0.8rem, 4vw, 1.5rem)', lineHeight: '1.8rem' }}>
                  Prompt Duel
                </h1>
                <p style={{ fontSize: 'clamp(0.4rem, 1.5vw, 0.6rem)', color: '#92cc41' }}>
                  Challenge {selectedChallenge}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-6 flex-wrap">
              <Timer timeLeft={timeLeft} isActive={isActive} />
              {player1Connected && player2Connected && (
                <div className="nes-badge">
                  <span className="is-success" style={{ fontSize: 'clamp(0.4rem, 1.5vw, 0.6rem)' }}>
                    CONNECTED
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={resetGame}
              className="nes-btn is-error"
              type="button"
              style={{ fontSize: 'clamp(0.5rem, 2vw, 0.8rem)', padding: '0.5rem 1rem' }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Main Battle Area */}
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {!isActive && timeLeft === gameTimeoutMinutes * 60 && (
          <div className="text-center mb-4 sm:mb-8">
            <button
              onClick={startDuel}
              className="nes-btn is-warning"
              type="button"
              style={{ fontSize: 'clamp(0.8rem, 3vw, 1rem)', padding: '0.8rem 1.5rem' }}
            >
              Start Duel!
            </button>
          </div>
        )}

        {/* End Duel Button - shows when duel is active */}
        {isActive && (
          <div className="text-center mb-4 sm:mb-8">
            <button
              onClick={handleEndDuel}
              disabled={isEvaluating || player1Processing || player2Processing}
              className="nes-btn is-error"
              type="button"
              style={{
                fontSize: 'clamp(0.7rem, 2.5vw, 0.9rem)',
                padding: '0.6rem 1.2rem',
                opacity: (player1Processing || player2Processing) ? 0.5 : 1,
              }}
            >
              {isEvaluating ? 'Evaluating...' :
               (player1Processing || player2Processing) ? 'Claude is working...' :
               'End Duel & Evaluate'}
            </button>
          </div>
        )}

        {/* Unified Prompt Area */}
        <UnifiedPromptArea
          player1={player1}
          player2={player2}
          currentTurn={currentTurn}
          isActive={isActive}
          onPromptChange={handlePromptChange}
          onSubmit={handleSubmit}
          onEndPrompts={handleEndPrompts}
          player1Processing={player1Processing}
          player2Processing={player2Processing}
        />

        {/* Combined Chat */}
        <div className="mt-4 sm:mt-6">
          <CombinedChat messages={chatMessages} />
        </div>

        {/* Info Tabs - Video & Console */}
        <div className="mt-4 sm:mt-6">
          <InfoTabs
            player1={player1}
            player2={player2}
            player1Console={player1Console}
            player2Console={player2Console}
            challenge={selectedChallenge}
          />
        </div>

        {/* Score Display */}
        <div className="nes-container is-dark with-title mt-4 sm:mt-6">
          <p className="title" style={{ fontSize: 'clamp(0.7rem, 3vw, 1rem)' }}>
            Scoreboard
          </p>
          <div className="flex items-center justify-center gap-4 sm:gap-8 flex-wrap">
            <div className="text-center">
              <div className="flex items-center gap-2 justify-center mb-2">
                <i className="nes-icon trophy is-small sm:is-medium"></i>
                <p style={{ fontSize: 'clamp(0.5rem, 2vw, 0.7rem)' }}>{player1.name}</p>
              </div>
              <p style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', color: '#209cee' }}>
                {getFinalScore(player1.score, player1.promptsUsed)}
              </p>
              <p style={{ fontSize: 'clamp(0.35rem, 1.5vw, 0.5rem)', color: '#888' }}>
                {player1.score} × {getMultiplier(player1.promptsUsed)}
              </p>
            </div>

            <div style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', opacity: 0.5 }}>VS</div>

            <div className="text-center">
              <div className="flex items-center gap-2 justify-center mb-2">
                <i className="nes-icon trophy is-small sm:is-medium"></i>
                <p style={{ fontSize: 'clamp(0.5rem, 2vw, 0.7rem)' }}>{player2.name}</p>
              </div>
              <p style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', color: '#92cc41' }}>
                {getFinalScore(player2.score, player2.promptsUsed)}
              </p>
              <p style={{ fontSize: 'clamp(0.35rem, 1.5vw, 0.5rem)', color: '#888' }}>
                {player2.score} × {getMultiplier(player2.promptsUsed)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
