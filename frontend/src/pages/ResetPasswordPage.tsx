import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { config } from '../config';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!password.trim()) {
      setError('Please enter a new password');
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

    if (!token) {
      setError('Invalid reset link. Please request a new one.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${config.apiUrl}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message || 'Password has been reset successfully.');
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show error if no token
  if (!token) {
    return (
      <div className="page-container flex items-center justify-center p-4 font-['Press_Start_2P']">
        <div className="bg-pattern"></div>

        <div className="nes-container is-dark max-w-md w-full animate-fade-in">
          <div className="text-center mb-6">
            <h1 style={{ fontSize: '1rem', color: '#e76e55', marginBottom: '24px' }}>Invalid Link</h1>
            <div style={{
              backgroundColor: '#000',
              padding: '16px',
              borderRadius: '8px',
              display: 'inline-block',
              border: '2px solid #333'
            }}>
              <img src="/logo.png" alt="Prompt Duel" style={{ height: '100px', width: 'auto', display: 'block' }} />
            </div>
          </div>

          <div
            className="nes-container is-rounded mb-6"
            style={{ borderColor: '#e76e55', background: 'rgba(231, 110, 85, 0.1)' }}
          >
            <p className="text-xs" style={{ color: '#e76e55' }}>
              This password reset link is invalid or has expired. Please request a new one.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <Link to="/forgot-password" className="nes-btn is-warning w-full text-center">
              Request New Link
            </Link>
            <Link to="/login" className="nes-btn w-full text-center">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container flex items-center justify-center p-4 font-['Press_Start_2P']">
      <div className="bg-pattern"></div>

      <div className="nes-container is-dark max-w-md w-full animate-fade-in glow-secondary">
        <div className="text-center mb-6">
          <h1 style={{ fontSize: '1rem', color: '#92cc41', marginBottom: '24px' }}>Reset Password</h1>
          <div style={{
            backgroundColor: '#000',
            padding: '16px',
            borderRadius: '8px',
            display: 'inline-block',
            border: '2px solid #333'
          }}>
            <img src="/logo.png" alt="Prompt Duel" style={{ height: '100px', width: 'auto', display: 'block' }} />
          </div>
        </div>

        <div className="mb-6 text-center">
          <p className="text-xs text-gray-400">Enter your new password below.</p>
        </div>

        {error && (
          <div
            className="nes-container is-rounded mb-4 animate-fade-in"
            style={{ borderColor: '#e76e55', background: 'rgba(231, 110, 85, 0.1)' }}
          >
            <p className="text-xs" style={{ color: '#e76e55' }}>{error}</p>
          </div>
        )}

        {success && (
          <div
            className="nes-container is-rounded mb-4 animate-fade-in"
            style={{ borderColor: '#92cc41', background: 'rgba(146, 204, 65, 0.1)' }}
          >
            <p className="text-xs" style={{ color: '#92cc41' }}>{success}</p>
            <p className="text-xs text-gray-400 mt-2">Redirecting to login...</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="nes-field mb-4">
            <label htmlFor="password_field" className="text-gray-300 mb-2 block">New Password</label>
            <input
              type="password"
              id="password_field"
              className="nes-input is-dark"
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading || !!success}
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
              disabled={isLoading || !!success}
              autoComplete="new-password"
            />
          </div>

          <div className="flex flex-col gap-4">
            <button
              type="submit"
              className="nes-btn is-success w-full"
              disabled={isLoading || !!success}
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>

            <Link to="/login" className="nes-btn w-full text-center">
              Back to Login
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
