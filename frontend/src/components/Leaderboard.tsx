import { useState, useEffect } from 'react';

interface LeaderboardEntry {
  id: number;
  playerName: string;
  challenge: number;
  score: number;
  maxScore: number;
  percentage: number;
  grade: string;
  promptsUsed: number;
  createdAt: string | number;
}

interface LeaderboardProps {
  selectedChallenge?: number;
  onClose?: () => void;
}

export function Leaderboard({ selectedChallenge, onClose }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 1 | 2>(selectedChallenge || 'all');

  useEffect(() => {
    fetchLeaderboard();
  }, [filter]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const url = filter === 'all'
        ? 'http://localhost:3000/leaderboard'
        : `http://localhost:3000/leaderboard/${filter}`;
      const response = await fetch(url);
      const data = await response.json();
      setEntries(data);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
    setLoading(false);
  };

  const formatDate = (timestamp: string | number) => {
    // Handle both ISO string and Unix timestamp formats
    const date = typeof timestamp === 'string'
      ? new Date(timestamp)
      : new Date(timestamp * 1000);

    if (isNaN(date.getTime())) {
      return 'N/A';
    }

    // Format in Singapore timezone (UTC+8)
    return date.toLocaleDateString('en-SG', { timeZone: 'Asia/Singapore' }) + ' ' +
           date.toLocaleTimeString('en-SG', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit' });
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return '#92cc41';
      case 'B': return '#209cee';
      case 'C': return '#f7d51d';
      case 'D': return '#f08030';
      case 'F': return '#e76e55';
      default: return '#fff';
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <i className="nes-icon trophy is-small" style={{ marginRight: '4px' }}></i>;
    if (index === 1) return <i className="nes-icon star is-small" style={{ marginRight: '4px' }}></i>;
    if (index === 2) return <i className="nes-icon heart is-small" style={{ marginRight: '4px' }}></i>;
    return <span style={{ marginRight: '8px', opacity: 0.5 }}>#{index + 1}</span>;
  };

  return (
    <div className="nes-container is-dark with-title">
      <p className="title" style={{ fontSize: 'clamp(0.7rem, 3vw, 1rem)' }}>
        Leaderboard
      </p>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`nes-btn ${filter === 'all' ? 'is-primary' : ''}`}
          style={{ fontSize: 'clamp(0.5rem, 2vw, 0.7rem)' }}
        >
          All
        </button>
        <button
          onClick={() => setFilter(1)}
          className={`nes-btn ${filter === 1 ? 'is-success' : ''}`}
          style={{ fontSize: 'clamp(0.5rem, 2vw, 0.7rem)' }}
        >
          Challenge 1
        </button>
        <button
          onClick={() => setFilter(2)}
          className={`nes-btn ${filter === 2 ? 'is-warning' : ''}`}
          style={{ fontSize: 'clamp(0.5rem, 2vw, 0.7rem)' }}
        >
          Challenge 2
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="nes-btn is-error"
            style={{ fontSize: 'clamp(0.5rem, 2vw, 0.7rem)', marginLeft: 'auto' }}
          >
            Close
          </button>
        )}
      </div>

      {/* Leaderboard Table */}
      {loading ? (
        <div className="text-center" style={{ padding: '2rem' }}>
          <p style={{ fontSize: 'clamp(0.5rem, 2vw, 0.7rem)' }}>Loading...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center" style={{ padding: '2rem' }}>
          <p style={{ fontSize: 'clamp(0.5rem, 2vw, 0.7rem)', opacity: 0.7 }}>
            No entries yet. Be the first to compete!
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="nes-table is-bordered is-dark" style={{ width: '100%', fontSize: 'clamp(0.4rem, 1.8vw, 0.6rem)' }}>
            <thead>
              <tr>
                <th style={{ padding: '0.5rem' }}>Rank</th>
                <th style={{ padding: '0.5rem' }}>Player</th>
                <th style={{ padding: '0.5rem' }}>Challenge</th>
                <th style={{ padding: '0.5rem' }}>Score</th>
                <th style={{ padding: '0.5rem' }}>Grade</th>
                <th style={{ padding: '0.5rem' }}>Prompts</th>
                <th style={{ padding: '0.5rem' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr key={entry.id}>
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    {getRankIcon(index)}
                  </td>
                  <td style={{ padding: '0.5rem', fontWeight: index < 3 ? 'bold' : 'normal' }}>
                    {entry.playerName}
                  </td>
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    <span
                      className={`nes-badge is-splited`}
                      style={{ fontSize: 'inherit' }}
                    >
                      <span className={entry.challenge === 1 ? 'is-success' : 'is-warning'}>
                        {entry.challenge}
                      </span>
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    {entry.score}/{entry.maxScore}
                    <br />
                    <span style={{ opacity: 0.7 }}>({entry.percentage}%)</span>
                  </td>
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    <span
                      style={{
                        color: getGradeColor(entry.grade),
                        fontWeight: 'bold',
                        fontSize: 'clamp(0.6rem, 2.5vw, 1rem)',
                      }}
                    >
                      {entry.grade}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    {entry.promptsUsed}/7
                  </td>
                  <td style={{ padding: '0.5rem', fontSize: 'clamp(0.35rem, 1.5vw, 0.5rem)' }}>
                    {formatDate(entry.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
