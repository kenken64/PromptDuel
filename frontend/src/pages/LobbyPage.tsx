import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRoom } from '../contexts/RoomContext';
import { config } from '../config';

interface RoomInfo {
  id: number;
  code: string;
  challenge: number;
  status: string;
  hostUsername: string;
  player1Username: string | null;
  player2Username: string | null;
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

  const handleCreateRoom = async () => {
    setError('');
    const result = await createRoom(selectedChallenge);

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
            <span style={{ fontSize: '0.7rem', color: '#888' }}>
              Welcome, <span style={{ color: '#92cc41' }}>{user?.username}</span>
            </span>
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
          ) : (
            <div className="card-grid">
              {rooms.map((room, index) => (
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
        </div>
      </main>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50">
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
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50">
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
    </div>
  );
}
