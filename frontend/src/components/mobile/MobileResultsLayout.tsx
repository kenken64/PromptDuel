import React, { useState } from 'react';
import { getFinalScore, getMultiplier } from '../../gameRules';
import { getProviderDisplayName, type ProviderKey } from '../ProviderSelector';

interface PlayerState {
  name: string;
  score: number;
  promptsUsed: number;
}

interface ChallengePrompt {
  id: number;
  challenge: number;
  promptNumber: number;
  title: string;
  content: string;
}

interface MobileResultsLayoutProps {
  player1: PlayerState;
  player2: PlayerState;
  winner: 'player1' | 'player2' | null;
  evaluationResults: any;
  selectedChallenge: number;
  roomCode?: string;
  roomData?: {
    player1Provider?: string;
    player1Model?: string;
    player2Provider?: string;
    player2Model?: string;
  };
  samplePrompts: ChallengePrompt[];
  onPlayAgain: () => void;
  onDownloadWorkspace: () => void;
  isLoadingResults?: boolean;
}

export function MobileResultsLayout({
  player1,
  player2,
  winner,
  evaluationResults,
  selectedChallenge,
  roomCode,
  roomData,
  samplePrompts,
  onPlayAgain,
  onDownloadWorkspace,
  isLoadingResults = false,
}: MobileResultsLayoutProps) {
  const [activeTab, setActiveTab] = useState<'scores' | 'details' | 'samples'>('scores');

  const p1FinalScore = getFinalScore(player1.score, player1.promptsUsed);
  const p2FinalScore = getFinalScore(player2.score, player2.promptsUsed);
  const p1Multiplier = getMultiplier(player1.promptsUsed);
  const p2Multiplier = getMultiplier(player2.promptsUsed);

  return (
    <div className="page-container mobile-safe-top mobile-safe-bottom">
      {/* Header */}
      <header className="app-header" style={{ padding: '0.5rem 0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src="/logo.png" alt="Prompt Duel" style={{ height: '35px' }} />
            <div>
              <div style={{ fontSize: '0.6rem', color: '#92cc41' }}>Results</div>
              <div style={{ fontSize: '0.4rem', color: '#888' }}>Room: {roomCode}</div>
            </div>
          </div>
        </div>
      </header>

      <div className="page-content mobile-results">
        {/* Winner Banner */}
        <div
          className="winner-banner nes-container is-dark glow-primary"
          style={{ textAlign: 'center', marginBottom: '1rem' }}
        >
          {winner ? (
            <>
              <span className="trophy-bounce" style={{ fontSize: '3rem', display: 'block', filter: 'drop-shadow(0 0 10px rgba(247, 213, 29, 0.6))' }}>🏆</span>
              <h2 style={{ fontSize: '0.9rem', color: '#92cc41', marginTop: '0.5rem' }}>
                {winner === 'player1' ? player1.name : player2.name} Wins!
              </h2>
            </>
          ) : (
            <>
              <span className="icon-spin" style={{ fontSize: '3rem', display: 'block', filter: 'drop-shadow(0 0 10px rgba(247, 213, 29, 0.6))' }}>⭐</span>
              <h2 style={{ fontSize: '0.9rem', color: '#f7d51d', marginTop: '0.5rem' }}>
                It's a Tie!
              </h2>
            </>
          )}
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: '3px solid #333',
          marginBottom: '0.75rem',
          backgroundColor: '#1a1a2e',
        }}>
          <button
            onClick={() => setActiveTab('scores')}
            style={{
              flex: 1,
              padding: '0.75rem 0.5rem',
              fontSize: '0.5rem',
              color: activeTab === 'scores' ? '#92cc41' : '#888',
              backgroundColor: activeTab === 'scores' ? 'rgba(146, 204, 65, 0.1)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'scores' ? '3px solid #92cc41' : '3px solid transparent',
              cursor: 'pointer',
              fontFamily: "'Press Start 2P', cursive",
              marginBottom: '-3px',
            }}
          >
            Scores
          </button>
          {evaluationResults && (
            <button
              onClick={() => setActiveTab('details')}
              style={{
                flex: 1,
                padding: '0.75rem 0.5rem',
                fontSize: '0.5rem',
                color: activeTab === 'details' ? '#92cc41' : '#888',
                backgroundColor: activeTab === 'details' ? 'rgba(146, 204, 65, 0.1)' : 'transparent',
                border: 'none',
                borderBottom: activeTab === 'details' ? '3px solid #92cc41' : '3px solid transparent',
                cursor: 'pointer',
                fontFamily: "'Press Start 2P', cursive",
                marginBottom: '-3px',
              }}
            >
              Details
            </button>
          )}
          {samplePrompts.length > 0 && (
            <button
              onClick={() => setActiveTab('samples')}
              style={{
                flex: 1,
                padding: '0.75rem 0.5rem',
                fontSize: '0.5rem',
                color: activeTab === 'samples' ? '#92cc41' : '#888',
                backgroundColor: activeTab === 'samples' ? 'rgba(146, 204, 65, 0.1)' : 'transparent',
                border: 'none',
                borderBottom: activeTab === 'samples' ? '3px solid #92cc41' : '3px solid transparent',
                cursor: 'pointer',
                fontFamily: "'Press Start 2P', cursive",
                marginBottom: '-3px',
              }}
            >
              Samples
            </button>
          )}
        </div>

        {/* Tab Content */}
        {/* Scores Tab */}
        {activeTab === 'scores' && (
          <div className="final-scores">
            {/* Player 1 */}
            <div
              className={`player-result nes-container ${winner === 'player1' ? 'is-rounded' : 'is-dark'}`}
              style={{
                marginBottom: '0.75rem',
                borderColor: winner === 'player1' ? '#92cc41' : undefined,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="name" style={{ color: '#209cee' }}>
                    {winner === 'player1' && <span style={{ marginRight: '0.5rem' }}>🏆</span>}
                    {player1.name}
                  </div>
                  {roomData?.player1Provider && (
                    <div style={{ fontSize: '0.35rem', color: '#666', marginTop: '0.25rem' }}>
                      {getProviderDisplayName(roomData.player1Provider as ProviderKey, roomData.player1Model || '')}
                    </div>
                  )}
                </div>
                <div className="score" style={{ fontSize: '1.5rem', color: '#209cee' }}>
                  {p1FinalScore}
                </div>
              </div>
              <div className="details" style={{ marginTop: '0.5rem' }}>
                <span>Raw: {player1.score}</span>
                <span style={{ margin: '0 0.5rem' }}>×</span>
                <span>{p1Multiplier}</span>
                <span style={{ margin: '0 0.5rem' }}>|</span>
                <span>Prompts: {player1.promptsUsed}/7</span>
                {evaluationResults?.player1?.grade && (
                  <>
                    <span style={{ margin: '0 0.5rem' }}>|</span>
                    <span style={{ color: '#92cc41' }}>Grade: {evaluationResults.player1.grade}</span>
                  </>
                )}
              </div>
            </div>

            <div style={{ textAlign: 'center', padding: '0.5rem', color: '#666', fontSize: '0.8rem' }}>VS</div>

            {/* Player 2 */}
            <div
              className={`player-result nes-container ${winner === 'player2' ? 'is-rounded' : 'is-dark'}`}
              style={{
                borderColor: winner === 'player2' ? '#92cc41' : undefined,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="name" style={{ color: '#92cc41' }}>
                    {winner === 'player2' && <span style={{ marginRight: '0.5rem' }}>🏆</span>}
                    {player2.name}
                  </div>
                  {roomData?.player2Provider && (
                    <div style={{ fontSize: '0.35rem', color: '#666', marginTop: '0.25rem' }}>
                      {getProviderDisplayName(roomData.player2Provider as ProviderKey, roomData.player2Model || '')}
                    </div>
                  )}
                </div>
                <div className="score" style={{ fontSize: '1.5rem', color: '#92cc41' }}>
                  {p2FinalScore}
                </div>
              </div>
              <div className="details" style={{ marginTop: '0.5rem' }}>
                <span>Raw: {player2.score}</span>
                <span style={{ margin: '0 0.5rem' }}>×</span>
                <span>{p2Multiplier}</span>
                <span style={{ margin: '0 0.5rem' }}>|</span>
                <span>Prompts: {player2.promptsUsed}/7</span>
                {evaluationResults?.player2?.grade && (
                  <>
                    <span style={{ margin: '0 0.5rem' }}>|</span>
                    <span style={{ color: '#92cc41' }}>Grade: {evaluationResults.player2.grade}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Details Tab - Loading */}
        {activeTab === 'details' && !evaluationResults && isLoadingResults && (
          <div className="nes-container is-dark" style={{ textAlign: 'center', padding: '2rem' }}>
            <i className="nes-icon trophy is-small trophy-bounce"></i>
            <p style={{ fontSize: '0.4rem', color: '#888', marginTop: '1rem' }}>
              Loading evaluation details...
            </p>
          </div>
        )}

        {/* Details Tab - No Results */}
        {activeTab === 'details' && !evaluationResults && !isLoadingResults && (
          <div className="nes-container is-dark" style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ fontSize: '0.4rem', color: '#888' }}>
              Detailed evaluation not available.
            </p>
          </div>
        )}

        {/* Details Tab */}
        {activeTab === 'details' && evaluationResults && (
          <div className="evaluation-section">
            {/* Player 1 Details */}
            {evaluationResults.player1?.categories && (
              <div className="nes-container is-dark" style={{ marginBottom: '0.75rem', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.5rem', color: player1.score < evaluationResults.player1.totalScore ? '#e76e55' : '#209cee', marginBottom: '0.5rem' }}>
                  {player1.name} - {player1.score}/{evaluationResults.player1.maxScore}
                </div>
                {player1.score < evaluationResults.player1.totalScore && (
                  <div style={{ fontSize: '0.35rem', color: '#e76e55', marginBottom: '0.5rem' }}>
                    Code evaluation: {evaluationResults.player1.totalScore}/{evaluationResults.player1.maxScore} — Duplicate penalty: -{evaluationResults.player1.totalScore - player1.score} marks
                  </div>
                )}
                <table className="evaluation-table" style={{ width: '100%', fontSize: '0.35rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #333' }}>
                      <th style={{ textAlign: 'left', padding: '0.25rem' }}>Category</th>
                      <th style={{ textAlign: 'center', padding: '0.25rem' }}>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluationResults.player1.categories.map((cat: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #222' }}>
                        <td style={{ padding: '0.25rem', color: '#ccc' }}>{cat.name}</td>
                        <td style={{ textAlign: 'center', padding: '0.25rem', color: cat.score > 0 ? '#92cc41' : '#e76e55' }}>
                          {cat.score}/{cat.maxScore}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Player 2 Details */}
            {evaluationResults.player2?.categories && (
              <div className="nes-container is-dark" style={{ padding: '0.75rem' }}>
                <div style={{ fontSize: '0.5rem', color: player2.score < evaluationResults.player2.totalScore ? '#e76e55' : '#92cc41', marginBottom: '0.5rem' }}>
                  {player2.name} - {player2.score}/{evaluationResults.player2.maxScore}
                </div>
                {player2.score < evaluationResults.player2.totalScore && (
                  <div style={{ fontSize: '0.35rem', color: '#e76e55', marginBottom: '0.5rem' }}>
                    Code evaluation: {evaluationResults.player2.totalScore}/{evaluationResults.player2.maxScore} — Duplicate penalty: -{evaluationResults.player2.totalScore - player2.score} marks
                  </div>
                )}
                <table className="evaluation-table" style={{ width: '100%', fontSize: '0.35rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #333' }}>
                      <th style={{ textAlign: 'left', padding: '0.25rem' }}>Category</th>
                      <th style={{ textAlign: 'center', padding: '0.25rem' }}>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluationResults.player2.categories.map((cat: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #222' }}>
                        <td style={{ padding: '0.25rem', color: '#ccc' }}>{cat.name}</td>
                        <td style={{ textAlign: 'center', padding: '0.25rem', color: cat.score > 0 ? '#92cc41' : '#e76e55' }}>
                          {cat.score}/{cat.maxScore}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Samples Tab */}
        {activeTab === 'samples' && samplePrompts.length > 0 && (
          <div className="samples-section">
            <p style={{ fontSize: '0.4rem', color: '#888', marginBottom: '0.75rem' }}>
              Example prompts for Challenge {selectedChallenge}:
            </p>
            {samplePrompts.map((prompt) => (
              <div
                key={prompt.id}
                className="nes-container is-dark"
                style={{ marginBottom: '0.75rem', padding: '0.75rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.4rem', padding: '0.15rem 0.3rem', background: '#209cee', color: '#fff' }}>
                    #{prompt.promptNumber}
                  </span>
                  <span style={{ fontSize: '0.45rem', color: '#92cc41' }}>{prompt.title}</span>
                </div>
                <p style={{ fontSize: '0.4rem', color: '#ccc', lineHeight: '1.6' }}>
                  {prompt.content}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            onClick={onDownloadWorkspace}
            className="nes-btn is-primary"
            style={{ width: '100%', fontSize: '0.55rem' }}
          >
            Download My Code
          </button>
          <button
            onClick={onPlayAgain}
            className="nes-btn is-success"
            style={{ width: '100%', fontSize: '0.55rem' }}
          >
            Back to Lobby
          </button>
        </div>
      </div>
    </div>
  );
}
