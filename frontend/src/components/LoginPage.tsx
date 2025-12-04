import React, { useState } from 'react';

interface LoginPageProps {
  onLogin: (username: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onLogin(username);
    }
  };

  return (
    <div className="min-h-screen bg-[#212529] flex items-center justify-center p-4 font-['Press_Start_2P']">
      <div className="nes-container is-dark with-title max-w-md w-full">
        <p className="title">Prompt Duel</p>

        <div className="nes-field is-inline mb-8 text-center w-full">
          <i className="nes-icon trophy is-large"></i>
        </div>

        <div className="mb-8 text-center">
          <p>Welcome, Challenger!</p>
          <p className="text-xs text-gray-400 mt-2">Enter the arena of prompts.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="nes-field mb-6">
            <label htmlFor="username_field">Username</label>
            <input
              type="text"
              id="username_field"
              className="nes-input is-dark"
              placeholder="Player 1"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-4">
            <button type="submit" className="nes-btn is-primary w-full">
              {isRegistering ? 'Register Passkey' : 'Login with Passkey'}
            </button>

            <button
              type="button"
              className="nes-btn w-full"
              onClick={() => setIsRegistering(!isRegistering)}
            >
              {isRegistering ? 'Switch to Login' : 'Create Account'}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center text-xs text-gray-500">
          <p>Powered by WebAuthn</p>
        </div>
      </div>
    </div>
  );
};
