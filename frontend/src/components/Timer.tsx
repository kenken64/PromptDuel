import React from 'react';

interface TimerProps {
  timeLeft: number;
  isActive: boolean;
}

export const Timer = React.memo(function Timer({ timeLeft, isActive }: TimerProps) {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const isUrgent = timeLeft <= 60 && isActive; // Urgent when less than 1 minute

  return (
    <div
      className={`nes-container is-rounded ${isUrgent ? 'is-error pixel-pulse' : 'is-dark'}`}
      style={{ padding: '0.3rem 0.5rem', display: 'inline-block' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        <i className="nes-icon clock is-small"></i>
        <span style={{ fontSize: 'clamp(0.6rem, 3vw, 1rem)', fontFamily: 'monospace' }}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
});
