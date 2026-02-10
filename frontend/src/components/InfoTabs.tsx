import { useState, useMemo } from 'react';
import { useChallenges } from '../hooks/useChallenges';

// Strip ANSI escape codes from terminal output
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~]|\].*?(?:\x07|\x1B\\))/g, '')
            .replace(/\[[\d;]*[A-Za-z]/g, '')  // Additional CSI sequences
            .replace(/\]\d+;[^\x07]*\x07/g, '') // OSC sequences
            .replace(/[\x00-\x09\x0B-\x1F]/g, ''); // Control characters except newline
}

interface PlayerState {
  name: string;
  prompt: string;
  score: number;
  isReady: boolean;
  promptsUsed: number;
  hasEnded: boolean;
}

interface InfoTabsProps {
  player1: PlayerState;
  player2: PlayerState;
  player1Console: string[];
  player2Console: string[];
  challenge: 1 | 2;
}

// Fallback values in case API hasn't loaded yet
const FALLBACK_VIDEOS: Record<number, string> = {
  1: 'https://www.youtube.com/embed/dEV5yZeD4bA',
  2: 'https://www.youtube.com/embed/N4PRqcKdj-8',
};

const FALLBACK_DESCRIPTIONS: Record<number, { title: string; description: string }> = {
  1: {
    title: 'Challenge 1 - Beginner',
    description: 'Watch the video above for challenge requirements. Build a Node.js CLI application based on the specifications provided.',
  },
  2: {
    title: 'Challenge 2 - Advanced',
    description: 'Watch the video above for challenge requirements. Build a Node.js terminal application based on the specifications provided.',
  },
};

export function InfoTabs({ player1, player2, player1Console, player2Console, challenge }: InfoTabsProps) {
  const { getChallenge } = useChallenges();
  const challengeData = getChallenge(challenge);

  const videoUrl = challengeData?.videoUrl || FALLBACK_VIDEOS[challenge];
  const descTitle = challengeData
    ? `Challenge ${challenge} - ${challengeData.difficulty.charAt(0).toUpperCase() + challengeData.difficulty.slice(1)}`
    : FALLBACK_DESCRIPTIONS[challenge].title;
  const descText = challengeData?.longDescription || FALLBACK_DESCRIPTIONS[challenge].description;
  const [activeTab, setActiveTab] = useState<'video' | 'console' | 'evaluation'>('video');

  // Clean ANSI codes from console output and filter empty lines
  const cleanPlayer1Console = useMemo(
    () => player1Console.map(stripAnsi).filter(line => line.trim().length > 0),
    [player1Console]
  );
  const cleanPlayer2Console = useMemo(
    () => player2Console.map(stripAnsi).filter(line => line.trim().length > 0),
    [player2Console]
  );

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
                  src={videoUrl}
                  title={`Challenge ${challenge} Requirements Video`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
            <div
              className="nes-container"
              style={{ fontSize: 'clamp(0.5rem, 2.5vw, 0.6rem)', lineHeight: '1.4' }}
            >
              <h4 style={{ marginBottom: '0.5rem' }}>{descTitle}</h4>
              <p>{descText}</p>
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
                {cleanPlayer1Console.length === 0 ? (
                  <div style={{ color: '#666', fontStyle: 'italic' }}>No output yet...</div>
                ) : (
                  cleanPlayer1Console.map((log, index) => (
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
                {cleanPlayer2Console.length === 0 ? (
                  <div style={{ color: '#666', fontStyle: 'italic' }}>No output yet...</div>
                ) : (
                  cleanPlayer2Console.map((log, index) => (
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
                <div className="mb-2">
                  <strong style={{ color: '#f7d51d' }}>Functionality (40%)</strong>
                  <p style={{ opacity: 0.8, marginTop: '0.2rem' }}>
                    Working implementation that meets requirements
                  </p>
                </div>
                <div className="mb-2">
                  <strong style={{ color: '#209cee' }}>Algorithm & Logic (25%)</strong>
                  <p style={{ opacity: 0.8, marginTop: '0.2rem' }}>
                    Correct approach and efficient solution
                  </p>
                </div>
                <div className="mb-2">
                  <strong style={{ color: '#92cc41' }}>Code Quality (20%)</strong>
                  <p style={{ opacity: 0.8, marginTop: '0.2rem' }}>
                    Clean, readable, well-structured code
                  </p>
                </div>
                <div>
                  <strong style={{ color: '#e76e55' }}>Completeness (15%)</strong>
                  <p style={{ opacity: 0.8, marginTop: '0.2rem' }}>
                    All features implemented with error handling
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
                    Watch the video carefully for all requirements
                  </li>
                  <li style={{ marginBottom: '0.5rem' }}>Break down the problem into smaller steps</li>
                  <li style={{ marginBottom: '0.5rem' }}>Test your code as you build</li>
                  <li style={{ marginBottom: '0.5rem' }}>
                    Use clear prompts to guide the AI
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
