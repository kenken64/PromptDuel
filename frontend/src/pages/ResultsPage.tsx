import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRoom } from '../contexts/RoomContext';
import { useGame } from '../contexts/GameContext';
import { getFinalScore, getMultiplier } from '../gameRules';
import { config } from '../config';

interface ChallengePrompt {
  id: number;
  challenge: number;
  promptNumber: number;
  title: string;
  content: string;
}

export function ResultsPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { leaveRoom } = useRoom();
  const {
    player1: contextPlayer1,
    player2: contextPlayer2,
    winner: contextWinner,
    evaluationResults: contextEvaluationResults,
    selectedChallenge: contextChallenge,
    resetGame,
  } = useGame();

  // Try to load results from localStorage if context is empty
  const [localResults, setLocalResults] = useState<any>(null);
  const [samplePrompts, setSamplePrompts] = useState<ChallengePrompt[]>([]);
  const [showSamplePrompts, setShowSamplePrompts] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('promptduel_results');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log('Loaded results from localStorage:', parsed);
        // Only use if it matches the current room
        if (parsed.roomCode === code || !parsed.roomCode) {
          setLocalResults(parsed);
        }
      } catch (e) {
        console.error('Failed to parse stored results:', e);
      }
    }
  }, [code]);

  // Use context values if available, otherwise fall back to localStorage
  // NOTE: These must be declared BEFORE the useEffect that uses selectedChallenge
  const player1 = contextPlayer1.score > 0 || contextPlayer1.promptsUsed > 0
    ? contextPlayer1
    : localResults?.player1
      ? { ...contextPlayer1, name: localResults.player1.name, score: localResults.player1.score, promptsUsed: localResults.player1.promptsUsed }
      : contextPlayer1;

  const player2 = contextPlayer2.score > 0 || contextPlayer2.promptsUsed > 0
    ? contextPlayer2
    : localResults?.player2
      ? { ...contextPlayer2, name: localResults.player2.name, score: localResults.player2.score, promptsUsed: localResults.player2.promptsUsed }
      : contextPlayer2;

  const evaluationResults = contextEvaluationResults || localResults?.evaluationResults || null;
  const selectedChallenge = contextChallenge || localResults?.challenge || 1;

  // Calculate final scores first
  const p1FinalScore = getFinalScore(player1.score, player1.promptsUsed);
  const p2FinalScore = getFinalScore(player2.score, player2.promptsUsed);
  const p1Multiplier = getMultiplier(player1.promptsUsed);
  const p2Multiplier = getMultiplier(player2.promptsUsed);

  // Always determine winner based on actual final scores (scores are the source of truth)
  const winner: 'player1' | 'player2' | null =
    p1FinalScore > p2FinalScore ? 'player1' :
    p2FinalScore > p1FinalScore ? 'player2' :
    null; // Tie

  // Fetch sample prompts for the challenge
  useEffect(() => {
    const fetchSamplePrompts = async () => {
      try {
        const response = await fetch(`${config.apiUrl}/challenge-prompts/${selectedChallenge}`);
        const data = await response.json();
        if (data.success && data.prompts) {
          setSamplePrompts(data.prompts);
        }
      } catch (error) {
        console.error('Failed to fetch sample prompts:', error);
      }
    };
    fetchSamplePrompts();
  }, [selectedChallenge]);

  const handlePlayAgain = async () => {
    // Clear stored results
    localStorage.removeItem('promptduel_results');
    await leaveRoom(code);
    resetGame();
    navigate('/lobby');
  };

  return (
    <div className="page-container font-['Press_Start_2P']">
      <div className="bg-pattern"></div>

      {/* Header */}
      <header className="app-header p-4">
        <div className="container mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4 animate-fade-in">
              <img src="/logo.png" alt="Prompt Duel" style={{ height: '70px', width: 'auto' }} />
              <div>
                <h1 className="text-primary glow-text" style={{ fontSize: 'clamp(0.8rem, 4vw, 1.5rem)', lineHeight: '1.8rem' }}>
                  Duel Complete!
                </h1>
                <p style={{ fontSize: 'clamp(0.4rem, 1.5vw, 0.6rem)', color: '#92cc41' }}>
                  Challenge {selectedChallenge} Results - Room: {code}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 animate-fade-in animate-delay-1">
              <span style={{ fontSize: '0.7rem', color: '#888' }}>
                Player: <span style={{ color: '#92cc41' }}>{user?.username}</span>
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="page-content">
        {/* Winner Announcement */}
        <div className="text-center mb-6 sm:mb-8 animate-fade-in">
          <div className="nes-container is-dark is-rounded inline-block px-6 sm:px-12 py-4 sm:py-6 glow-primary">
            {winner ? (
              <div className="flex flex-col items-center">
                <i className="nes-icon trophy is-large mb-4 trophy-bounce" style={{ transform: 'scale(1.5)' }}></i>
                <h2 className="glow-text" style={{ fontSize: 'clamp(1rem, 4vw, 1.5rem)', color: '#92cc41' }}>
                  {winner === 'player1' ? player1.name : player2.name} Wins!
                </h2>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <i className="nes-icon star is-large mb-4 icon-spin" style={{ transform: 'scale(1.5)' }}></i>
                <h2 className="glow-text" style={{ fontSize: 'clamp(1rem, 4vw, 1.5rem)', color: '#f7d51d' }}>
                  It's a Tie!
                </h2>
              </div>
            )}
          </div>
          {/* Message below the winner box */}
          <p className="mt-4" style={{ fontSize: 'clamp(0.5rem, 2vw, 0.7rem)', color: '#888' }}>
            {winner ? 'Congratulations on your victory!' : 'Both players performed equally well!'}
          </p>
        </div>

        {/* Final Scores */}
        <div className="nes-container is-dark with-title mb-6 sm:mb-8 animate-fade-in animate-delay-1 glow-primary">
          <p className="title" style={{ fontSize: 'clamp(0.7rem, 3vw, 1rem)' }}>Final Scores</p>

          <div className="flex items-center justify-center gap-4 sm:gap-8 flex-wrap">
            {/* Player 1 */}
            <div
              className={`player-slot ${winner === 'player1' ? 'is-ready' : ''} animate-slide-left`}
              style={{
                borderColor: winner === 'player1' ? '#92cc41' : '#333',
                minWidth: '200px',
                maxWidth: '300px',
                flex: '1'
              }}
            >
              <div className="text-center">
                <div className="flex items-center gap-2 justify-center mb-2">
                  {winner === 'player1' && <i className="nes-icon trophy is-small"></i>}
                  <p style={{ fontSize: 'clamp(0.5rem, 2vw, 0.7rem)' }}>{player1.name}</p>
                </div>
                <p className="glow-text mb-2" style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', color: '#209cee' }}>
                  {p1FinalScore}
                </p>
                <p style={{ fontSize: 'clamp(0.4rem, 1.5vw, 0.6rem)', color: '#888', marginBottom: '1rem' }}>
                  {player1.score} × {p1Multiplier} multiplier
                </p>

                <div style={{ fontSize: 'clamp(0.4rem, 1.5vw, 0.55rem)', textAlign: 'left' }}>
                  <p className="mb-1">
                    Raw Score: <span style={{ color: '#fff' }}>{player1.score}</span>
                  </p>
                  <p className="mb-1">
                    Prompts Used: <span style={{ color: '#fff' }}>{player1.promptsUsed}/7</span>
                  </p>
                  <p className="mb-1">
                    Multiplier: <span style={{ color: '#fff' }}>{p1Multiplier}x</span>
                  </p>
                  {evaluationResults?.player1 && (
                    <p className="mb-1">
                      Grade: <span style={{ color: '#92cc41' }}>{evaluationResults.player1.grade}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* VS Divider */}
            <div className="vs-divider" style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)' }}>VS</div>

            {/* Player 2 */}
            <div
              className={`player-slot ${winner === 'player2' ? 'is-ready' : ''} animate-slide-right`}
              style={{
                borderColor: winner === 'player2' ? '#92cc41' : '#333',
                minWidth: '200px',
                maxWidth: '300px',
                flex: '1'
              }}
            >
              <div className="text-center">
                <div className="flex items-center gap-2 justify-center mb-2">
                  {winner === 'player2' && <i className="nes-icon trophy is-small"></i>}
                  <p style={{ fontSize: 'clamp(0.5rem, 2vw, 0.7rem)' }}>{player2.name}</p>
                </div>
                <p className="glow-text mb-2" style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', color: '#92cc41' }}>
                  {p2FinalScore}
                </p>
                <p style={{ fontSize: 'clamp(0.4rem, 1.5vw, 0.6rem)', color: '#888', marginBottom: '1rem' }}>
                  {player2.score} × {p2Multiplier} multiplier
                </p>

                <div style={{ fontSize: 'clamp(0.4rem, 1.5vw, 0.55rem)', textAlign: 'left' }}>
                  <p className="mb-1">
                    Raw Score: <span style={{ color: '#fff' }}>{player2.score}</span>
                  </p>
                  <p className="mb-1">
                    Prompts Used: <span style={{ color: '#fff' }}>{player2.promptsUsed}/7</span>
                  </p>
                  <p className="mb-1">
                    Multiplier: <span style={{ color: '#fff' }}>{p2Multiplier}x</span>
                  </p>
                  {evaluationResults?.player2 && (
                    <p className="mb-1">
                      Grade: <span style={{ color: '#92cc41' }}>{evaluationResults.player2.grade}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Evaluation Results */}
        {evaluationResults && (evaluationResults.player1?.categories || evaluationResults.player2?.categories) && (
          <div className="nes-container is-dark with-title mb-6 sm:mb-8 animate-fade-in animate-delay-2">
            <p className="title" style={{ fontSize: 'clamp(0.6rem, 2.5vw, 0.9rem)' }}>Evaluation Details</p>

            <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
              {/* Player 1 Details */}
              {evaluationResults.player1?.categories && (
                <div className="nes-container is-rounded" style={{ backgroundColor: 'rgba(32, 156, 238, 0.1)', borderColor: '#209cee', padding: '0.75rem' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p style={{ fontSize: 'clamp(0.5rem, 2vw, 0.7rem)', color: '#209cee' }}>{player1.name}</p>
                    <span style={{ fontSize: 'clamp(0.4rem, 1.5vw, 0.55rem)', color: '#209cee' }}>
                      {evaluationResults.player1.totalScore}/{evaluationResults.player1.maxScore} ({evaluationResults.player1.percentage}%)
                    </span>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'clamp(0.35rem, 1.2vw, 0.5rem)' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #333' }}>
                        <th style={{ textAlign: 'left', padding: '4px 2px', color: '#888' }}>Category</th>
                        <th style={{ textAlign: 'center', padding: '4px 2px', color: '#888' }}>Score</th>
                        <th style={{ textAlign: 'left', padding: '4px 2px', color: '#888' }}>Feedback</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evaluationResults.player1.categories.map((cat: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #222' }}>
                          <td style={{ padding: '4px 2px', color: '#ccc' }}>{cat.name}</td>
                          <td style={{ textAlign: 'center', padding: '4px 2px', color: cat.score > 0 ? '#92cc41' : '#e76e55' }}>
                            {cat.score}/{cat.maxScore}
                          </td>
                          <td style={{ padding: '4px 2px', color: '#888', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {cat.feedback || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Player 2 Details */}
              {evaluationResults.player2?.categories && (
                <div className="nes-container is-rounded" style={{ backgroundColor: 'rgba(146, 204, 65, 0.1)', borderColor: '#92cc41', padding: '0.75rem' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p style={{ fontSize: 'clamp(0.5rem, 2vw, 0.7rem)', color: '#92cc41' }}>{player2.name}</p>
                    <span style={{ fontSize: 'clamp(0.4rem, 1.5vw, 0.55rem)', color: '#92cc41' }}>
                      {evaluationResults.player2.totalScore}/{evaluationResults.player2.maxScore} ({evaluationResults.player2.percentage}%)
                    </span>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'clamp(0.35rem, 1.2vw, 0.5rem)' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #333' }}>
                        <th style={{ textAlign: 'left', padding: '4px 2px', color: '#888' }}>Category</th>
                        <th style={{ textAlign: 'center', padding: '4px 2px', color: '#888' }}>Score</th>
                        <th style={{ textAlign: 'left', padding: '4px 2px', color: '#888' }}>Feedback</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evaluationResults.player2.categories.map((cat: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #222' }}>
                          <td style={{ padding: '4px 2px', color: '#ccc' }}>{cat.name}</td>
                          <td style={{ textAlign: 'center', padding: '4px 2px', color: cat.score > 0 ? '#92cc41' : '#e76e55' }}>
                            {cat.score}/{cat.maxScore}
                          </td>
                          <td style={{ padding: '4px 2px', color: '#888', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {cat.feedback || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sample Prompts Section */}
        {samplePrompts.length > 0 && (
          <div className="nes-container is-dark with-title mb-6 sm:mb-8 animate-fade-in animate-delay-3">
            <p className="title" style={{ fontSize: 'clamp(0.6rem, 2.5vw, 0.9rem)' }}>Sample Prompts</p>
            <div className="text-center mb-4">
              <button
                onClick={() => setShowSamplePrompts(!showSamplePrompts)}
                className="nes-btn is-warning"
                style={{ fontSize: 'clamp(0.5rem, 2vw, 0.7rem)', padding: '0.5rem 1rem' }}
              >
                {showSamplePrompts ? 'Hide Sample Prompts' : `View Sample Prompts for Challenge ${selectedChallenge}`}
              </button>
            </div>

            {showSamplePrompts && (
              <div className="space-y-4">
                <p style={{ fontSize: 'clamp(0.4rem, 1.5vw, 0.55rem)', color: '#888', marginBottom: '1rem' }}>
                  These are example prompts that could be used to solve Challenge {selectedChallenge}:
                </p>
                {samplePrompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className="nes-container is-rounded"
                    style={{
                      backgroundColor: 'rgba(32, 156, 238, 0.1)',
                      borderColor: '#209cee',
                      padding: '0.75rem',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="nes-badge" style={{ display: 'inline-block' }}>
                        <span className="is-primary" style={{ fontSize: 'clamp(0.4rem, 1.5vw, 0.5rem)' }}>
                          #{prompt.promptNumber}
                        </span>
                      </span>
                      <span style={{ fontSize: 'clamp(0.5rem, 2vw, 0.7rem)', color: '#92cc41' }}>{prompt.title}</span>
                    </div>
                    <p style={{ fontSize: 'clamp(0.4rem, 1.5vw, 0.55rem)', color: '#ccc', lineHeight: '1.8' }}>
                      {prompt.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="text-center animate-fade-in animate-delay-3 mb-8">
          <button
            onClick={handlePlayAgain}
            className="nes-btn is-success animate-glow"
            style={{
              fontSize: 'clamp(0.6rem, 2.5vw, 0.8rem)',
              padding: '0.75rem 2rem',
              minHeight: '44px',
            }}
          >
            Back to Lobby
          </button>
        </div>
      </main>
    </div>
  );
}
