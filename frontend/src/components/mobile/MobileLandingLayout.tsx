import React from 'react';

interface MobileLandingLayoutProps {
  onLogin: () => void;
  onRegister: () => void;
}

export function MobileLandingLayout({ onLogin, onRegister }: MobileLandingLayoutProps) {
  return (
    <div className="mobile-landing mobile-safe-top mobile-safe-bottom">
      {/* Logo */}
      <div className="logo-container">
        <img src="/logo.png" alt="Prompt Duel" style={{ height: '100px', margin: '0 auto' }} />
      </div>

      {/* Title */}
      <h1 style={{ color: '#92cc41', textShadow: '0 0 10px rgba(146, 204, 65, 0.5)' }}>
        Prompt Duel
      </h1>
      <p className="subtitle">
        Battle with AI prompts in real-time
      </p>

      {/* Description */}
      <div
        className="nes-container is-dark"
        style={{
          marginBottom: '2rem',
          padding: '1rem',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '0.45rem', color: '#ccc', lineHeight: '1.8' }}>
          Challenge your friends to a prompt engineering duel!
          Each player crafts prompts for AI to generate code.
          Best solution wins!
        </p>
      </div>

      {/* Buttons */}
      <div className="button-stack">
        <button
          onClick={onLogin}
          className="nes-btn is-primary"
          style={{ fontSize: '0.65rem' }}
        >
          Login
        </button>
        <button
          onClick={onRegister}
          className="nes-btn is-success"
          style={{ fontSize: '0.65rem' }}
        >
          Register
        </button>
      </div>

      {/* Features */}
      <div style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <i className="nes-icon star is-small" style={{ transform: 'scale(0.6)' }}></i>
            <span style={{ fontSize: '0.4rem', color: '#888' }}>Multiple AI Providers</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <i className="nes-icon trophy is-small" style={{ transform: 'scale(0.6)' }}></i>
            <span style={{ fontSize: '0.4rem', color: '#888' }}>Real-time Scoring</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <i className="nes-icon heart is-small" style={{ transform: 'scale(0.6)' }}></i>
            <span style={{ fontSize: '0.4rem', color: '#888' }}>Spectator Mode</span>
          </div>
        </div>
      </div>
    </div>
  );
}
