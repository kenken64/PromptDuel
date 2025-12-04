import { useState } from 'react';

interface PlayerState {
  name: string;
  prompt: string;
  score: number;
  isReady: boolean;
  promptsUsed: number;
}

interface InfoTabsProps {
  player1: PlayerState;
  player2: PlayerState;
  player1Console: string[];
  player2Console: string[];
}

export function InfoTabs({ player1, player2, player1Console, player2Console }: InfoTabsProps) {
  const [activeTab, setActiveTab] = useState<'video' | 'console' | 'evaluation'>('video');

  return (
    <div className="nes-container is-dark with-title">
      <p className="title" style={{ fontSize: 'clamp(0.7rem, 3vw, 1rem)' }}>
        Information
      </p>

      {/* Tab Headers */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setActiveTab('video')}
          className={`nes-btn ${activeTab === 'video' ? 'is-warning' : ''}`}
          type="button"
          style={{
            fontSize: 'clamp(0.5rem, 2.5vw, 0.6rem)',
            flex: '1 1 auto',
            minHeight: '44px',
            minWidth: '80px',
          }}
        >
          📹 Video
        </button>
        <button
          onClick={() => setActiveTab('console')}
          className={`nes-btn ${activeTab === 'console' ? 'is-success' : ''}`}
          type="button"
          style={{
            fontSize: 'clamp(0.5rem, 2.5vw, 0.6rem)',
            flex: '1 1 auto',
            minHeight: '44px',
            minWidth: '80px',
          }}
        >
          💻 Console
        </button>
        <button
          onClick={() => setActiveTab('evaluation')}
          className={`nes-btn ${activeTab === 'evaluation' ? 'is-primary' : ''}`}
          type="button"
          style={{
            fontSize: 'clamp(0.5rem, 2.5vw, 0.6rem)',
            flex: '1 1 auto',
            minHeight: '44px',
            minWidth: '80px',
          }}
        >
          ⭐ Evaluation
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'video' ? (
          <div className="space-y-4">
            <div className="nes-container is-rounded" style={{ padding: '0' }}>
              <div
                style={{
                  position: 'relative',
                  paddingBottom: '56.25%',
                  height: 0,
                  overflow: 'hidden',
                }}
              >
                <iframe
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  }}
                  src="https://www.youtube.com/embed/zEqMF7u_XrI"
                  title="Challenge Requirements Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
            <div
              className="nes-container"
              style={{ fontSize: 'clamp(0.5rem, 2.5vw, 0.6rem)', lineHeight: '1.4' }}
            >
              <h4 style={{ marginBottom: '0.5rem' }}>Challenge Description:</h4>
              <p>
                Create the most creative and detailed prompt for building an app or game. Points are
                awarded based on creativity, detail, and technical feasibility.
              </p>
            </div>
          </div>
        ) : activeTab === 'console' ? (
          <div className="space-y-4">
            {/* Player 1 Console */}
            <div className="nes-container is-dark">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                  fontSize: 'clamp(0.5rem, 2.5vw, 0.7rem)',
                }}
              >
                <i className="nes-icon coin is-small"></i>
                <span>{player1.name} Console</span>
              </div>
              <div
                className="nes-container"
                style={{
                  fontFamily: 'monospace',
                  fontSize: 'clamp(0.4rem, 2vw, 0.5rem)',
                  maxHeight: '150px',
                  overflowY: 'auto',
                  backgroundColor: '#000',
                  color: '#92cc41',
                  padding: '0.5rem',
                  wordBreak: 'break-word',
                }}
              >
                {player1Console.length === 0 ? (
                  <div style={{ color: '#666', fontStyle: 'italic' }}>No output yet...</div>
                ) : (
                  player1Console.map((log, index) => (
                    <div key={index} style={{ marginBottom: '0.3rem', lineHeight: '1.2' }}>
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Player 2 Console */}
            <div className="nes-container is-dark">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                  fontSize: 'clamp(0.5rem, 2.5vw, 0.7rem)',
                }}
              >
                <i className="nes-icon coin is-small"></i>
                <span>{player2.name} Console</span>
              </div>
              <div
                className="nes-container"
                style={{
                  fontFamily: 'monospace',
                  fontSize: 'clamp(0.4rem, 2vw, 0.5rem)',
                  maxHeight: '150px',
                  overflowY: 'auto',
                  backgroundColor: '#000',
                  color: '#92cc41',
                  padding: '0.5rem',
                  wordBreak: 'break-word',
                }}
              >
                {player2Console.length === 0 ? (
                  <div style={{ color: '#666', fontStyle: 'italic' }}>No output yet...</div>
                ) : (
                  player2Console.map((log, index) => (
                    <div key={index} style={{ marginBottom: '0.3rem', lineHeight: '1.2' }}>
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Scoring Criteria */}
            <div className="nes-container">
              <h4
                style={{
                  fontSize: 'clamp(0.6rem, 2.5vw, 0.8rem)',
                  marginBottom: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <i className="nes-icon star is-small"></i>
                <span>Scoring Criteria</span>
              </h4>
              <div style={{ fontSize: 'clamp(0.5rem, 2.5vw, 0.6rem)', lineHeight: '1.6' }}>
                <div className="mb-3">
                  <strong style={{ color: '#f7d51d' }}>Creativity (30%)</strong>
                  <p style={{ opacity: 0.8, marginTop: '0.3rem' }}>
                    Originality and innovative thinking in the prompt concept
                  </p>
                </div>
                <div className="mb-3">
                  <strong style={{ color: '#209cee' }}>Detail Level (25%)</strong>
                  <p style={{ opacity: 0.8, marginTop: '0.3rem' }}>
                    Depth and specificity of requirements and features
                  </p>
                </div>
                <div className="mb-3">
                  <strong style={{ color: '#92cc41' }}>Technical Feasibility (20%)</strong>
                  <p style={{ opacity: 0.8, marginTop: '0.3rem' }}>
                    Practical implementation and realistic scope
                  </p>
                </div>
                <div className="mb-3">
                  <strong style={{ color: '#e76e55' }}>Clarity (15%)</strong>
                  <p style={{ opacity: 0.8, marginTop: '0.3rem' }}>
                    Clear communication and well-structured descriptions
                  </p>
                </div>
                <div>
                  <strong style={{ color: '#b565d8' }}>Word Count (10%)</strong>
                  <p style={{ opacity: 0.8, marginTop: '0.3rem' }}>
                    Length bonus for comprehensive prompts
                  </p>
                </div>
              </div>
            </div>

            {/* Judge Tips */}
            <div className="nes-container is-dark">
              <h4
                style={{
                  fontSize: 'clamp(0.6rem, 2.5vw, 0.8rem)',
                  marginBottom: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <i className="nes-icon trophy is-small"></i>
                <span>Judge's Tips</span>
              </h4>
              <div style={{ fontSize: 'clamp(0.5rem, 2.5vw, 0.6rem)', lineHeight: '1.6' }}>
                <ul style={{ paddingLeft: '1rem', margin: 0 }}>
                  <li style={{ marginBottom: '0.5rem' }}>
                    Be specific about features and functionality
                  </li>
                  <li style={{ marginBottom: '0.5rem' }}>Include user experience considerations</li>
                  <li style={{ marginBottom: '0.5rem' }}>Describe the target audience clearly</li>
                  <li style={{ marginBottom: '0.5rem' }}>
                    Mention technology stack or design style
                  </li>
                  <li>Think about edge cases and error handling</li>
                </ul>
              </div>
            </div>

            {/* Player Stats Comparison */}
            <div className="nes-container">
              <h4
                style={{
                  fontSize: 'clamp(0.6rem, 2.5vw, 0.8rem)',
                  marginBottom: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <i className="nes-icon coin is-small"></i>
                <span>Current Stats</span>
              </h4>
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div className="nes-container is-dark text-center" style={{ padding: '0.5rem' }}>
                  <p
                    style={{
                      fontSize: 'clamp(0.4rem, 2vw, 0.5rem)',
                      opacity: 0.7,
                      marginBottom: '0.3rem',
                    }}
                  >
                    {player1.name}
                  </p>
                  <p
                    style={{
                      fontSize: 'clamp(0.8rem, 3vw, 1rem)',
                      color: '#209cee',
                      marginBottom: '0.3rem',
                    }}
                  >
                    {player1.score}
                  </p>
                  <p style={{ fontSize: 'clamp(0.4rem, 2vw, 0.5rem)', opacity: 0.7 }}>
                    {player1.promptsUsed}/7 prompts
                  </p>
                </div>
                <div className="nes-container is-dark text-center" style={{ padding: '0.5rem' }}>
                  <p
                    style={{
                      fontSize: 'clamp(0.4rem, 2vw, 0.5rem)',
                      opacity: 0.7,
                      marginBottom: '0.3rem',
                    }}
                  >
                    {player2.name}
                  </p>
                  <p
                    style={{
                      fontSize: 'clamp(0.8rem, 3vw, 1rem)',
                      color: '#92cc41',
                      marginBottom: '0.3rem',
                    }}
                  >
                    {player2.score}
                  </p>
                  <p style={{ fontSize: 'clamp(0.4rem, 2vw, 0.5rem)', opacity: 0.7 }}>
                    {player2.promptsUsed}/7 prompts
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
