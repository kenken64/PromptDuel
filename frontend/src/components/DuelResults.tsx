import { useEffect, useState } from 'react';
import { Leaderboard } from './Leaderboard';
import { getFinalScore, getMultiplier } from '../gameRules';
import { config } from '../config';

type Player = 'player1' | 'player2';

interface PlayerState {
  name: string;
  prompt: string;
  score: number;
  isReady: boolean;
  promptsUsed: number;
  hasEnded: boolean;
}

interface CategoryScore {
  name: string;
  weight: number;
  score: number;
  maxScore: number;
  feedback: string;
}

interface EvaluationResult {
  playerName: string;
  challenge: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
  grade: string;
  categories: CategoryScore[];
  filesFound: string[];
  timestamp: string;
}

interface EvaluationResults {
  success: boolean;
  player1: EvaluationResult;
  player2: EvaluationResult;
  winner: Player | null;
  gradesMarkdown: string;
}

interface DuelResultsProps {
  player1: PlayerState;
  player2: PlayerState;
  winner: Player | null;
  onPlayAgain: () => void;
  evaluationResults?: EvaluationResults | null;
  challenge: 1 | 2;
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A': return '#92cc41';
    case 'B': return '#209cee';
    case 'C': return '#f7d51d';
    case 'D': return '#e76e55';
    default: return '#e76e55';
  }
}

export function DuelResults({
  player1,
  player2,
  winner,
  onPlayAgain,
  evaluationResults,
  challenge,
}: DuelResultsProps) {
  const winnerName = winner === 'player1' ? player1.name : winner === 'player2' ? player2.name : 'Tie';
  const hasEvaluation = evaluationResults?.success;
  const [scoresSaved, setScoresSaved] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Save scores to leaderboard when results are shown
  useEffect(() => {
    if (!scoresSaved) {
      saveToLeaderboard();
    }
  }, [scoresSaved]);

  const saveToLeaderboard = async () => {
    try {
      const p1Data = hasEvaluation && evaluationResults
        ? {
            playerName: player1.name,
            challenge,
            score: evaluationResults.player1.totalScore,
            maxScore: evaluationResults.player1.maxScore,
            percentage: evaluationResults.player1.percentage,
            grade: evaluationResults.player1.grade,
            promptsUsed: player1.promptsUsed,
          }
        : {
            playerName: player1.name,
            challenge,
            score: player1.score,
            maxScore: 100,
            percentage: player1.score,
            grade: player1.score >= 90 ? 'A' : player1.score >= 80 ? 'B' : player1.score >= 70 ? 'C' : player1.score >= 60 ? 'D' : 'F',
            promptsUsed: player1.promptsUsed,
          };

      const p2Data = hasEvaluation && evaluationResults
        ? {
            playerName: player2.name,
            challenge,
            score: evaluationResults.player2.totalScore,
            maxScore: evaluationResults.player2.maxScore,
            percentage: evaluationResults.player2.percentage,
            grade: evaluationResults.player2.grade,
            promptsUsed: player2.promptsUsed,
          }
        : {
            playerName: player2.name,
            challenge,
            score: player2.score,
            maxScore: 100,
            percentage: player2.score,
            grade: player2.score >= 90 ? 'A' : player2.score >= 80 ? 'B' : player2.score >= 70 ? 'C' : player2.score >= 60 ? 'D' : 'F',
            promptsUsed: player2.promptsUsed,
          };

      await fetch(`${config.apiUrl}/leaderboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p1Data),
      });

      await fetch(`${config.apiUrl}/leaderboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p2Data),
      });

      setScoresSaved(true);
      console.log('Scores saved to leaderboard');
    } catch (error) {
      console.error('Failed to save scores to leaderboard:', error);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#212529',
        color: '#fff',
        padding: '1rem',
        overflowY: 'auto',
      }}
    >
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Winner Announcement */}
        <div className="text-center mb-6">
          <i className="nes-icon trophy is-large"></i>
          <h1 style={{ fontSize: 'clamp(1.2rem, 5vw, 1.8rem)', margin: '1rem 0' }}>
            {winner ? 'Victory!' : 'It\'s a Tie!'}
          </h1>
          {winner && (
            <div style={{
              display: 'inline-flex',
              fontSize: 'clamp(0.8rem, 3vw, 1.2rem)',
              border: '4px solid #f7d51d',
              backgroundColor: '#212529',
            }}>
              <span style={{
                backgroundColor: '#f7d51d',
                color: '#000',
                padding: '0.5rem 1rem',
                fontWeight: 'bold',
              }}>
                {winnerName}
              </span>
              <span style={{
                backgroundColor: '#92cc41',
                color: '#000',
                padding: '0.5rem 1rem',
                fontWeight: 'bold',
              }}>
                Wins!
              </span>
            </div>
          )}
        </div>

        {/* Evaluation Results */}
        {hasEvaluation && (
          <>
            {/* Score Comparison */}
            <div className="nes-container is-dark with-title mb-4">
              <p className="title" style={{ fontSize: 'clamp(0.6rem, 2.5vw, 0.8rem)' }}>
                Challenge {challenge} - Final Grades
              </p>

              <div className="grid grid-cols-2 gap-4">
                {/* Player 1 Grade */}
                <div
                  className={`nes-container ${winner === 'player1' ? 'is-rounded' : 'is-dark'}`}
                  style={{
                    padding: '1rem',
                    textAlign: 'center',
                    borderColor: winner === 'player1' ? '#f7d51d' : undefined,
                  }}
                >
                  {winner === 'player1' && <i className="nes-icon trophy is-small"></i>}
                  <p style={{ fontSize: 'clamp(0.6rem, 2.5vw, 0.8rem)', marginBottom: '0.5rem' }}>
                    {player1.name}
                  </p>
                  <p
                    style={{
                      fontSize: 'clamp(2rem, 8vw, 3rem)',
                      fontWeight: 'bold',
                      color: getGradeColor(evaluationResults.player1.grade),
                    }}
                  >
                    {evaluationResults.player1.grade}
                  </p>
                  <p style={{ fontSize: 'clamp(0.8rem, 3vw, 1.2rem)' }}>
                    {getFinalScore(evaluationResults.player1.totalScore, player1.promptsUsed)}/{evaluationResults.player1.maxScore}
                  </p>
                  <p style={{ fontSize: 'clamp(0.4rem, 1.5vw, 0.55rem)', color: '#f7d51d', marginTop: '0.3rem' }}>
                    {evaluationResults.player1.totalScore} × {getMultiplier(player1.promptsUsed)} ({player1.promptsUsed} prompts)
                  </p>
                  <p style={{ fontSize: 'clamp(0.5rem, 2vw, 0.7rem)', opacity: 0.7 }}>
                    {evaluationResults.player1.percentage}% raw
                  </p>
                </div>

                {/* Player 2 Grade */}
                <div
                  className={`nes-container ${winner === 'player2' ? 'is-rounded' : 'is-dark'}`}
                  style={{
                    padding: '1rem',
                    textAlign: 'center',
                    borderColor: winner === 'player2' ? '#f7d51d' : undefined,
                  }}
                >
                  {winner === 'player2' && <i className="nes-icon trophy is-small"></i>}
                  <p style={{ fontSize: 'clamp(0.6rem, 2.5vw, 0.8rem)', marginBottom: '0.5rem' }}>
                    {player2.name}
                  </p>
                  <p
                    style={{
                      fontSize: 'clamp(2rem, 8vw, 3rem)',
                      fontWeight: 'bold',
                      color: getGradeColor(evaluationResults.player2.grade),
                    }}
                  >
                    {evaluationResults.player2.grade}
                  </p>
                  <p style={{ fontSize: 'clamp(0.8rem, 3vw, 1.2rem)' }}>
                    {getFinalScore(evaluationResults.player2.totalScore, player2.promptsUsed)}/{evaluationResults.player2.maxScore}
                  </p>
                  <p style={{ fontSize: 'clamp(0.4rem, 1.5vw, 0.55rem)', color: '#f7d51d', marginTop: '0.3rem' }}>
                    {evaluationResults.player2.totalScore} × {getMultiplier(player2.promptsUsed)} ({player2.promptsUsed} prompts)
                  </p>
                  <p style={{ fontSize: 'clamp(0.5rem, 2vw, 0.7rem)', opacity: 0.7 }}>
                    {evaluationResults.player2.percentage}% raw
                  </p>
                </div>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Player 1 Details */}
              <div className="nes-container is-dark">
                <h3 style={{ fontSize: 'clamp(0.6rem, 2.5vw, 0.8rem)', marginBottom: '0.8rem', color: '#209cee' }}>
                  {player1.name} - Breakdown
                </h3>
                <div style={{ fontSize: 'clamp(0.4rem, 1.8vw, 0.55rem)' }}>
                  {evaluationResults.player1.categories.map((cat, idx) => (
                    <div key={idx} style={{ marginBottom: '0.5rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span>{cat.name}</span>
                        <span style={{ color: cat.score > 0 ? '#92cc41' : '#e76e55' }}>
                          {cat.score}/{cat.maxScore}
                        </span>
                      </div>
                      <div style={{ opacity: 0.6, fontSize: '0.9em' }}>{cat.feedback}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '0.8rem', fontSize: 'clamp(0.4rem, 1.8vw, 0.55rem)' }}>
                  <strong>Files:</strong> {evaluationResults.player1.filesFound.join(', ') || 'None'}
                </div>
              </div>

              {/* Player 2 Details */}
              <div className="nes-container is-dark">
                <h3 style={{ fontSize: 'clamp(0.6rem, 2.5vw, 0.8rem)', marginBottom: '0.8rem', color: '#92cc41' }}>
                  {player2.name} - Breakdown
                </h3>
                <div style={{ fontSize: 'clamp(0.4rem, 1.8vw, 0.55rem)' }}>
                  {evaluationResults.player2.categories.map((cat, idx) => (
                    <div key={idx} style={{ marginBottom: '0.5rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span>{cat.name}</span>
                        <span style={{ color: cat.score > 0 ? '#92cc41' : '#e76e55' }}>
                          {cat.score}/{cat.maxScore}
                        </span>
                      </div>
                      <div style={{ opacity: 0.6, fontSize: '0.9em' }}>{cat.feedback}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '0.8rem', fontSize: 'clamp(0.4rem, 1.8vw, 0.55rem)' }}>
                  <strong>Files:</strong> {evaluationResults.player2.filesFound.join(', ') || 'None'}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Fallback if no evaluation */}
        {!hasEvaluation && (
          <div className="nes-container is-dark with-title mb-4">
            <p className="title" style={{ fontSize: 'clamp(0.6rem, 2.5vw, 0.8rem)' }}>
              Final Scores
            </p>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p style={{ fontSize: 'clamp(0.6rem, 2.5vw, 0.8rem)' }}>{player1.name}</p>
                <p style={{ fontSize: 'clamp(1.5rem, 6vw, 2rem)', color: '#209cee' }}>{player1.score}</p>
                <p style={{ fontSize: 'clamp(0.5rem, 2vw, 0.6rem)', opacity: 0.7 }}>
                  {player1.promptsUsed} prompts used
                </p>
              </div>
              <div>
                <p style={{ fontSize: 'clamp(0.6rem, 2.5vw, 0.8rem)' }}>{player2.name}</p>
                <p style={{ fontSize: 'clamp(1.5rem, 6vw, 2rem)', color: '#92cc41' }}>{player2.score}</p>
                <p style={{ fontSize: 'clamp(0.5rem, 2vw, 0.6rem)', opacity: 0.7 }}>
                  {player2.promptsUsed} prompts used
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Toggle */}
        <div className="text-center mt-6 mb-4">
          <button
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className="nes-btn is-warning"
            type="button"
            style={{
              fontSize: 'clamp(0.6rem, 2.5vw, 0.8rem)',
              padding: '0.6rem 1.2rem',
              minHeight: '40px',
            }}
          >
            {showLeaderboard ? 'Hide Leaderboard' : 'View Leaderboard'}
          </button>
        </div>

        {/* Leaderboard */}
        {showLeaderboard && (
          <div className="mb-6">
            <Leaderboard selectedChallenge={challenge} onClose={() => setShowLeaderboard(false)} />
          </div>
        )}

        {/* Play Again Button */}
        <div className="text-center mt-6">
          <button
            onClick={onPlayAgain}
            className="nes-btn is-success"
            type="button"
            style={{
              fontSize: 'clamp(0.7rem, 3vw, 1rem)',
              padding: '0.8rem 1.5rem',
              minHeight: '44px',
            }}
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}
