import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Leaderboard } from './Leaderboard';

interface LandingPageProps {
  onSelectChallenge?: (challenge: 1 | 2) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectChallenge }) => {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  // Debug: log auth state
  console.log('Auth state:', { isAuthenticated, user });

  const handleChallengeSelect = (challenge: 1 | 2) => {
    if (isAuthenticated) {
      navigate('/lobby');
    } else {
      navigate('/login');
    }
    onSelectChallenge?.(challenge);
  };

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/lobby');
    } else {
      navigate('/register');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0a0a12',
        color: '#fff',
        fontFamily: "'Press Start 2P', cursive",
      }}
    >
      {/* Navigation */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          backgroundColor: 'rgba(10, 10, 18, 0.95)',
          borderBottom: '1px solid #1a1a2e',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 1.5rem',
            height: '100px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img
              src="/logo.png"
              alt="Prompt Duel"
              style={{
                height: '80px',
                width: 'auto',
              }}
            />
            <div>
              <h1 style={{ fontSize: '1.2rem', color: '#92cc41', margin: 0 }}>Prompt Duel</h1>
              <p style={{ fontSize: '0.5rem', color: '#666', margin: '4px 0 0 0' }}>AI Battle Arena</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isAuthenticated ? (
              <>
                <span style={{ color: '#888', fontSize: '0.6rem' }}>Welcome, <span style={{ color: '#92cc41' }}>{user?.username}</span></span>
                <Link to="/lobby" className="nes-btn is-primary" style={{ fontSize: '0.5rem', padding: '8px 12px' }}>
                  Lobby
                </Link>
                <button
                  onClick={() => logout()}
                  className="nes-btn"
                  style={{ fontSize: '0.5rem', padding: '8px 12px' }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  style={{
                    color: '#888',
                    fontSize: '0.6rem',
                    textDecoration: 'none',
                    padding: '8px 12px',
                  }}
                >
                  Login
                </Link>
                <Link to="/register" className="nes-btn is-primary" style={{ fontSize: '0.5rem', padding: '8px 12px' }}>
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        style={{
          paddingTop: '160px',
          paddingBottom: '80px',
          paddingLeft: '1.5rem',
          paddingRight: '1.5rem',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-block',
              marginBottom: '24px',
              padding: '8px 16px',
              backgroundColor: 'rgba(146, 204, 65, 0.1)',
              border: '1px solid rgba(146, 204, 65, 0.3)',
              color: '#92cc41',
              fontSize: '0.7rem',
            }}
          >
            Competitive AI Prompt Engineering
          </div>

          <h1
            style={{
              fontSize: 'clamp(1.5rem, 6vw, 3rem)',
              marginBottom: '24px',
              lineHeight: '1.4',
              fontWeight: 'normal',
            }}
          >
            Master the Art of
            <span style={{ display: 'block', color: '#92cc41', marginTop: '12px' }}>Prompt Engineering</span>
          </h1>

          <p
            style={{
              color: '#888',
              fontSize: 'clamp(0.6rem, 2.5vw, 0.9rem)',
              maxWidth: '700px',
              margin: '0 auto 48px',
              lineHeight: '2',
            }}
          >
            Challenge your friends in real-time prompt battles. Craft the perfect prompts, outsmart your opponent, and
            climb the leaderboard.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              justifyContent: 'center',
            }}
          >
            <button
              onClick={handleGetStarted}
              className="nes-btn is-success"
              style={{ fontSize: '0.75rem', padding: '16px 32px' }}
            >
              {isAuthenticated ? 'Enter Lobby' : 'Get Started Free'}
            </button>
            <button
              onClick={() => setShowLeaderboard(true)}
              className="nes-btn"
              style={{ fontSize: '0.75rem', padding: '16px 32px' }}
            >
              View Leaderboard
            </button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        style={{
          padding: '80px 1.5rem',
          backgroundColor: '#0d0d18',
        }}
      >
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.1rem, 4vw, 1.5rem)', textAlign: 'center', marginBottom: '16px' }}>
            How It Works
          </h2>
          <p
            style={{
              color: '#666',
              fontSize: '0.7rem',
              textAlign: 'center',
              marginBottom: '48px',
            }}
          >
            Three simple steps to start competing
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '32px',
            }}
          >
            {/* Step 1 */}
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: 'rgba(32, 156, 238, 0.15)',
                  border: '2px solid #209cee',
                  margin: '0 auto 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ color: '#209cee', fontSize: '1rem' }}>1</span>
              </div>
              <h3 style={{ color: '#209cee', fontSize: '0.85rem', marginBottom: '12px' }}>Create or Join</h3>
              <p style={{ color: '#666', fontSize: '0.65rem', lineHeight: '1.8' }}>
                Create a room or join an existing one with a simple room code
              </p>
            </div>

            {/* Step 2 */}
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: 'rgba(146, 204, 65, 0.15)',
                  border: '2px solid #92cc41',
                  margin: '0 auto 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ color: '#92cc41', fontSize: '1rem' }}>2</span>
              </div>
              <h3 style={{ color: '#92cc41', fontSize: '0.85rem', marginBottom: '12px' }}>Battle</h3>
              <p style={{ color: '#666', fontSize: '0.65rem', lineHeight: '1.8' }}>
                Take turns crafting prompts for Claude Code in real-time
              </p>
            </div>

            {/* Step 3 */}
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: 'rgba(247, 213, 29, 0.15)',
                  border: '2px solid #f7d51d',
                  margin: '0 auto 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ color: '#f7d51d', fontSize: '1rem' }}>3</span>
              </div>
              <h3 style={{ color: '#f7d51d', fontSize: '0.85rem', marginBottom: '12px' }}>Win</h3>
              <p style={{ color: '#666', fontSize: '0.65rem', lineHeight: '1.8' }}>
                Complete the challenge with fewer prompts to earn the highest score
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Challenges Section */}
      <section style={{ padding: '80px 1.5rem' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.1rem, 4vw, 1.5rem)', textAlign: 'center', marginBottom: '16px' }}>
            Choose Your Challenge
          </h2>
          <p
            style={{
              color: '#666',
              fontSize: '0.7rem',
              textAlign: 'center',
              marginBottom: '48px',
            }}
          >
            Select a difficulty level to start
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px',
              maxWidth: '700px',
              margin: '0 auto',
            }}
          >
            {/* Challenge 1 */}
            <div
              onClick={() => handleChallengeSelect(1)}
              style={{
                backgroundColor: '#0d0d18',
                border: '2px solid #1a1a2e',
                padding: '32px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#209cee';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#1a1a2e';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: '24px',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    backgroundColor: 'rgba(32, 156, 238, 0.1)',
                    border: '1px solid rgba(32, 156, 238, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <i className="nes-icon star is-medium"></i>
                </div>
                <span
                  style={{
                    fontSize: '0.6rem',
                    backgroundColor: '#209cee',
                    color: '#000',
                    padding: '8px 16px',
                    fontWeight: 'bold',
                  }}
                >
                  BEGINNER
                </span>
              </div>

              <h3 style={{ color: '#209cee', fontSize: '1rem', marginBottom: '12px' }}>Challenge 1</h3>
              <p style={{ color: '#666', fontSize: '0.65rem', marginBottom: '16px' }}>BracketValidator</p>
              <p style={{ color: '#888', fontSize: '0.6rem', lineHeight: '1.9' }}>
                Perfect for newcomers. Learn the basics of prompt engineering with a straightforward coding challenge.
              </p>

              <div
                style={{
                  marginTop: '24px',
                  paddingTop: '16px',
                  borderTop: '1px solid #1a1a2e',
                }}
              >
                <span style={{ color: '#555', fontSize: '0.6rem' }}>Click to start →</span>
              </div>
            </div>

            {/* Challenge 2 */}
            <div
              onClick={() => handleChallengeSelect(2)}
              style={{
                backgroundColor: '#0d0d18',
                border: '2px solid #1a1a2e',
                padding: '32px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#92cc41';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#1a1a2e';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: '24px',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    backgroundColor: 'rgba(146, 204, 65, 0.1)',
                    border: '1px solid rgba(146, 204, 65, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <i className="nes-icon trophy is-medium"></i>
                </div>
                <span
                  style={{
                    fontSize: '0.6rem',
                    backgroundColor: '#92cc41',
                    color: '#000',
                    padding: '8px 16px',
                    fontWeight: 'bold',
                  }}
                >
                  ADVANCED
                </span>
              </div>

              <h3 style={{ color: '#92cc41', fontSize: '1rem', marginBottom: '12px' }}>Challenge 2</h3>
              <p style={{ color: '#666', fontSize: '0.65rem', marginBottom: '16px' }}>QuantumHeist</p>
              <p style={{ color: '#888', fontSize: '0.6rem', lineHeight: '1.9' }}>
                For experienced prompters. Test your skills with a complex, multi-step coding challenge.
              </p>

              <div
                style={{
                  marginTop: '24px',
                  paddingTop: '16px',
                  borderTop: '1px solid #1a1a2e',
                }}
              >
                <span style={{ color: '#555', fontSize: '0.6rem' }}>Click to start →</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        style={{
          padding: '80px 1.5rem',
          backgroundColor: '#0d0d18',
        }}
      >
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.1rem, 4vw, 1.5rem)', textAlign: 'center', marginBottom: '48px' }}>
            Features
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '24px',
            }}
          >
            <div
              style={{
                padding: '24px',
                border: '1px solid #1a1a2e',
                backgroundColor: '#0a0a12',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '12px' }}>⚡</div>
              <h3 style={{ fontSize: '0.75rem', marginBottom: '10px' }}>Real-time Battles</h3>
              <p style={{ color: '#666', fontSize: '0.6rem' }}>Compete live with opponents</p>
            </div>

            <div
              style={{
                padding: '24px',
                border: '1px solid #1a1a2e',
                backgroundColor: '#0a0a12',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '12px' }}>👁</div>
              <h3 style={{ fontSize: '0.75rem', marginBottom: '10px' }}>Spectator Mode</h3>
              <p style={{ color: '#666', fontSize: '0.6rem' }}>Watch and learn from others</p>
            </div>

            <div
              style={{
                padding: '24px',
                border: '1px solid #1a1a2e',
                backgroundColor: '#0a0a12',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '12px' }}>🏆</div>
              <h3 style={{ fontSize: '0.75rem', marginBottom: '10px' }}>Leaderboards</h3>
              <p style={{ color: '#666', fontSize: '0.6rem' }}>Track your ranking globally</p>
            </div>

            <div
              style={{
                padding: '24px',
                border: '1px solid #1a1a2e',
                backgroundColor: '#0a0a12',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '12px' }}>💬</div>
              <h3 style={{ fontSize: '0.75rem', marginBottom: '10px' }}>Live Chat</h3>
              <p style={{ color: '#666', fontSize: '0.6rem' }}>Communicate with players</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ padding: '80px 1.5rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.1rem, 4vw, 1.5rem)', marginBottom: '16px' }}>Ready to Compete?</h2>
          <p style={{ color: '#666', fontSize: '0.7rem', marginBottom: '32px' }}>
            Join the arena and prove your prompt engineering skills
          </p>
          <button
            onClick={handleGetStarted}
            className="nes-btn is-success"
            style={{ fontSize: '0.8rem', padding: '16px 40px' }}
          >
            {isAuthenticated ? 'Go to Lobby' : 'Create Free Account'}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          padding: '32px 1.5rem',
          borderTop: '1px solid #1a1a2e',
        }}
      >
        <div
          style={{
            maxWidth: '1000px',
            margin: '0 auto',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <Link
            to="/about"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              textDecoration: 'none',
              transition: 'opacity 0.2s ease',
            }}
            title="About Prompt Duel"
          >
            <img
              src="/logo.png"
              alt="Prompt Duel"
              style={{
                height: '50px',
                width: 'auto',
              }}
            />
            <span style={{ fontSize: '0.8rem', color: '#92cc41' }}>Prompt Duel</span>
          </Link>
          <p style={{ color: '#555', fontSize: '0.6rem' }}>Powered by Claude Code</p>
        </div>
      </footer>

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLeaderboard(false);
          }}
        >
          <div style={{ width: '100%', maxWidth: '800px', maxHeight: '85vh', overflowY: 'auto' }}>
            <Leaderboard onClose={() => setShowLeaderboard(false)} />
          </div>
        </div>
      )}
    </div>
  );
};
