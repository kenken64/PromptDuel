import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the intended destination or default to lobby
  const from = (location.state as any)?.from?.pathname || '/lobby';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    const result = await login(username.trim(), password);
    setIsLoading(false);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error || 'Login failed');
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

        {error && (
          <div className="nes-container is-rounded is-error mb-4">
            <p className="text-xs">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="nes-field mb-4">
            <label htmlFor="username_field">Username</label>
            <input
              type="text"
              id="username_field"
              className="nes-input is-dark"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              autoComplete="username"
            />
          </div>

          <div className="nes-field mb-6">
            <label htmlFor="password_field">Password</label>
            <input
              type="password"
              id="password_field"
              className="nes-input is-dark"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          <div className="flex flex-col gap-4">
            <button
              type="submit"
              className="nes-btn is-primary w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>

            <Link to="/register" className="nes-btn w-full text-center">
              Create Account
            </Link>
          </div>
        </form>

        <div className="mt-6 text-center">
          <Link to="/" className="text-xs text-gray-400 hover:text-white">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
