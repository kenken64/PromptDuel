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
    <div className="page-container flex items-center justify-center p-4 font-['Press_Start_2P']">
      <div className="bg-pattern"></div>

      <div className="nes-container is-dark max-w-md w-full animate-fade-in glow-primary">
        <div className="text-center mb-6">
          <h1 style={{ fontSize: '1.2rem', color: '#92cc41', marginBottom: '24px' }}>Prompt Duel</h1>
          <div style={{
            backgroundColor: '#000',
            padding: '16px',
            borderRadius: '8px',
            display: 'inline-block',
            border: '2px solid #333'
          }}>
            <img src="/logo.png" alt="Prompt Duel" style={{ height: '150px', width: 'auto', display: 'block' }} />
          </div>
        </div>

        <div className="mb-8 text-center">
          <p className="text-[#92cc41] glow-text">Welcome, Challenger!</p>
          <p className="text-xs text-gray-400 mt-3">Enter the arena of AI prompts.</p>
        </div>

        {error && (
          <div
            className="nes-container is-rounded mb-4 animate-fade-in"
            style={{ borderColor: '#e76e55', background: 'rgba(231, 110, 85, 0.1)' }}
          >
            <p className="text-xs" style={{ color: '#e76e55' }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="nes-field mb-4">
            <label htmlFor="username_field" className="text-gray-300 mb-2 block">Username</label>
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
            <label htmlFor="password_field" className="text-gray-300 mb-2 block">Password</label>
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
              {isLoading ? 'Entering Arena...' : 'Enter Arena'}
            </button>

            <Link to="/register" className="nes-btn is-success w-full text-center">
              Create Account
            </Link>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-700 text-center">
          <Link to="/" className="text-xs text-gray-400 hover:text-[#92cc41] transition-colors">
            &lt; Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
