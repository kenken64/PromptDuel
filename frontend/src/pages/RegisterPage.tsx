import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!username.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }

    setIsLoading(true);
    const result = await register(username.trim(), email.trim(), password);
    setIsLoading(false);

    if (result.success) {
      navigate('/lobby', { replace: true });
    } else {
      setError(result.error || 'Registration failed');
    }
  };

  return (
    <div className="page-container flex items-center justify-center p-4 font-['Press_Start_2P']">
      <div className="bg-pattern"></div>

      <div className="nes-container is-dark max-w-md w-full animate-fade-in glow-secondary">
        <div className="text-center mb-6">
          <h1 style={{ fontSize: '1.2rem', color: '#209cee', marginBottom: '24px' }}>Create Account</h1>
          <div style={{
            backgroundColor: '#000',
            padding: '16px',
            borderRadius: '8px',
            display: 'inline-block',
            border: '2px solid #333'
          }}>
            <img src="/logo.png" alt="Prompt Duel" style={{ height: '120px', width: 'auto', display: 'block' }} />
          </div>
        </div>

        <div className="mb-6 text-center">
          <p className="text-[#209cee] glow-text">Join the Arena!</p>
          <p className="text-xs text-gray-400 mt-2">Create your account to compete</p>
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
              placeholder="3-20 characters"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              autoComplete="username"
              maxLength={20}
            />
          </div>

          <div className="nes-field mb-4">
            <label htmlFor="email_field" className="text-gray-300 mb-2 block">Email</label>
            <input
              type="email"
              id="email_field"
              className="nes-input is-dark"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <div className="nes-field mb-4">
            <label htmlFor="password_field" className="text-gray-300 mb-2 block">Password</label>
            <input
              type="password"
              id="password_field"
              className="nes-input is-dark"
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="new-password"
            />
          </div>

          <div className="nes-field mb-6">
            <label htmlFor="confirm_password_field" className="text-gray-300 mb-2 block">Confirm Password</label>
            <input
              type="password"
              id="confirm_password_field"
              className="nes-input is-dark"
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="new-password"
            />
          </div>

          <div className="flex flex-col gap-4">
            <button
              type="submit"
              className="nes-btn is-success w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Account'}
            </button>

            <Link to="/login" className="nes-btn w-full text-center">
              Back to Login
            </Link>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-700 text-center">
          <Link to="/" className="text-xs text-gray-400 hover:text-[#209cee] transition-colors">
            &lt; Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
