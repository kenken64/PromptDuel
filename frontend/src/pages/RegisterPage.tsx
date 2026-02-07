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
    <div className="min-h-screen bg-[#212529] flex items-center justify-center p-4 font-['Press_Start_2P']">
      <div className="nes-container is-dark with-title max-w-md w-full">
        <p className="title">Create Account</p>

        <div className="nes-field is-inline mb-6 text-center w-full">
          <i className="nes-icon star is-large"></i>
        </div>

        <div className="mb-6 text-center">
          <p className="text-xs text-gray-400">Join the arena and compete!</p>
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
              placeholder="3-20 characters"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              autoComplete="username"
              maxLength={20}
            />
          </div>

          <div className="nes-field mb-4">
            <label htmlFor="email_field">Email</label>
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
            <label htmlFor="password_field">Password</label>
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
            <label htmlFor="confirm_password_field">Confirm Password</label>
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

        <div className="mt-6 text-center">
          <Link to="/" className="text-xs text-gray-400 hover:text-white">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
