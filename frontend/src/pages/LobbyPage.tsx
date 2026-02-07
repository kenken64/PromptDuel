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
    // Refresh every 10 seconds
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
      // If spectating a playing game, go directly to spectator view
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
    <div className="min-h-screen bg-[#212529] font-['Press_Start_2P']">
      {/* Header */}
      <div className="bg-black p-4 border-b-4 border-[#92cc41]">
        <div className="container mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <i className="nes-icon trophy is-medium"></i>
            <div>
              <h1 className="text-lg sm:text-xl">Prompt Duel</h1>
              <p className="text-xs text-[#92cc41]">Lobby</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">
              Logged in as <span className="text-white">{user?.username}</span>
            </span>
            <button onClick={handleLogout} className="nes-btn is-error text-xs">
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8">
          <button
            onClick={() => setShowCreateModal(true)}
            className="nes-btn is-success"
          >
            Create Room
          </button>
          <button
            onClick={() => setShowJoinModal(true)}
            className="nes-btn is-primary"
          >
            Join by Code
          </button>
          <button onClick={fetchRooms} className="nes-btn" disabled={isLoadingRooms}>
            Refresh
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="nes-container is-rounded is-error mb-4">
            <p className="text-xs">{error}</p>
          </div>
        )}

        {/* Available Rooms */}
        <div className="nes-container is-dark with-title">
          <p className="title">Available Rooms</p>

          {isLoadingRooms ? (
            <div className="text-center py-8">
              <p className="text-gray-400">Loading rooms...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">No rooms available</p>
              <p className="text-xs text-gray-500">Create a room to start a duel!</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <div key={room.id} className="nes-container is-rounded">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-[#92cc41] text-sm">{room.code}</span>
                      <span className="ml-2 text-xs text-gray-400">
                        Challenge {room.challenge}
                      </span>
                    </div>
                    <span className="nes-badge">
                      <span className={room.status === 'waiting' ? 'is-success' : 'is-warning'}>
                        {room.status}
                      </span>
                    </span>
                  </div>

                  <div className="text-xs mb-2">
                    <p className="text-gray-400">Host: {room.hostUsername}</p>
                    <p className="text-gray-400">
                      Players: {room.player1Username || '-'} vs {room.player2Username || 'Waiting...'}
                    </p>
                    {room.spectatorCount > 0 && (
                      <p className="text-gray-500">
                        {room.spectatorCount} spectator{room.spectatorCount > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 mt-3">
                    {room.status === 'waiting' && !room.player2Username && (
                      <button
                        onClick={() => handleJoinRoom(room.code, false, room.status)}
                        className="nes-btn is-primary text-xs flex-1"
                        disabled={isLoading}
                      >
                        Join
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
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="nes-container is-dark with-title max-w-md w-full">
            <p className="title">Create Room</p>

            <div className="mb-6">
              <p className="text-sm mb-4">Select Challenge:</p>

              <label className="block mb-3">
                <input
                  type="radio"
                  className="nes-radio is-dark"
                  name="challenge"
                  checked={selectedChallenge === 1}
                  onChange={() => setSelectedChallenge(1)}
                />
                <span className="ml-2">Challenge 1 - BracketValidator</span>
              </label>

              <label className="block">
                <input
                  type="radio"
                  className="nes-radio is-dark"
                  name="challenge"
                  checked={selectedChallenge === 2}
                  onChange={() => setSelectedChallenge(2)}
                />
                <span className="ml-2">Challenge 2 - QuantumHeist</span>
              </label>
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
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="nes-container is-dark with-title max-w-md w-full">
            <p className="title">Join Room</p>

            <div className="nes-field mb-6">
              <label htmlFor="join_code">Room Code</label>
              <input
                type="text"
                id="join_code"
                className="nes-input is-dark"
                placeholder="Enter 6-letter code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
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
