import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const COMMON_TIMEZONES = [
  'Asia/Singapore',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
  'Pacific/Auckland',
];

function getAllTimezones(): string[] {
  try {
    return (Intl as any).supportedValuesOf('timeZone');
  } catch {
    return COMMON_TIMEZONES;
  }
}

export function SettingsPage() {
  const { user, updateTimezone } = useAuth();
  const [selectedTimezone, setSelectedTimezone] = useState(user?.timezone || 'Asia/Singapore');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const allTimezones = getAllTimezones();

  // Build grouped options: common first, then all others
  const otherTimezones = allTimezones.filter((tz) => !COMMON_TIMEZONES.includes(tz));

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const result = await updateTimezone(selectedTimezone);
      if (result.success) {
        setSuccess('Timezone updated successfully!');
      } else {
        setError(result.error || 'Failed to update timezone');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const now = new Date();
  let previewTime = '';
  try {
    previewTime = now.toLocaleTimeString('en-US', {
      timeZone: selectedTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    previewTime = 'Invalid timezone';
  }

  return (
    <div className="page-container flex items-center justify-center p-4 font-['Press_Start_2P']">
      <div className="bg-pattern"></div>

      <div className="nes-container is-dark max-w-md w-full animate-fade-in glow-primary">
        <div className="text-center mb-6">
          <h1 style={{ fontSize: '1rem', color: '#209cee', marginBottom: '24px' }}>Settings</h1>
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
          <p className="text-xs text-gray-400 mt-2">Configure your preferences below.</p>
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

        <div className="nes-field mb-4">
          <label htmlFor="timezone_select" className="text-gray-300 mb-2 block">Timezone</label>
          <select
            id="timezone_select"
            className="nes-select is-dark"
            value={selectedTimezone}
            onChange={(e) => {
              setSelectedTimezone(e.target.value);
              setSuccess('');
            }}
            disabled={isLoading}
            style={{ fontSize: '0.65rem', width: '100%', color: '#fff', backgroundColor: '#212529' }}
          >
            <optgroup label="Common Timezones" style={{ backgroundColor: '#212529', color: '#fff' }}>
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz} style={{ backgroundColor: '#212529', color: '#fff' }}>{tz}</option>
              ))}
            </optgroup>
            <optgroup label="All Timezones" style={{ backgroundColor: '#212529', color: '#fff' }}>
              {otherTimezones.map((tz) => (
                <option key={tz} value={tz} style={{ backgroundColor: '#212529', color: '#fff' }}>{tz}</option>
              ))}
            </optgroup>
          </select>
        </div>

        <div className="mb-6" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.55rem', color: '#888' }}>
            Current time: <span style={{ color: '#f7d51d' }}>{previewTime}</span>
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <button
            onClick={handleSave}
            className="nes-btn is-primary w-full"
            disabled={isLoading || selectedTimezone === user?.timezone}
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>

          <Link to="/lobby" className="nes-btn w-full text-center">
            Back to Lobby
          </Link>
        </div>
      </div>
    </div>
  );
}
