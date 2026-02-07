import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRoom } from '../contexts/RoomContext';
import { useGame } from '../contexts/GameContext';
import { getFinalScore, getMultiplier } from '../gameRules';

export function ResultsPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { leaveRoom } = useRoom();
  const {
    player1,
    player2,
    winner,
    evaluationResults,
    selectedChallenge,
    resetGame,
  } = useGame();

  const handlePlayAgain = async () => {
    await leaveRoom();
    resetGame();
    navigate('/lobby');
  };

  const p1FinalScore = getFinalScore(player1.score, player1.promptsUsed);
  const p2FinalScore = getFinalScore(player2.score, player2.promptsUsed);
  const p1Multiplier = getMultiplier(player1.promptsUsed);
  const p2Multiplier = getMultiplier(player2.promptsUsed);

  return (
    <div
      className="min-h-screen font-['Press_Start_2P']"
      style={{ backgroundColor: '#212529', color: '#fff' }}
    >
      {/* Header */}
      <div
        style={{ backgroundColor: '#000', padding: '1rem 0', borderBottom: '4px solid #92cc41' }}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4">
            <i className="nes-icon trophy is-large"></i>
            <div>
              <h1 className="text-xl">Duel Complete!</h1>
              <p className="text-xs text-[#92cc41]">Challenge {selectedChallenge} Results</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Winner Announcement */}
        <div className="text-center mb-8">
          <div className="nes-container is-dark is-rounded inline-block px-8 py-4">
            {winner ? (
              <>
                <i className="nes-icon trophy is-large mb-4"></i>
                <h2 className="text-2xl text-[#92cc41] mb-2">
                  {winner === 'player1' ? player1.name : player2.name} Wins!
                </h2>
              </>
            ) : (
              <>
                <i className="nes-icon star is-large mb-4"></i>
                <h2 className="text-2xl text-yellow-400 mb-2">It's a Tie!</h2>
              </>
            )}
          </div>
        </div>

        {/* Final Scores */}
        <div className="nes-container is-dark with-title mb-8">
          <p className="title">Final Scores</p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Player 1 */}
            <div
              className={`nes-container is-rounded ${winner === 'player1' ? 'is-success' : ''}`}
            >
              <div className="text-center">
                <p className="text-sm mb-2">{player1.name}</p>
                <p className="text-4xl text-[#209cee] mb-2">{p1FinalScore}</p>
                <p className="text-xs text-gray-400 mb-4">
                  {player1.score} × {p1Multiplier} multiplier
                </p>

                <div className="text-xs text-left">
                  <p className="mb-1">
                    Raw Score: <span className="text-white">{player1.score}</span>
                  </p>
                  <p className="mb-1">
                    Prompts Used: <span className="text-white">{player1.promptsUsed}/7</span>
                  </p>
                  <p className="mb-1">
                    Multiplier: <span className="text-white">{p1Multiplier}x</span>
                  </p>
                  {evaluationResults?.player1 && (
                    <p className="mb-1">
                      Grade: <span className="text-white">{evaluationResults.player1.grade}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Player 2 */}
            <div
              className={`nes-container is-rounded ${winner === 'player2' ? 'is-success' : ''}`}
            >
              <div className="text-center">
                <p className="text-sm mb-2">{player2.name}</p>
                <p className="text-4xl text-[#92cc41] mb-2">{p2FinalScore}</p>
                <p className="text-xs text-gray-400 mb-4">
                  {player2.score} × {p2Multiplier} multiplier
                </p>

                <div className="text-xs text-left">
                  <p className="mb-1">
                    Raw Score: <span className="text-white">{player2.score}</span>
                  </p>
                  <p className="mb-1">
                    Prompts Used: <span className="text-white">{player2.promptsUsed}/7</span>
                  </p>
                  <p className="mb-1">
                    Multiplier: <span className="text-white">{p2Multiplier}x</span>
                  </p>
                  {evaluationResults?.player2 && (
                    <p className="mb-1">
                      Grade: <span className="text-white">{evaluationResults.player2.grade}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Evaluation Results */}
        {evaluationResults && (
          <div className="nes-container is-dark with-title mb-8">
            <p className="title">Evaluation Details</p>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Player 1 Details */}
              {evaluationResults.player1?.details && (
                <div>
                  <p className="text-sm mb-2 text-[#209cee]">{player1.name}</p>
                  <div className="text-xs">
                    {Object.entries(evaluationResults.player1.details).map(
                      ([key, value]: [string, any]) => (
                        <div key={key} className="flex justify-between mb-1">
                          <span className="text-gray-400">{key}:</span>
                          <span className="text-white">
                            {typeof value === 'number' ? value : JSON.stringify(value)}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Player 2 Details */}
              {evaluationResults.player2?.details && (
                <div>
                  <p className="text-sm mb-2 text-[#92cc41]">{player2.name}</p>
                  <div className="text-xs">
                    {Object.entries(evaluationResults.player2.details).map(
                      ([key, value]: [string, any]) => (
                        <div key={key} className="flex justify-between mb-1">
                          <span className="text-gray-400">{key}:</span>
                          <span className="text-white">
                            {typeof value === 'number' ? value : JSON.stringify(value)}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="text-center">
          <button onClick={handlePlayAgain} className="nes-btn is-success">
            Back to Lobby
          </button>
        </div>
      </div>
    </div>
  );
}
