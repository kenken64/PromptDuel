import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { config } from '../config';

export function ChangePasswordPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword.trim()) {
      setError('Please enter your current password');
      return;
    }

    if (!newPassword.trim()) {
      setError('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${config.apiUrl}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message || 'Password changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        // Redirect to lobby after 2 seconds
        setTimeout(() => {
          navigate('/lobby');
        }, 2000);
      } else {
        setError(data.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Change password error:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container flex items-center justify-center p-4 font-['Press_Start_2P']">
      <div className="bg-pattern"></div>

      <div className="nes-container is-dark max-w-md w-full animate-fade-in glow-primary">
        <div className="text-center mb-6">
          <h1 style={{ fontSize: '1rem', color: '#209cee', marginBottom: '24px' }}>Change Password</h1>
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
          <p className="text-[#209cee]">Hey {user?.username}!</p>
          <p className="text-xs text-gray-400 mt-2">Update your password below.</p>
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
            <p className="text-xs text-gray-400 mt-2">Redirecting to lobby...</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="nes-field mb-4">
            <label htmlFor="current_password_field" className="text-gray-300 mb-2 block">Current Password</label>
            <input
              type="password"
              id="current_password_field"
              className="nes-input is-dark"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isLoading || !!success}
              autoComplete="current-password"
            />
          </div>

          <div className="nes-field mb-4">
            <label htmlFor="new_password_field" className="text-gray-300 mb-2 block">New Password</label>
            <input
              type="password"
              id="new_password_field"
              className="nes-input is-dark"
              placeholder="Min 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isLoading || !!success}
              autoComplete="new-password"
            />
          </div>

          <div className="nes-field mb-6">
            <label htmlFor="confirm_password_field" className="text-gray-300 mb-2 block">Confirm New Password</label>
            <input
              type="password"
              id="confirm_password_field"
              className="nes-input is-dark"
              placeholder="Repeat new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading || !!success}
              autoComplete="new-password"
            />
          </div>

          <div className="flex flex-col gap-4">
            <button
              type="submit"
              className="nes-btn is-primary w-full"
              disabled={isLoading || !!success}
            >
              {isLoading ? 'Updating...' : 'Update Password'}
            </button>

            <Link to="/lobby" className="nes-btn w-full text-center">
              Back to Lobby
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
