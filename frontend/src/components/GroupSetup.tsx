import React, { useState } from 'react';

interface GroupSetupProps {
  challenge: 1 | 2;
  onSetupComplete: (player1Name: string, player2Name: string, timeoutMinutes: number) => void;
  onBack: () => void;
}

export const GroupSetup: React.FC<GroupSetupProps> = ({ challenge, onSetupComplete, onBack }) => {
  const [player1Name, setPlayer1Name] = useState('');
  const [player2Name, setPlayer2Name] = useState('');
  const [timeoutMinutes, setTimeoutMinutes] = useState(20);
  const [errors, setErrors] = useState<{ player1?: string; player2?: string }>({});

  const timeoutOptions = [5, 10, 15, 20, 30, 45, 60];

  const validateForm = (): boolean => {
    const newErrors: { player1?: string; player2?: string } = {};

    if (!player1Name.trim()) {
      newErrors.player1 = 'Player 1 name is required';
    }
    if (!player2Name.trim()) {
      newErrors.player2 = 'Player 2 name is required';
    }
    if (player1Name.trim() && player2Name.trim() && player1Name.trim().toLowerCase() === player2Name.trim().toLowerCase()) {
      newErrors.player2 = 'Player names must be different';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSetupComplete(player1Name.trim(), player2Name.trim(), timeoutMinutes);
    }
  };

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
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          <i className={`nes-icon ${challenge === 1 ? 'star' : 'trophy'} is-medium`}></i>
          <h1
            style={{
              fontSize: 'clamp(1rem, 4vw, 1.8rem)',
              color: '#fff',
              margin: 0,
            }}
          >
            Challenge {challenge}
          </h1>
        </div>
        <p
          style={{
            fontSize: 'clamp(0.5rem, 2vw, 0.8rem)',
            color: challenge === 1 ? '#209cee' : '#92cc41',
            margin: 0,
          }}
        >
          {challenge === 1 ? 'Creative Prompting' : 'Advanced Battle'}
        </p>
      </div>

      {/* Two-column layout: Rules (left) + Form (right) on desktop, stacked on mobile */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '2rem',
          width: '100%',
          maxWidth: '920px',
          padding: '0 1rem',
          alignItems: 'stretch',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {/* Game Rules - Left on desktop, below on mobile (order: 2 on mobile, 1 on desktop) */}
        <div
          className="group-setup-rules"
          style={{
            background: 'linear-gradient(180deg, #1a1d21 0%, #0d0f11 100%)',
            border: '4px solid #e76e55',
            padding: '1.5rem',
            flex: '1 1 340px',
            maxWidth: '430px',
            minWidth: '280px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <h3
            style={{
              fontSize: 'clamp(0.7rem, 2.5vw, 1rem)',
              color: '#e76e55',
              textAlign: 'center',
              margin: '0 0 1.2rem 0',
            }}
          >
            Game Rules
          </h3>

          {/* Rule 1: Character Limit */}
          <div style={{ marginBottom: '1.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
              <i className="nes-icon close is-small"></i>
              <span style={{ fontSize: 'clamp(0.5rem, 2vw, 0.7rem)', color: '#f7d51d' }}>
                280 character limit per prompt
              </span>
            </div>
            <p style={{ fontSize: 'clamp(0.4rem, 1.5vw, 0.55rem)', color: '#888', margin: '0 0 0 1.5rem' }}>
              No one-shot mega-prompts! Break your strategy into iterative steps.
            </p>
          </div>

          {/* Rule 2: 7 Prompts Max */}
          <div style={{ marginBottom: '1.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
              <i className="nes-icon heart is-small"></i>
              <span style={{ fontSize: 'clamp(0.5rem, 2vw, 0.7rem)', color: '#f7d51d' }}>
                7 prompts maximum per player
              </span>
            </div>
            <p style={{ fontSize: 'clamp(0.4rem, 1.5vw, 0.55rem)', color: '#888', margin: '0 0 0 1.5rem' }}>
              Each prompt is a turn. You can end early, but your multiplier will be lower.
            </p>
          </div>

          {/* Rule 3: Multiplier */}
          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <i className="nes-icon star is-small"></i>
              <span style={{ fontSize: 'clamp(0.5rem, 2vw, 0.7rem)', color: '#f7d51d' }}>
                Score multiplier rewards iteration
              </span>
            </div>
            <p style={{ fontSize: 'clamp(0.4rem, 1.5vw, 0.55rem)', color: '#888', margin: '0 0 0.5rem 1.5rem' }}>
              More prompts = higher multiplier on your code quality score:
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '0.25rem',
                marginLeft: '1.5rem',
                marginRight: '0.5rem',
                fontSize: 'clamp(0.35rem, 1.3vw, 0.5rem)',
              }}
            >
              {[
                { n: 1, m: '×0.3' },
                { n: 2, m: '×0.5' },
                { n: 3, m: '×0.7' },
                { n: 4, m: '×0.85' },
                { n: 5, m: '×0.9' },
                { n: 6, m: '×0.95' },
                { n: 7, m: '×1.0' },
              ].map(({ n, m }) => (
                <div
                  key={n}
                  style={{
                    textAlign: 'center',
                    padding: '0.3rem 0.15rem',
                    border: `2px solid ${n >= 5 ? '#92cc41' : n >= 3 ? '#f7d51d' : '#e76e55'}`,
                    color: n >= 5 ? '#92cc41' : n >= 3 ? '#f7d51d' : '#e76e55',
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>{m}</div>
                  <div style={{ opacity: 0.7 }}>{n}p</div>
                </div>
              ))}
            </div>
          </div>

          {/* Formula */}
          <div
            style={{
              marginTop: 'auto',
              paddingTop: '1rem',
              borderTop: '2px solid #333',
            }}
          >
            <p style={{ fontSize: 'clamp(0.45rem, 1.8vw, 0.6rem)', color: '#92cc41', textAlign: 'center', margin: 0 }}>
              Final Score = Code Quality × Multiplier
            </p>
            <p style={{ fontSize: 'clamp(0.35rem, 1.3vw, 0.5rem)', color: '#666', textAlign: 'center', margin: '0.3rem 0 0 0' }}>
              Iterate to dominate!
            </p>
          </div>
        </div>

        {/* Form Container - Right on desktop, top on mobile */}
        <div
          className="group-setup-form"
          style={{
            background: 'linear-gradient(180deg, #1a1d21 0%, #0d0f11 100%)',
            border: '4px solid #92cc41',
            padding: '2rem',
            flex: '1 1 340px',
            maxWidth: '430px',
            minWidth: '280px',
          }}
        >
          <h2
            style={{
              fontSize: 'clamp(0.7rem, 2.5vw, 1rem)',
              color: '#92cc41',
              textAlign: 'center',
              margin: '0 0 1.5rem 0',
            }}
          >
            Enter Player Names
          </h2>

          <form onSubmit={handleSubmit}>
            {/* Player 1 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                htmlFor="player1_name"
                style={{
                  display: 'block',
                  fontSize: 'clamp(0.5rem, 2vw, 0.7rem)',
                  color: '#209cee',
                  marginBottom: '0.5rem',
                }}
              >
                Player 1
              </label>
              <input
                type="text"
                id="player1_name"
                className={`nes-input is-dark ${errors.player1 ? 'is-error' : ''}`}
                placeholder="Enter name"
                value={player1Name}
                onChange={(e) => {
                  setPlayer1Name(e.target.value);
                  if (errors.player1) setErrors((prev) => ({ ...prev, player1: undefined }));
                }}
                style={{ fontSize: 'clamp(0.5rem, 2vw, 0.8rem)', width: '100%' }}
              />
              {errors.player1 && (
                <p style={{ color: '#ce372b', fontSize: '0.5rem', marginTop: '0.5rem' }}>
                  {errors.player1}
                </p>
              )}
            </div>

            {/* VS Divider */}
            <div
              style={{
                textAlign: 'center',
                margin: '1rem 0',
                color: '#444',
                fontSize: 'clamp(1rem, 3vw, 1.5rem)',
                fontWeight: 'bold',
              }}
            >
              VS
            </div>

            {/* Player 2 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                htmlFor="player2_name"
                style={{
                  display: 'block',
                  fontSize: 'clamp(0.5rem, 2vw, 0.7rem)',
                  color: '#92cc41',
                  marginBottom: '0.5rem',
                }}
              >
                Player 2
              </label>
              <input
                type="text"
                id="player2_name"
                className={`nes-input is-dark ${errors.player2 ? 'is-error' : ''}`}
                placeholder="Enter name"
                value={player2Name}
                onChange={(e) => {
                  setPlayer2Name(e.target.value);
                  if (errors.player2) setErrors((prev) => ({ ...prev, player2: undefined }));
                }}
                style={{ fontSize: 'clamp(0.5rem, 2vw, 0.8rem)', width: '100%' }}
              />
              {errors.player2 && (
                <p style={{ color: '#ce372b', fontSize: '0.5rem', marginTop: '0.5rem' }}>
                  {errors.player2}
                </p>
              )}
            </div>

            {/* Game Timeout */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                htmlFor="timeout"
                style={{
                  display: 'block',
                  fontSize: 'clamp(0.5rem, 2vw, 0.7rem)',
                  color: '#f7d51d',
                  marginBottom: '0.5rem',
                }}
              >
                Game Timeout
              </label>
              <div className="nes-select is-dark">
                <select
                  id="timeout"
                  value={timeoutMinutes}
                  onChange={(e) => setTimeoutMinutes(Number(e.target.value))}
                  style={{ fontSize: 'clamp(0.5rem, 2vw, 0.8rem)' }}
                >
                  {timeoutOptions.map((mins) => (
                    <option key={mins} value={mins}>
                      {mins} minutes
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Buttons */}
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                marginTop: '2rem',
              }}
            >
              <button
                type="button"
                onClick={onBack}
                className="nes-btn"
                style={{ flex: 1, fontSize: 'clamp(0.5rem, 2vw, 0.7rem)' }}
              >
                Back
              </button>
              <button
                type="submit"
                className={`nes-btn ${challenge === 1 ? 'is-primary' : 'is-success'}`}
                style={{ flex: 1, fontSize: 'clamp(0.5rem, 2vw, 0.7rem)' }}
              >
                Start Duel!
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
