import React, { useState } from 'react';

interface GroupSetupProps {
  challenge: 1 | 2;
  onSetupComplete: (player1Name: string, player2Name: string) => void;
  onBack: () => void;
}

export const GroupSetup: React.FC<GroupSetupProps> = ({ challenge, onSetupComplete, onBack }) => {
  const [player1Name, setPlayer1Name] = useState('');
  const [player2Name, setPlayer2Name] = useState('');
  const [errors, setErrors] = useState<{ player1?: string; player2?: string }>({});

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
      onSetupComplete(player1Name.trim(), player2Name.trim());
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

      {/* Form Container */}
      <div
        style={{
          background: 'linear-gradient(180deg, #1a1d21 0%, #0d0f11 100%)',
          border: '4px solid #92cc41',
          padding: '2rem',
          width: '100%',
          maxWidth: '450px',
        }}
      >
        <h2
          style={{
            fontSize: 'clamp(0.7rem, 2.5vw, 1rem)',
            color: '#92cc41',
            textAlign: 'center',
            marginBottom: '1.5rem',
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

      {/* Footer */}
      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <p style={{ fontSize: 'clamp(0.4rem, 1.5vw, 0.6rem)', color: '#555', margin: 0 }}>
          Both players will compete head-to-head
        </p>
      </div>
    </div>
  );
};
