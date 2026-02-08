import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { config } from '../config';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${config.apiUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message || 'Password reset link has been sent to your email.');
        setEmail('');
      } else {
        setError(data.error || 'Failed to send reset link');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container flex items-center justify-center p-4 font-['Press_Start_2P']">
      <div className="bg-pattern"></div>

      <div className="nes-container is-dark max-w-md w-full animate-fade-in glow-secondary">
        <div className="text-center mb-6">
          <h1 style={{ fontSize: '1rem', color: '#f7d51d', marginBottom: '24px' }}>Forgot Password</h1>
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
          <p className="text-xs text-gray-400">Enter your email address and we'll send you a link to reset your password.</p>
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
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="nes-field mb-6">
            <label htmlFor="email_field" className="text-gray-300 mb-2 block">Email Address</label>
            <input
              type="email"
              id="email_field"
              className="nes-input is-dark"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading || !!success}
              autoComplete="email"
            />
          </div>

          <div className="flex flex-col gap-4">
            <button
              type="submit"
              className="nes-btn is-warning w-full"
              disabled={isLoading || !!success}
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
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
