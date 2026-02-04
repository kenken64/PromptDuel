import React, { useState } from 'react';
import { Leaderboard } from './Leaderboard';

interface LandingPageProps {
  onSelectChallenge: (challenge: 1 | 2) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectChallenge }) => {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backgroundColor: '#212529',
        background: 'radial-gradient(ellipse at center, #2a2f35 0%, #212529 70%)',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h1
          style={{
            fontSize: 'clamp(1.8rem, 8vw, 3.5rem)',
            color: '#fff',
            textShadow: '4px 4px 0 #000, 6px 6px 0 #92cc41',
            letterSpacing: '0.1em',
            margin: 0,
          }}
        >
          PROMPT DUEL
        </h1>
      </div>

      {/* Select Your Challenge Label */}
      <p
        style={{
          fontSize: 'clamp(0.7rem, 2.5vw, 1rem)',
          color: '#92cc41',
          textShadow: '2px 2px 0 #000',
          marginBottom: '2rem',
          textAlign: 'center',
        }}
      >
        Select Your Challenge
      </p>

      {/* Challenge Selection - Vertical Stack */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          width: '100%',
          maxWidth: '400px',
          padding: '0 1rem',
        }}
      >
        {/* Challenge 1 */}
        <div
          onClick={() => onSelectChallenge(1)}
          style={{
            background: 'linear-gradient(180deg, #1a1d21 0%, #0d0f11 100%)',
            border: '4px solid #209cee',
            boxShadow: '0 0 20px rgba(32, 156, 238, 0.3), inset 0 0 20px rgba(32, 156, 238, 0.1)',
            padding: '2rem',
            position: 'relative',
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {/* Top glow */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2px',
              background: 'linear-gradient(90deg, transparent, #209cee, transparent)',
            }}
          />

          {/* Vertical content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: '90px',
                height: '90px',
                background: 'rgba(32, 156, 238, 0.15)',
                borderRadius: '50%',
                border: '3px solid #209cee',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <i
                className="nes-icon star is-large"
                style={{
                  transform: 'scale(2)',
                  margin: 0,
                  position: 'relative',
                  top: '-8px',
                  left: '-8px',
                }}
              ></i>
            </div>

            {/* Title */}
            <h2
              style={{
                fontSize: 'clamp(1.1rem, 4vw, 1.5rem)',
                color: '#209cee',
                textShadow: '2px 2px 0 #000',
                marginBottom: '0.5rem',
                margin: '0 0 0.5rem 0',
              }}
            >
              Challenge 1
            </h2>

            {/* Description */}
            <p
              style={{
                fontSize: 'clamp(0.5rem, 2vw, 0.7rem)',
                color: '#888',
                marginBottom: '1rem',
                margin: '0 0 1rem 0',
              }}
            >
              Creative Prompting
            </p>

            {/* Badge */}
            <div
              style={{
                background: '#209cee',
                color: '#000',
                padding: '0.4rem 1.2rem',
                fontSize: 'clamp(0.4rem, 1.5vw, 0.6rem)',
                fontWeight: 'bold',
                letterSpacing: '0.1em',
              }}
            >
              BEGINNER
            </div>
          </div>

          {/* Bottom glow */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '2px',
              background: 'linear-gradient(90deg, transparent, #209cee, transparent)',
            }}
          />
        </div>

        {/* Challenge 2 */}
        <div
          onClick={() => onSelectChallenge(2)}
          style={{
            background: 'linear-gradient(180deg, #1a1d21 0%, #0d0f11 100%)',
            border: '4px solid #92cc41',
            boxShadow: '0 0 20px rgba(146, 204, 65, 0.3), inset 0 0 20px rgba(146, 204, 65, 0.1)',
            padding: '2rem',
            position: 'relative',
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {/* Top glow */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2px',
              background: 'linear-gradient(90deg, transparent, #92cc41, transparent)',
            }}
          />

          {/* Vertical content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: '90px',
                height: '90px',
                background: 'rgba(146, 204, 65, 0.15)',
                borderRadius: '50%',
                border: '3px solid #92cc41',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <i
                className="nes-icon trophy is-large"
                style={{
                  transform: 'scale(2)',
                  margin: 0,
                  position: 'relative',
                  top: '-8px',
                  left: '-8px',
                }}
              ></i>
            </div>

            {/* Title */}
            <h2
              style={{
                fontSize: 'clamp(1.1rem, 4vw, 1.5rem)',
                color: '#92cc41',
                textShadow: '2px 2px 0 #000',
                margin: '0 0 0.5rem 0',
              }}
            >
              Challenge 2
            </h2>

            {/* Description */}
            <p
              style={{
                fontSize: 'clamp(0.5rem, 2vw, 0.7rem)',
                color: '#888',
                margin: '0 0 1rem 0',
              }}
            >
              Advanced Battle
            </p>

            {/* Badge */}
            <div
              style={{
                background: '#92cc41',
                color: '#000',
                padding: '0.4rem 1.2rem',
                fontSize: 'clamp(0.4rem, 1.5vw, 0.6rem)',
                fontWeight: 'bold',
                letterSpacing: '0.1em',
              }}
            >
              ADVANCED
            </div>
          </div>

          {/* Bottom glow */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '2px',
              background: 'linear-gradient(90deg, transparent, #92cc41, transparent)',
            }}
          />
        </div>
      </div>

      {/* Leaderboard Button */}
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <button
          onClick={() => setShowLeaderboard(!showLeaderboard)}
          className="nes-btn is-warning"
          type="button"
          style={{
            fontSize: 'clamp(0.6rem, 2.5vw, 0.8rem)',
            padding: '0.6rem 1.5rem',
          }}
        >
          <i className="nes-icon trophy is-small" style={{ marginRight: '8px' }}></i>
          {showLeaderboard ? 'Hide Leaderboard' : 'View Leaderboard'}
        </button>
      </div>

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
          <div style={{ width: '100%', maxWidth: '800px', maxHeight: '80vh', overflowY: 'auto' }}>
            <Leaderboard onClose={() => setShowLeaderboard(false)} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <p
          style={{
            fontSize: 'clamp(0.4rem, 1.5vw, 0.6rem)',
            color: '#555',
            margin: 0,
          }}
        >
          Choose a challenge to begin your adventure
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '0.5rem',
            marginTop: '0.75rem',
          }}
        >
          <span style={{ color: '#209cee', fontSize: '0.6rem' }}>●</span>
          <span style={{ color: '#92cc41', fontSize: '0.6rem' }}>●</span>
          <span style={{ color: '#f7d51d', fontSize: '0.6rem' }}>●</span>
        </div>
      </div>
    </div>
  );
};
