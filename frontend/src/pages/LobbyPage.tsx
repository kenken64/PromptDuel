import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRoom } from '../contexts/RoomContext';
import { Leaderboard } from '../components/Leaderboard';
import { config } from '../config';
import { useIsMobile } from '../hooks/useIsMobile';
import { MobileLobbyLayout } from '../components/mobile';

interface RoomInfo {
  id: number;
  code: string;
  challenge: number;
  status: string;
  hostUsername: string;
  player1Username: string | null;
  player2Username: string | null;
  player1Ready: boolean;
  player2Ready: boolean;
  spectatorCount: number;
  createdAt: Date;
}

export function LobbyPage() {
  const { user, logout, token } = useAuth();
  const { createRoom, joinRoom, spectateRoom, isLoading } = useRoom();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [selectedChallenge, setSelectedChallenge] = useState<1 | 2>(1);
  const [selectedTimer, setSelectedTimer] = useState<20 | 30 | 60>(20);

  // Filter and pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'waiting' | 'playing'>('all');
  const [challengeFilter, setChallengeFilter] = useState<'all' | 1 | 2>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const roomsPerPage = 6;
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const fetchRooms = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${config.apiUrl}/rooms`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setRooms(data.rooms);
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    } finally {
      setIsLoadingRooms(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 10000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  // Filter rooms based on search, status, and challenge
  const filteredRooms = rooms.filter((room) => {
    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === '' ||
      room.code.toLowerCase().includes(searchLower) ||
      room.hostUsername.toLowerCase().includes(searchLower) ||
      room.player1Username?.toLowerCase().includes(searchLower) ||
      room.player2Username?.toLowerCase().includes(searchLower);

    // Status filter
    const matchesStatus = statusFilter === 'all' || room.status === statusFilter;

    // Challenge filter
    const matchesChallenge = challengeFilter === 'all' || room.challenge === challengeFilter;

    return matchesSearch && matchesStatus && matchesChallenge;
  });

  // Pagination
  const totalPages = Math.ceil(filteredRooms.length / roomsPerPage);
  const startIndex = (currentPage - 1) * roomsPerPage;
  const paginatedRooms = filteredRooms.slice(startIndex, startIndex + roomsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, challengeFilter]);

  const handleCreateRoom = async () => {
    setError('');
    const result = await createRoom(selectedChallenge, selectedTimer);

    if (result.success && result.code) {
      setShowCreateModal(false);
      navigate(`/room/${result.code}`);
    } else {
      setError(result.error || 'Failed to create room');
    }
  };

  const handleJoinRoom = async (code: string, asSpectator: boolean = false, roomStatus?: string) => {
    setError('');
    const result = asSpectator ? await spectateRoom(code) : await joinRoom(code);

    if (result.success) {
      setShowJoinModal(false);
      setJoinCode('');
      if (asSpectator && roomStatus === 'playing') {
        navigate(`/spectate/${code}`);
      } else {
        navigate(`/room/${code}`);
      }
    } else {
      setError(result.error || 'Failed to join room');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isMobile = useIsMobile();

  // Mobile handlers
  const handleMobileCreateRoom = async (challenge: number, timerMinutes: number = 20) => {
    const result = await createRoom(challenge, timerMinutes);
    if (result.success && result.code) {
      navigate(`/room/${result.code}`);
    }
  };

  const handleMobileJoinRoom = async (code: string) => {
    const result = await joinRoom(code);
    if (result.success) {
      navigate(`/room/${code}`);
    }
  };

  const handleMobileSpectate = async (code: string) => {
    const result = await spectateRoom(code);
    if (result.success) {
      navigate(`/game/${code}`);
    }
  };

  // Mobile Layout
  if (isMobile) {
    return (
      <>
        <MobileLobbyLayout
          username={user?.username || ''}
          rooms={rooms.map(r => ({
            id: r.id,
            code: r.code,
            challenge: r.challenge,
            status: r.status,
            hostUsername: r.hostUsername,
            player1Username: r.player1Username || undefined,
            player2Username: r.player2Username || undefined,
            player1Ready: r.player1Ready,
            player2Ready: r.player2Ready,
            spectatorCount: r.spectatorCount,
          }))}
          isLoading={isLoadingRooms}
          onCreateRoom={handleMobileCreateRoom}
          onJoinRoom={handleMobileJoinRoom}
          onSpectate={handleMobileSpectate}
          onRefresh={fetchRooms}
          onLogout={handleLogout}
          onShowLeaderboard={() => setShowLeaderboard(true)}
        />
        {/* Leaderboard Modal for Mobile */}
        {showLeaderboard && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.9)',
              zIndex: 1000,
              overflow: 'auto',
              padding: '1rem',
            }}
          >
            <div style={{ maxWidth: '500px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#92cc41' }}>Leaderboard</span>
                <button
                  onClick={() => setShowLeaderboard(false)}
                  className="nes-btn is-error"
                  style={{ fontSize: '0.4rem', padding: '0.25rem 0.5rem' }}
                >
                  Close
                </button>
              </div>
              <Leaderboard />
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop Layout
  return (
    <div className="page-container font-['Press_Start_2P']">
      <div className="bg-pattern"></div>

      {/* Header */}
      <header className="app-header p-4">
        <div className="container mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 animate-fade-in">
            <img src="/logo.png" alt="Prompt Duel" style={{ height: '80px', width: 'auto' }} />
            <div>
              <h1 className="text-lg sm:text-xl text-primary glow-text">Prompt Duel</h1>
              <p className="text-xs text-[#92cc41]">Battle Arena</p>
            </div>
          </div>

          <div className="flex items-center gap-4 animate-fade-in animate-delay-1">
            <div className="flex flex-col items-end gap-1">
              <span style={{ fontSize: '0.7rem', color: '#888' }}>
                Welcome, <span style={{ color: '#92cc41' }}>{user?.username}</span>
              </span>
              <Link
                to="/change-password"
                style={{ fontSize: '0.5rem', color: '#666' }}
                className="hover:text-[#f7d51d] transition-colors"
              >
                Change Password
              </Link>
            </div>
            <button onClick={handleLogout} className="nes-btn is-error text-xs">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="page-content">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8 animate-fade-in animate-delay-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="nes-btn is-success"
          >
            <span className="flex items-center gap-2">
              + Create Room
            </span>
          </button>
          <button
            onClick={() => setShowJoinModal(true)}
            className="nes-btn is-primary"
          >
            Join by Code
          </button>
          <button
            onClick={() => setShowLeaderboard(true)}
            className="nes-btn is-warning"
          >
            Leaderboard
          </button>
          <button
            onClick={fetchRooms}
            className="nes-btn"
            disabled={isLoadingRooms}
          >
            {isLoadingRooms ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div
            className="nes-container is-rounded mb-6 animate-fade-in"
            style={{ borderColor: '#e76e55', background: 'rgba(231, 110, 85, 0.1)' }}
          >
            <p className="text-xs" style={{ color: '#e76e55' }}>{error}</p>
          </div>
        )}

        {/* Available Rooms */}
        <div className="nes-container is-dark with-title animate-fade-in animate-delay-3">
          <p className="title">Available Rooms</p>

          {/* Filters */}
          <div className="mb-4 space-y-3">
            {/* Search Bar */}
            <div className="flex gap-2 items-center flex-wrap">
              <input
                type="text"
                className="nes-input is-dark"
                placeholder="Search by code or player..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ fontSize: '0.65rem', flex: '1', minWidth: '180px', maxWidth: '300px' }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="nes-btn is-error"
                  style={{ fontSize: '0.55rem', padding: '0.4rem 0.6rem' }}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2 flex-wrap items-center">
              <span style={{ fontSize: '0.55rem', color: '#888', marginRight: '0.5rem' }}>Status:</span>
              <button
                onClick={() => setStatusFilter('all')}
                className={`nes-btn ${statusFilter === 'all' ? 'is-primary' : ''}`}
                style={{ fontSize: '0.5rem', padding: '0.3rem 0.5rem' }}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('waiting')}
                className={`nes-btn ${statusFilter === 'waiting' ? 'is-success' : ''}`}
                style={{ fontSize: '0.5rem', padding: '0.3rem 0.5rem' }}
              >
                Waiting
              </button>
              <button
                onClick={() => setStatusFilter('playing')}
                className={`nes-btn ${statusFilter === 'playing' ? 'is-warning' : ''}`}
                style={{ fontSize: '0.5rem', padding: '0.3rem 0.5rem' }}
              >
                Live
              </button>

              <span style={{ fontSize: '0.55rem', color: '#888', marginLeft: '1rem', marginRight: '0.5rem' }}>Challenge:</span>
              <button
                onClick={() => setChallengeFilter('all')}
                className={`nes-btn ${challengeFilter === 'all' ? 'is-primary' : ''}`}
                style={{ fontSize: '0.5rem', padding: '0.3rem 0.5rem' }}
              >
                All
              </button>
              <button
                onClick={() => setChallengeFilter(1)}
                className={`nes-btn ${challengeFilter === 1 ? 'is-success' : ''}`}
                style={{ fontSize: '0.5rem', padding: '0.3rem 0.5rem' }}
              >
                C1
              </button>
              <button
                onClick={() => setChallengeFilter(2)}
                className={`nes-btn ${challengeFilter === 2 ? 'is-warning' : ''}`}
                style={{ fontSize: '0.5rem', padding: '0.3rem 0.5rem' }}
              >
                C2
              </button>
            </div>

            {/* Results Count */}
            <p style={{ fontSize: '0.5rem', color: '#666' }}>
              Showing {paginatedRooms.length} of {filteredRooms.length} rooms
              {filteredRooms.length !== rooms.length && ` (${rooms.length} total)`}
            </p>
          </div>

          {isLoadingRooms ? (
            <div className="loading-container py-12">
              <i className="nes-icon trophy is-large trophy-bounce"></i>
              <p className="loading-text text-sm">Loading rooms...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-12">
              <i className="nes-icon is-large star opacity-30"></i>
              <p className="text-gray-400 mt-4 mb-2">No rooms available</p>
              <p className="text-xs text-gray-500">Create a room to start a duel!</p>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center py-8">
              <i className="nes-icon is-medium star opacity-30"></i>
              <p className="text-gray-400 mt-4 mb-2" style={{ fontSize: '0.7rem' }}>No matching rooms</p>
              <p style={{ fontSize: '0.55rem', color: '#666' }}>Try adjusting your filters</p>
            </div>
          ) : (
            <div className="card-grid">
              {paginatedRooms.map((room, index) => (
                <div
                  key={room.id}
                  className={`room-card ${room.status === 'playing' ? 'is-playing' : ''} animate-fade-in`}
                  style={{ animationDelay: `${0.1 * index}s` }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-[#92cc41] text-sm font-bold">{room.code}</span>
                      <span className="ml-2 text-xs text-gray-400">
                        - Challenge {room.challenge}
                      </span>
                    </div>
                    <span className={`status-badge ${room.status === 'waiting' ? 'is-waiting' : 'is-playing'}`}>
                      {room.status === 'playing' ? 'LIVE' : room.status}
                    </span>
                  </div>

                  <div className="text-xs mb-4 space-y-1">
                    <p className="text-gray-400">
                      <span className="text-gray-500">Host:</span> {room.hostUsername}
                    </p>
                    <p className="text-gray-300">
                      {room.player1Username || '???'}
                      {' '}
                      <span className="text-[#92cc41]">vs</span>
                      {' '}
                      {room.player2Username || '???'}
                    </p>
                    {room.spectatorCount > 0 && (
                      <p className="text-gray-500">
                        <i className="nes-icon is-small eye"></i> {room.spectatorCount} watching
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {room.status === 'waiting' && !room.player2Username && (
                      <button
                        onClick={() => handleJoinRoom(room.code, false, room.status)}
                        className="nes-btn is-primary text-xs flex-1"
                        disabled={isLoading}
                      >
                        Join Battle
                      </button>
                    )}
                    {room.status === 'playing' ? (
                      <button
                        onClick={() => handleJoinRoom(room.code, true, room.status)}
                        className="nes-btn is-warning text-xs flex-1"
                        disabled={isLoading}
                      >
                        Watch Live!
                      </button>
                    ) : (
                      <button
                        onClick={() => handleJoinRoom(room.code, true, room.status)}
                        className="nes-btn text-xs flex-1"
                        disabled={isLoading}
                      >
                        Spectate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="nes-btn"
                style={{ fontSize: '0.5rem', padding: '0.3rem 0.5rem', opacity: currentPage === 1 ? 0.5 : 1 }}
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="nes-btn is-primary"
                style={{ fontSize: '0.5rem', padding: '0.3rem 0.5rem', opacity: currentPage === 1 ? 0.5 : 1 }}
              >
                Prev
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    // Show first, last, current, and adjacent pages
                    return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                  })
                  .map((page, idx, arr) => (
                    <React.Fragment key={page}>
                      {idx > 0 && arr[idx - 1] !== page - 1 && (
                        <span style={{ fontSize: '0.5rem', color: '#666' }}>...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`nes-btn ${currentPage === page ? 'is-success' : ''}`}
                        style={{ fontSize: '0.5rem', padding: '0.3rem 0.6rem', minWidth: '32px' }}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="nes-btn is-primary"
                style={{ fontSize: '0.5rem', padding: '0.3rem 0.5rem', opacity: currentPage === totalPages ? 0.5 : 1 }}
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="nes-btn"
                style={{ fontSize: '0.5rem', padding: '0.3rem 0.5rem', opacity: currentPage === totalPages ? 0.5 : 1 }}
              >
                Last
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 9999,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
        >
          <div className="nes-container is-dark with-title max-w-md w-full animate-fade-in glow-primary">
            <p className="title">Create Room</p>

            <div className="mb-6">
              <p className="text-sm mb-4 text-gray-300">Select Challenge:</p>

              <div
                onClick={() => setSelectedChallenge(1)}
                style={{
                  display: 'block',
                  padding: '16px',
                  marginBottom: '12px',
                  cursor: 'pointer',
                  border: selectedChallenge === 1 ? '3px solid #92cc41' : '2px solid #333',
                  backgroundColor: selectedChallenge === 1 ? 'rgba(146, 204, 65, 0.1)' : 'transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: selectedChallenge === 1 ? '6px solid #92cc41' : '2px solid #666',
                    backgroundColor: 'transparent',
                  }}></div>
                  <div>
                    <p style={{ color: '#92cc41', fontSize: '0.8rem', marginBottom: '4px' }}>Challenge 1</p>
                    <p style={{ color: '#888', fontSize: '0.6rem' }}>BracketValidator - Beginner</p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setSelectedChallenge(2)}
                style={{
                  display: 'block',
                  padding: '16px',
                  cursor: 'pointer',
                  border: selectedChallenge === 2 ? '3px solid #209cee' : '2px solid #333',
                  backgroundColor: selectedChallenge === 2 ? 'rgba(32, 156, 238, 0.1)' : 'transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: selectedChallenge === 2 ? '6px solid #209cee' : '2px solid #666',
                    backgroundColor: 'transparent',
                  }}></div>
                  <div>
                    <p style={{ color: '#209cee', fontSize: '0.8rem', marginBottom: '4px' }}>Challenge 2</p>
                    <p style={{ color: '#888', fontSize: '0.6rem' }}>QuantumHeist - Advanced</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Timer Selection */}
            <div className="mb-6">
              <p className="text-sm mb-4 text-gray-300">Game Timer:</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[20, 30, 60].map((mins) => (
                  <div
                    key={mins}
                    onClick={() => setSelectedTimer(mins as 20 | 30 | 60)}
                    style={{
                      flex: 1,
                      padding: '12px 8px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      border: selectedTimer === mins ? '3px solid #f7d51d' : '2px solid #333',
                      backgroundColor: selectedTimer === mins ? 'rgba(247, 213, 29, 0.1)' : 'transparent',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <p style={{ color: selectedTimer === mins ? '#f7d51d' : '#888', fontSize: '0.8rem', marginBottom: '2px' }}>
                      {mins} min
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleCreateRoom}
                className="nes-btn is-success flex-1"
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="nes-btn flex-1"
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Room Modal */}
      {showJoinModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 9999,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowJoinModal(false);
          }}
        >
          <div className="nes-container is-dark with-title max-w-md w-full animate-fade-in glow-secondary">
            <p className="title">Join Room</p>

            <div className="nes-field mb-6">
              <label htmlFor="join_code" className="text-gray-300 mb-2 block">Room Code</label>
              <input
                type="text"
                id="join_code"
                className="nes-input is-dark"
                placeholder="Enter 6-letter code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                style={{ letterSpacing: '0.5em', textAlign: 'center', fontSize: '1.2rem' }}
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => handleJoinRoom(joinCode)}
                className="nes-btn is-primary flex-1"
                disabled={isLoading || joinCode.length !== 6}
              >
                {isLoading ? 'Joining...' : 'Join'}
              </button>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinCode('');
                }}
                className="nes-btn flex-1"
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 9999,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLeaderboard(false);
          }}
        >
          <div
            className="animate-fade-in"
            style={{
              width: '100%',
              maxWidth: '900px',
              maxHeight: '80vh',
              overflowY: 'auto',
              backgroundColor: '#1a1a2e',
              borderRadius: '8px',
              padding: '1rem',
            }}
          >
            <Leaderboard onClose={() => setShowLeaderboard(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
