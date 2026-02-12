import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface Room {
  id: number;
  code: string;
  challenge: number;
  status: string;
  hostUsername: string;
  player1Username?: string;
  player2Username?: string;
  player1Ready?: boolean;
  player2Ready?: boolean;
  spectatorCount?: number;
}

interface MobileLobbyLayoutProps {
  username: string;
  rooms: Room[];
  isLoading: boolean;
  onCreateRoom: (challenge: number, timerMinutes?: number) => void;
  onJoinRoom: (code: string) => void;
  onSpectate: (code: string) => void;
  onRefresh: () => void;
  onLogout: () => void;
  onShowLeaderboard: () => void;
}

export function MobileLobbyLayout({
  username,
  rooms,
  isLoading,
  onCreateRoom,
  onJoinRoom,
  onSpectate,
  onRefresh,
  onLogout,
  onShowLeaderboard,
}: MobileLobbyLayoutProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'waiting' | 'playing'>('all');
  const [challengeFilter, setChallengeFilter] = useState<'all' | 1 | 2>('all');
  const [selectedChallenge, setSelectedChallenge] = useState<1 | 2>(1);
  const [selectedTimer, setSelectedTimer] = useState<20 | 30 | 60>(20);

  // Filter rooms
  const filteredRooms = rooms.filter((room) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === '' ||
      room.code.toLowerCase().includes(searchLower) ||
      room.hostUsername.toLowerCase().includes(searchLower) ||
      room.player1Username?.toLowerCase().includes(searchLower) ||
      room.player2Username?.toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === 'all' || room.status === statusFilter;
    const matchesChallenge = challengeFilter === 'all' || room.challenge === challengeFilter;

    return matchesSearch && matchesStatus && matchesChallenge;
  });

  const handleJoinByCode = () => {
    if (joinCode.trim()) {
      onJoinRoom(joinCode.trim().toUpperCase());
      setJoinCode('');
      setShowJoinModal(false);
    }
  };

  return (
    <div className="page-container mobile-safe-top mobile-safe-bottom">
      {/* Header */}
      <header className="app-header" style={{ padding: '0.5rem 0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src="/logo.png" alt="Prompt Duel" style={{ height: '35px' }} />
            <span style={{ fontSize: '0.7rem', color: '#92cc41' }}>Lobby</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.4rem', color: '#888' }}>{username}</span>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <Link
                to="/settings"
                className="nes-btn"
                style={{ fontSize: '0.3rem', padding: '0.2rem 0.4rem', minHeight: 'auto', textDecoration: 'none' }}
              >
                Settings
              </Link>
              <Link
                to="/change-password"
                className="nes-btn"
                style={{ fontSize: '0.3rem', padding: '0.2rem 0.4rem', minHeight: 'auto', textDecoration: 'none' }}
              >
                Password
              </Link>
              <button
                onClick={onLogout}
                className="nes-btn is-error"
                style={{ fontSize: '0.3rem', padding: '0.2rem 0.4rem', minHeight: 'auto' }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="page-content" style={{ padding: '0.75rem' }}>
        {/* Action Buttons Row */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowCreateModal(true)}
            className="nes-btn is-success"
            style={{ flex: '1 1 45%', fontSize: '0.45rem', padding: '0.5rem' }}
          >
            + Create Room
          </button>
          <button
            onClick={() => setShowJoinModal(true)}
            className="nes-btn is-primary"
            style={{ flex: '1 1 45%', fontSize: '0.45rem', padding: '0.5rem' }}
          >
            Join by Code
          </button>
          <button
            onClick={onShowLeaderboard}
            className="nes-btn is-warning"
            style={{ flex: '1 1 100%', fontSize: '0.45rem', padding: '0.5rem' }}
          >
            Leaderboard
          </button>
        </div>

        {/* Search & Filter */}
        <div className="nes-container is-dark" style={{ padding: '0.5rem', marginBottom: '0.75rem' }}>
          {/* Search Input */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rooms..."
            className="nes-input is-dark"
            style={{ fontSize: '0.45rem', padding: '0.4rem', marginBottom: '0.5rem' }}
          />

          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'waiting' | 'playing')}
              className="nes-select is-dark"
              style={{ fontSize: '0.4rem', padding: '0.25rem', flex: '1' }}
            >
              <option value="all">All Status</option>
              <option value="waiting">Waiting</option>
              <option value="playing">Playing</option>
            </select>

            {/* Challenge Filter */}
            <select
              value={challengeFilter}
              onChange={(e) => setChallengeFilter(e.target.value === 'all' ? 'all' : Number(e.target.value) as 1 | 2)}
              className="nes-select is-dark"
              style={{ fontSize: '0.4rem', padding: '0.25rem', flex: '1' }}
            >
              <option value="all">All Challenges</option>
              <option value="1">Challenge 1</option>
              <option value="2">Challenge 2</option>
            </select>
          </div>
        </div>

        {/* Rooms List Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.5rem', color: '#92cc41' }}>
            Rooms ({filteredRooms.length})
          </span>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="nes-btn"
            style={{ fontSize: '0.35rem', padding: '0.2rem 0.4rem', minHeight: 'auto' }}
          >
            {isLoading ? '...' : 'Refresh'}
          </button>
        </div>

        {/* Rooms List */}
        <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
          {isLoading ? (
            <div className="nes-container is-dark" style={{ textAlign: 'center', padding: '2rem' }}>
              <span style={{ fontSize: '0.5rem', color: '#888' }}>Loading...</span>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="nes-container is-dark" style={{ textAlign: 'center', padding: '2rem' }}>
              <span style={{ fontSize: '0.45rem', color: '#666' }}>
                {rooms.length === 0 ? 'No rooms available. Create one!' : 'No rooms match your filters.'}
              </span>
            </div>
          ) : (
            filteredRooms.map((room) => (
              <div
                key={room.id}
                className="nes-container is-dark"
                style={{
                  marginBottom: '0.5rem',
                  padding: '0.6rem',
                  borderColor: room.status === 'playing' ? '#f7d51d' : '#333',
                }}
              >
                {/* Room Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.55rem', color: '#92cc41', fontWeight: 'bold' }}>{room.code}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span
                      style={{
                        fontSize: '0.35rem',
                        padding: '0.1rem 0.25rem',
                        background: room.status === 'waiting' ? '#92cc41' : '#f7d51d',
                        color: '#000',
                      }}
                    >
                      {room.status === 'waiting' ? 'WAITING' : 'PLAYING'}
                    </span>
                    <span
                      style={{
                        fontSize: '0.35rem',
                        padding: '0.1rem 0.25rem',
                        background: '#209cee',
                        color: '#fff',
                      }}
                    >
                      C{room.challenge}
                    </span>
                  </div>
                </div>

                {/* Host */}
                <div style={{ fontSize: '0.4rem', color: '#888', marginBottom: '0.3rem' }}>
                  Host: <span style={{ color: '#ccc' }}>{room.hostUsername}</span>
                </div>

                {/* Players */}
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.4rem', fontSize: '0.38rem' }}>
                  <div style={{ color: room.player1Username ? '#92cc41' : '#666' }}>
                    P1: {room.player1Username || 'Empty'}
                    {room.player1Ready && <span style={{ color: '#92cc41', marginLeft: '0.2rem' }}>✓</span>}
                  </div>
                  <div style={{ color: room.player2Username ? '#92cc41' : '#666' }}>
                    P2: {room.player2Username || 'Empty'}
                    {room.player2Ready && <span style={{ color: '#92cc41', marginLeft: '0.2rem' }}>✓</span>}
                  </div>
                  {(room.spectatorCount ?? 0) > 0 && (
                    <div style={{ color: '#888' }}>
                      👁 {room.spectatorCount}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {room.status === 'waiting' && !room.player2Username && (
                    <button
                      onClick={() => onJoinRoom(room.code)}
                      className="nes-btn is-primary"
                      style={{ flex: 1, fontSize: '0.35rem', padding: '0.3rem' }}
                    >
                      Join as Player
                    </button>
                  )}
                  <button
                    onClick={() => onSpectate(room.code)}
                    className="nes-btn is-warning"
                    style={{ flex: 1, fontSize: '0.35rem', padding: '0.3rem' }}
                  >
                    Spectate
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="nes-container is-dark with-title"
            style={{ width: '100%', maxWidth: '320px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="title" style={{ fontSize: '0.55rem' }}>Create Room</p>

            {/* Challenge Selection */}
            <p style={{ fontSize: '0.4rem', color: '#888', marginBottom: '0.5rem' }}>
              Select Challenge:
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button
                onClick={() => setSelectedChallenge(1)}
                className={`nes-btn ${selectedChallenge === 1 ? 'is-primary' : ''}`}
                style={{ flex: 1, fontSize: '0.4rem', padding: '0.5rem' }}
              >
                C1 Beginner
              </button>
              <button
                onClick={() => setSelectedChallenge(2)}
                className={`nes-btn ${selectedChallenge === 2 ? 'is-success' : ''}`}
                style={{ flex: 1, fontSize: '0.4rem', padding: '0.5rem' }}
              >
                C2 Advanced
              </button>
            </div>

            {/* Timer Selection */}
            <p style={{ fontSize: '0.4rem', color: '#888', marginBottom: '0.5rem' }}>
              Game Timer:
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              {[20, 30, 60].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setSelectedTimer(mins as 20 | 30 | 60)}
                  className={`nes-btn ${selectedTimer === mins ? 'is-warning' : ''}`}
                  style={{ flex: 1, fontSize: '0.4rem', padding: '0.5rem' }}
                >
                  {mins}m
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  onCreateRoom(selectedChallenge, selectedTimer);
                  setShowCreateModal(false);
                }}
                className="nes-btn is-success"
                style={{ flex: 1, fontSize: '0.45rem' }}
              >
                Create
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="nes-btn"
                style={{ flex: 1, fontSize: '0.45rem' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join by Code Modal */}
      {showJoinModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setShowJoinModal(false)}
        >
          <div
            className="nes-container is-dark with-title"
            style={{ width: '100%', maxWidth: '300px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="title" style={{ fontSize: '0.55rem' }}>Join Room</p>
            <p style={{ fontSize: '0.4rem', color: '#888', marginBottom: '0.75rem' }}>
              Enter the room code to join:
            </p>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ROOM CODE"
              className="nes-input is-dark"
              style={{ fontSize: '0.55rem', textAlign: 'center', marginBottom: '0.75rem' }}
              maxLength={6}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleJoinByCode}
                disabled={!joinCode.trim()}
                className="nes-btn is-primary"
                style={{ flex: 1, fontSize: '0.45rem', opacity: !joinCode.trim() ? 0.5 : 1 }}
              >
                Join
              </button>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinCode('');
                }}
                className="nes-btn"
                style={{ flex: 1, fontSize: '0.45rem' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
