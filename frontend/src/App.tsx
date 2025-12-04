import { useState, useEffect } from 'react';
import { UnifiedPromptArea } from './components/UnifiedPromptArea';
import { Timer } from './components/Timer';
import { DuelResults } from './components/DuelResults';
import { CombinedChat } from './components/CombinedChat';
import { InfoTabs } from './components/InfoTabs';
import { LoginPage } from './components/LoginPage';

type Player = 'player1' | 'player2';

interface PlayerState {
  name: string;
  prompt: string;
  score: number;
  isReady: boolean;
  promptsUsed: number;
}

interface Message {
  sender: string;
  text: string;
  timestamp: number;
  type: 'player1' | 'player2' | 'judge';
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [player1, setPlayer1] = useState<PlayerState>({
    name: 'Player 1',
    prompt: '',
    score: 0,
    isReady: false,
    promptsUsed: 0,
  });

  const [player2, setPlayer2] = useState<PlayerState>({
    name: 'Player 2',
    prompt: '',
    score: 0,
    isReady: false,
    promptsUsed: 0,
  });

  const [currentTurn, setCurrentTurn] = useState<Player>('player1');
  const [round, setRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isActive, setIsActive] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [player1Console, setPlayer1Console] = useState<string[]>([]);
  const [player2Console, setPlayer2Console] = useState<string[]>([]);

  const handleLogin = (username: string) => {
    setPlayer1((prev) => ({ ...prev, name: username }));
    setIsLoggedIn(true);
  };

  const startDuel = () => {
    setIsActive(true);
    setTimeLeft(60);
    setPlayer1({ ...player1, isReady: false, prompt: '' });
    setPlayer2({ ...player2, isReady: false, prompt: '' });
    setShowResults(false);
    addMessage(
      'Judge Alpha',
      `Round ${round} begins! Let's see what creative prompts we get!`,
      'judge',
    );
  };

  const handleTimeUp = () => {
    setIsActive(false);
    evaluateRound();
  };

  const handlePromptChange = (player: Player, prompt: string) => {
    if (player === 'player1') {
      setPlayer1({ ...player1, prompt });
    } else {
      setPlayer2({ ...player2, prompt });
    }
  };

  const handleSubmit = (player: Player) => {
    if (player === 'player1' && player1.prompt.trim() && player1.promptsUsed < 7) {
      setPlayer1({ ...player1, isReady: true, promptsUsed: player1.promptsUsed + 1 });
      addMessage(player1.name, 'Prompt submitted!', 'player1');
      addMessage('Judge Beta', `${player1.name} has submitted their prompt!`, 'judge');
      addConsoleLog('player1', `✓ Prompt submitted: "${player1.prompt.substring(0, 50)}..."`);
      addConsoleLog('player1', `→ Processing prompt for evaluation`);
      // Switch to player 2's turn
      setCurrentTurn('player2');
    } else if (player === 'player2' && player2.prompt.trim() && player2.promptsUsed < 7) {
      setPlayer2({ ...player2, isReady: true, promptsUsed: player2.promptsUsed + 1 });
      addMessage(player2.name, 'Prompt submitted!', 'player2');
      addMessage('Judge Gamma', `${player2.name} has submitted their prompt!`, 'judge');
      addConsoleLog('player2', `✓ Prompt submitted: "${player2.prompt.substring(0, 50)}..."`);
      addConsoleLog('player2', `→ Processing prompt for evaluation`);
      // Switch to player 1's turn
      setCurrentTurn('player1');
    }

    // Check if both players are ready
    const bothReady =
      (player === 'player1' ? true : player1.isReady) &&
      (player === 'player2' ? true : player2.isReady);

    if (bothReady) {
      setIsActive(false);
      setTimeout(() => {
        addMessage('Judge Alpha', 'Both prompts are in! Time to evaluate...', 'judge');
      }, 500);
      evaluateRound();
    }
  };

  const evaluateRound = () => {
    // Simple evaluation based on prompt length and complexity
    const score1 = calculateScore(player1.prompt);
    const score2 = calculateScore(player2.prompt);

    setPlayer1({ ...player1, score: player1.score + score1 });
    setPlayer2({ ...player2, score: player2.score + score2 });

    // Add judge commentary about scores
    setTimeout(() => {
      if (score1 > score2) {
        addMessage(
          'Judge Beta',
          `Impressive! ${player1.name} takes this round with ${score1} points!`,
          'judge',
        );
      } else if (score2 > score1) {
        addMessage(
          'Judge Gamma',
          `Excellent work! ${player2.name} scores ${score2} points this round!`,
          'judge',
        );
      } else {
        addMessage(
          'Judge Alpha',
          `It's a tie this round! Both players scored ${score1} points!`,
          'judge',
        );
      }
    }, 1000);

    if (round >= 3) {
      // Determine final winner
      const finalWinner = player1.score + score1 > player2.score + score2 ? 'player1' : 'player2';
      setWinner(finalWinner);
      setTimeout(() => {
        addMessage('Judge Alpha', 'What an incredible duel! We have our winner!', 'judge');
      }, 1500);
      setShowResults(true);
    } else {
      // Move to next round
      setTimeout(() => {
        setRound(round + 1);
        setTimeLeft(60);
        setIsActive(true);
        setPlayer1({ ...player1, prompt: '', isReady: false });
        setPlayer2({ ...player2, prompt: '', isReady: false });
        setCurrentTurn(currentTurn === 'player1' ? 'player2' : 'player1');
        addMessage(
          'Judge Gamma',
          `Round ${round + 1} is starting! The competition heats up!`,
          'judge',
        );
      }, 2000);
    }
  };

  const calculateScore = (prompt: string): number => {
    const baseScore = Math.min(prompt.length, 200);
    const wordCount = prompt.trim().split(/\s+/).length;
    const creativityBonus = wordCount > 10 ? 50 : 0;
    return Math.floor((baseScore + creativityBonus) / 5);
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
    setPlayer1({ name: 'Player 1', prompt: '', score: 0, isReady: false, promptsUsed: 0 });
    setPlayer2({ name: 'Player 2', prompt: '', score: 0, isReady: false, promptsUsed: 0 });
    setRound(1);
    setTimeLeft(60);
    setIsActive(false);
    setShowResults(false);
    setWinner(null);
    setCurrentTurn('player1');
    setChatMessages([]);
    setPlayer1Console([]);
    setPlayer2Console([]);
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

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (showResults) {
    return (
      <DuelResults player1={player1} player2={player2} winner={winner} onPlayAgain={resetGame} />
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
              <h1 style={{ fontSize: 'clamp(0.8rem, 4vw, 1.5rem)', lineHeight: '1.8rem' }}>
                Prompt Duel
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-6 flex-wrap">
              <div className="nes-badge">
                <span className="is-warning" style={{ fontSize: 'clamp(0.5rem, 2vw, 0.8rem)' }}>
                  Round {round}/3
                </span>
              </div>
              <Timer timeLeft={timeLeft} isActive={isActive} />
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
        {!isActive && round === 1 && (
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

        {/* Unified Prompt Area */}
        <UnifiedPromptArea
          player1={player1}
          player2={player2}
          currentTurn={currentTurn}
          isActive={isActive}
          onPromptChange={handlePromptChange}
          onSubmit={handleSubmit}
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
                {player1.score}
              </p>
            </div>

            <div style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', opacity: 0.5 }}>VS</div>

            <div className="text-center">
              <div className="flex items-center gap-2 justify-center mb-2">
                <i className="nes-icon trophy is-small sm:is-medium"></i>
                <p style={{ fontSize: 'clamp(0.5rem, 2vw, 0.7rem)' }}>{player2.name}</p>
              </div>
              <p style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', color: '#92cc41' }}>
                {player2.score}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
