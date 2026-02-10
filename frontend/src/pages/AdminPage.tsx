import { useState, useEffect, useCallback } from 'react';
import { config } from '../config';

interface Challenge {
  id: number;
  name: string;
  shortName: string;
  difficulty: string;
  description: string;
  longDescription: string;
  videoUrl: string;
  systemPrompt: string;
  active: boolean;
  createdAt: string;
}

interface Stats {
  userCount: number;
  challengeCount: number;
  roomCount: number;
}

const EMPTY_CHALLENGE = {
  name: '',
  shortName: '',
  difficulty: 'beginner',
  description: '',
  longDescription: '',
  videoUrl: '',
  systemPrompt: '',
  active: true,
};

function adminFetch(path: string, options: RequestInit = {}) {
  const password = sessionStorage.getItem('adminPassword') || '';
  return fetch(`${config.apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Password': password,
      ...options.headers,
    },
  });
}

// Retro flip-counter digit
function CounterDigit({ value }: { value: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        backgroundColor: '#111',
        color: '#92cc41',
        border: '2px solid #333',
        borderRadius: '4px',
        padding: '4px 8px',
        margin: '0 2px',
        fontFamily: "'Press Start 2P', monospace",
        fontSize: '1.2rem',
        minWidth: '1.6rem',
        textAlign: 'center',
      }}
    >
      {value}
    </span>
  );
}

function FlipCounter({ label, count }: { label: string; count: number }) {
  const digits = String(count).padStart(3, '0').split('');
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ marginBottom: '8px' }}>
        {digits.map((d, i) => (
          <CounterDigit key={i} value={d} />
        ))}
      </div>
      <p style={{ fontSize: '0.55rem', color: '#888', margin: 0 }}>{label}</p>
    </div>
  );
}

export function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [stats, setStats] = useState<Stats>({ userCount: 0, challengeCount: 0, roomCount: 0 });
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Edit/create form
  const [editingId, setEditingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_CHALLENGE);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Check if already authenticated on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('adminPassword');
    if (stored) {
      // Validate stored password
      fetch(`${config.apiUrl}/admin/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: stored }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) setAuthenticated(true);
          else sessionStorage.removeItem('adminPassword');
        })
        .catch(() => sessionStorage.removeItem('adminPassword'));
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [statsRes, challengesRes] = await Promise.all([
        adminFetch('/admin/stats'),
        adminFetch('/admin/challenges'),
      ]);
      const statsData = await statsRes.json();
      const challengesData = await challengesRes.json();
      if (statsData.success) setStats(statsData);
      if (challengesData.success) setChallenges(challengesData.challenges);
    } catch {
      setToast({ message: 'Failed to load data', type: 'error' });
    }
  }, []);

  // Load data after authentication
  useEffect(() => {
    if (authenticated) loadData();
  }, [authenticated, loadData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await fetch(`${config.apiUrl}/admin/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem('adminPassword', password);
        setAuthenticated(true);
      } else {
        setLoginError(data.error || 'Invalid password');
      }
    } catch {
      setLoginError('Network error');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminPassword');
    setAuthenticated(false);
    setPassword('');
  };

  const startCreate = () => {
    setEditingId(null);
    setForm(EMPTY_CHALLENGE);
    setCreating(true);
  };

  const startEdit = (c: Challenge) => {
    setCreating(false);
    setEditingId(c.id);
    setForm({
      name: c.name,
      shortName: c.shortName,
      difficulty: c.difficulty,
      description: c.description,
      longDescription: c.longDescription,
      videoUrl: c.videoUrl,
      systemPrompt: c.systemPrompt,
      active: c.active,
    });
  };

  const cancelForm = () => {
    setEditingId(null);
    setCreating(false);
    setForm(EMPTY_CHALLENGE);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const isEdit = editingId !== null;
      const url = isEdit ? `/admin/challenges/${editingId}` : '/admin/challenges';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await adminFetch(url, {
        method,
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setToast({ message: isEdit ? 'Challenge updated' : 'Challenge created', type: 'success' });
        cancelForm();
        loadData();
      } else {
        setToast({ message: data.error || 'Save failed', type: 'error' });
      }
    } catch {
      setToast({ message: 'Network error', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await adminFetch(`/admin/challenges/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setToast({ message: 'Challenge deleted', type: 'success' });
        setDeletingId(null);
        loadData();
      } else {
        setToast({ message: data.error || 'Delete failed', type: 'error' });
      }
    } catch {
      setToast({ message: 'Network error', type: 'error' });
    }
  };

  const handleToggleActive = async (c: Challenge) => {
    try {
      const res = await adminFetch(`/admin/challenges/${c.id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: !c.active }),
      });
      const data = await res.json();
      if (data.success) {
        setToast({ message: `Challenge ${!c.active ? 'activated' : 'deactivated'}`, type: 'success' });
        loadData();
      } else {
        setToast({ message: data.error || 'Update failed', type: 'error' });
      }
    } catch {
      setToast({ message: 'Network error', type: 'error' });
    }
  };

  // --- PASSWORD GATE ---
  if (!authenticated) {
    return (
      <div className="page-container flex items-center justify-center p-4 font-['Press_Start_2P']">
        <div className="bg-pattern"></div>

        <div className="nes-container is-dark max-w-md w-full animate-fade-in glow-primary">
          <div className="text-center mb-6">
            <h1 style={{ fontSize: '1.2rem', color: '#f7d51d', marginBottom: '24px' }}>Admin Panel</h1>
            <div style={{
              backgroundColor: '#000',
              padding: '16px',
              borderRadius: '8px',
              display: 'inline-block',
              border: '2px solid #333',
            }}>
              <img src="/logo.png" alt="Prompt Duel" style={{ height: '150px', width: 'auto', display: 'block' }} />
            </div>
          </div>

          <div className="mb-8 text-center">
            <p className="text-[#f7d51d] glow-text">Restricted Access</p>
            <p className="text-xs text-gray-400 mt-3">Enter the admin password to continue.</p>
          </div>

          {loginError && (
            <div
              className="nes-container is-rounded mb-4 animate-fade-in"
              style={{ borderColor: '#e76e55', background: 'rgba(231, 110, 85, 0.1)' }}
            >
              <p className="text-xs" style={{ color: '#e76e55' }}>{loginError}</p>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="nes-field mb-4">
              <label htmlFor="admin_password" className="text-gray-300 mb-2 block">Password</label>
              <input
                id="admin_password"
                type="password"
                className="nes-input is-dark"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loginLoading}
                autoFocus
              />
            </div>

            <div style={{ textAlign: 'center' }}>
              <button
                type="submit"
                className="nes-btn is-warning"
                disabled={loginLoading || !password}
              >
                {loginLoading ? 'Validating...' : 'Authenticate'}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-700 text-center">
            <a href="/" className="text-xs text-gray-400 hover:text-[#92cc41] transition-colors">
              &lt; Back to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  // --- DASHBOARD ---
  const isFormOpen = creating || editingId !== null;

  return (
    <div className="page-container p-4 font-['Press_Start_2P']" style={{ minHeight: '100vh' }}>
      <div className="bg-pattern"></div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div className="flex justify-between items-center mb-6" style={{ flexWrap: 'wrap', gap: '8px' }}>
          <h1 style={{ fontSize: '1rem', color: '#209cee', margin: 0 }}>Admin Dashboard</h1>
          <button className="nes-btn is-error" onClick={handleLogout} style={{ fontSize: '0.55rem' }}>
            Logout
          </button>
        </div>

        {/* Stats Bar */}
        <div
          className="nes-container is-dark is-rounded mb-6"
          style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '16px', padding: '20px' }}
        >
          <FlipCounter label="Registered Users" count={stats.userCount} />
          <FlipCounter label="Challenges" count={stats.challengeCount} />
          <FlipCounter label="Active Rooms" count={stats.roomCount} />
        </div>

        {/* Challenges Section */}
        <div className="nes-container is-dark is-rounded mb-6">
          <div className="flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: '8px' }}>
            <h2 style={{ fontSize: '0.8rem', color: '#f7d51d', margin: 0 }}>Challenges</h2>
            {!isFormOpen && (
              <button className="nes-btn is-success" onClick={startCreate} style={{ fontSize: '0.55rem' }}>
                + New Challenge
              </button>
            )}
          </div>

          {/* Create/Edit Form */}
          {isFormOpen && (
            <div
              className="nes-container is-rounded mb-4"
              style={{ borderColor: '#209cee', background: 'rgba(32, 156, 238, 0.05)' }}
            >
              <h3 style={{ fontSize: '0.7rem', color: '#209cee', marginBottom: '16px' }}>
                {creating ? 'Create Challenge' : 'Edit Challenge'}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="nes-field">
                  <label style={{ fontSize: '0.5rem', color: '#aaa' }}>Name</label>
                  <input
                    className="nes-input is-dark"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    style={{ fontSize: '0.6rem' }}
                  />
                </div>
                <div className="nes-field">
                  <label style={{ fontSize: '0.5rem', color: '#aaa' }}>Short Name</label>
                  <input
                    className="nes-input is-dark"
                    value={form.shortName}
                    onChange={(e) => setForm({ ...form, shortName: e.target.value })}
                    style={{ fontSize: '0.6rem' }}
                  />
                </div>
                <div className="nes-field">
                  <label style={{ fontSize: '0.5rem', color: '#aaa' }}>Difficulty</label>
                  <select
                    className="nes-select is-dark"
                    value={form.difficulty}
                    onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                    style={{ fontSize: '0.6rem', color: '#fff', backgroundColor: '#212529' }}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div className="nes-field">
                  <label style={{ fontSize: '0.5rem', color: '#aaa' }}>Video URL</label>
                  <input
                    className="nes-input is-dark"
                    value={form.videoUrl}
                    onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                    style={{ fontSize: '0.6rem' }}
                  />
                </div>
              </div>

              <div className="nes-field" style={{ marginTop: '12px' }}>
                <label style={{ fontSize: '0.5rem', color: '#aaa' }}>Description (short)</label>
                <input
                  className="nes-input is-dark"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={{ fontSize: '0.6rem' }}
                />
              </div>

              <div className="nes-field" style={{ marginTop: '12px' }}>
                <label style={{ fontSize: '0.5rem', color: '#aaa' }}>Long Description</label>
                <textarea
                  className="nes-textarea is-dark"
                  value={form.longDescription}
                  onChange={(e) => setForm({ ...form, longDescription: e.target.value })}
                  style={{ fontSize: '0.6rem', minHeight: '80px' }}
                />
              </div>

              <div className="nes-field" style={{ marginTop: '12px' }}>
                <label style={{ fontSize: '0.5rem', color: '#aaa' }}>System Prompt</label>
                <textarea
                  className="nes-textarea is-dark"
                  value={form.systemPrompt}
                  onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                  style={{ fontSize: '0.6rem', minHeight: '120px', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ fontSize: '0.5rem', color: '#aaa' }}>
                  <input
                    type="checkbox"
                    className="nes-checkbox is-dark"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  />
                  <span style={{ marginLeft: '8px' }}>Active</span>
                </label>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                <button
                  className="nes-btn is-primary"
                  onClick={handleSave}
                  disabled={saving || !form.name || !form.shortName || !form.description || !form.systemPrompt}
                  style={{ fontSize: '0.55rem' }}
                >
                  {saving ? 'Saving...' : creating ? 'Create' : 'Update'}
                </button>
                <button className="nes-btn" onClick={cancelForm} style={{ fontSize: '0.55rem' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Challenges Table */}
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.55rem',
                color: '#ccc',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '2px solid #444' }}>
                  <th style={{ padding: '8px 6px', textAlign: 'left', color: '#888' }}>ID</th>
                  <th style={{ padding: '8px 6px', textAlign: 'left', color: '#888' }}>Short Name</th>
                  <th style={{ padding: '8px 6px', textAlign: 'left', color: '#888' }}>Difficulty</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', color: '#888' }}>Active</th>
                  <th style={{ padding: '8px 6px', textAlign: 'right', color: '#888' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {challenges.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: '#666' }}>
                      No challenges found
                    </td>
                  </tr>
                )}
                {challenges.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #333' }}>
                    <td style={{ padding: '8px 6px' }}>{c.id}</td>
                    <td style={{ padding: '8px 6px' }}>{c.shortName}</td>
                    <td style={{ padding: '8px 6px' }}>
                      <span
                        style={{
                          color: c.difficulty === 'beginner' ? '#92cc41' : '#e76e55',
                        }}
                      >
                        {c.difficulty}
                      </span>
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleToggleActive(c)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '1rem',
                        }}
                        title={c.active ? 'Click to deactivate' : 'Click to activate'}
                      >
                        {c.active ? '🟢' : '🔴'}
                      </button>
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                        <button
                          className="nes-btn is-warning"
                          onClick={() => startEdit(c)}
                          style={{ fontSize: '0.45rem', padding: '4px 8px' }}
                        >
                          Edit
                        </button>
                        {deletingId === c.id ? (
                          <>
                            <button
                              className="nes-btn is-error"
                              onClick={() => handleDelete(c.id)}
                              style={{ fontSize: '0.45rem', padding: '4px 8px' }}
                            >
                              Confirm
                            </button>
                            <button
                              className="nes-btn"
                              onClick={() => setDeletingId(null)}
                              style={{ fontSize: '0.45rem', padding: '4px 8px' }}
                            >
                              No
                            </button>
                          </>
                        ) : (
                          <button
                            className="nes-btn is-error"
                            onClick={() => setDeletingId(c.id)}
                            style={{ fontSize: '0.45rem', padding: '4px 8px' }}
                          >
                            Del
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            padding: '12px 24px',
            backgroundColor: toast.type === 'success' ? '#92cc41' : '#e76e55',
            color: '#000',
            fontSize: '0.7rem',
            fontFamily: "'Press Start 2P', cursive",
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            border: '4px solid',
            borderColor: toast.type === 'success' ? '#76a832' : '#c0503a',
            animation: 'fadeIn 0.3s ease',
            cursor: 'pointer',
          }}
          onClick={() => setToast(null)}
        >
          {toast.type === 'success' ? '+ ' : 'x '}
          {toast.message}
        </div>
      )}
    </div>
  );
}
