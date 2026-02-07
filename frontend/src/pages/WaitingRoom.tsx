import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRoom } from '../contexts/RoomContext';
import { config } from '../config';

export function WaitingRoom() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const {
    room,
    role,
    chatMessages,
    isConnected,
    toggleReady,
    startGame,
    leaveRoom,
    sendChatMessage,
    connectToRoom,
    disconnectFromRoom,
  } = useRoom();

  const [isLoadingRoom, setIsLoadingRoom] = useState(true);
  const [roomData, setRoomData] = useState<any>(null);
  const [error, setError] = useState('');
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch room details
  useEffect(() => {
    if (!code || !token) return;

    const fetchRoom = async () => {
      try {
        const response = await fetch(`${config.apiUrl}/rooms/${code}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (data.success) {
          setRoomData(data.room);

          // If game is already playing, redirect
          if (data.room.status === 'playing') {
            const isPlayer =
              data.room.player1?.id === user?.id || data.room.player2?.id === user?.id;
            if (isPlayer) {
              navigate(`/game/${code}`);
            } else {
              navigate(`/spectate/${code}`);
            }
          }
        } else {
          setError(data.error || 'Room not found');
        }
      } catch (error) {
        console.error('Failed to fetch room:', error);
        setError('Failed to load room');
      } finally {
        setIsLoadingRoom(false);
      }
    };

    fetchRoom();
  }, [code, token, user?.id, navigate]);

  // Connect to room WebSocket
  useEffect(() => {
    if (code && !isLoadingRoom && roomData) {
      connectToRoom(code);
    }

    return () => {
      disconnectFromRoom();
    };
  }, [code, isLoadingRoom, roomData, connectToRoom, disconnectFromRoom]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Redirect when game starts
  useEffect(() => {
    if (room?.status === 'playing') {
      if (role === 'player') {
        navigate(`/game/${code}`);
      } else {
        navigate(`/spectate/${code}`);
      }
    }
  }, [room?.status, role, code, navigate]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      sendChatMessage(chatInput.trim());
      setChatInput('');
    }
  };

  const handleStartGame = async () => {
    const result = await startGame();
    if (!result.success) {
      setError(result.error || 'Failed to start game');
    }
  };

  const handleLeaveRoom = async () => {
    await leaveRoom();
    navigate('/lobby');
  };

  if (isLoadingRoom) {
    return (
      <div className="min-h-screen bg-[#212529] flex items-center justify-center font-['Press_Start_2P']">
        <div className="nes-container is-dark text-center">
          <i className="nes-icon trophy is-large animate-pulse"></i>
          <p className="mt-4">Loading room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#212529] flex items-center justify-center font-['Press_Start_2P']">
        <div className="nes-container is-dark with-title max-w-md">
          <p className="title">Error</p>
          <p className="text-sm mb-4">{error}</p>
          <button onClick={() => navigate('/lobby')} className="nes-btn is-primary">
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  const displayRoom = room || roomData;
  const isHost = displayRoom?.host?.id === user?.id || displayRoom?.hostId === user?.id;
  const player1 = displayRoom?.player1;
  const player2 = displayRoom?.player2;
  const isPlayer1 = player1?.id === user?.id;
  const isPlayer2 = player2?.id === user?.id;
  const isPlayer = isPlayer1 || isPlayer2;
  const myReady = isPlayer1 ? displayRoom?.player1Ready : isPlayer2 ? displayRoom?.player2Ready : false;
  const bothReady = displayRoom?.player1Ready && displayRoom?.player2Ready;
  const bothPlayersJoined = player1 && player2;

  return (
    <div className="min-h-screen bg-[#212529] font-['Press_Start_2P']">
      {/* Header */}
      <div className="bg-black p-4 border-b-4 border-[#92cc41]">
        <div className="container mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <i className="nes-icon trophy is-medium"></i>
            <div>
              <h1 className="text-lg">Room: {code}</h1>
              <p className="text-xs text-[#92cc41]">
                Challenge {displayRoom?.challenge} - Waiting for players
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isConnected ? (
              <span className="nes-badge">
                <span className="is-success">Connected</span>
              </span>
            ) : (
              <span className="nes-badge">
                <span className="is-warning">Connecting...</span>
              </span>
            )}
            <button onClick={handleLeaveRoom} className="nes-btn is-error text-xs">
              Leave
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Players Section */}
          <div className="nes-container is-dark with-title">
            <p className="title">Players</p>

            <div className="grid gap-4">
              {/* Player 1 */}
              <div
                className={`nes-container is-rounded ${
                  displayRoom?.player1Ready ? 'is-success' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <i className="nes-icon is-small star"></i>
                    <div>
                      <p className="text-sm">{player1?.username || 'Waiting...'}</p>
                      {player1 && displayRoom?.hostId === player1.id && (
                        <span className="text-xs text-[#92cc41]">Host</span>
                      )}
                    </div>
                  </div>
                  {player1 && (
                    <span
                      className={`text-xs ${displayRoom?.player1Ready ? 'text-green-400' : 'text-gray-400'}`}
                    >
                      {displayRoom?.player1Ready ? 'READY' : 'Not Ready'}
                    </span>
                  )}
                </div>
              </div>

              {/* VS */}
              <div className="text-center text-2xl opacity-50">VS</div>

              {/* Player 2 */}
              <div
                className={`nes-container is-rounded ${
                  displayRoom?.player2Ready ? 'is-success' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <i className="nes-icon is-small star"></i>
                    <div>
                      <p className="text-sm">{player2?.username || 'Waiting for opponent...'}</p>
                      {player2 && displayRoom?.hostId === player2.id && (
                        <span className="text-xs text-[#92cc41]">Host</span>
                      )}
                    </div>
                  </div>
                  {player2 && (
                    <span
                      className={`text-xs ${displayRoom?.player2Ready ? 'text-green-400' : 'text-gray-400'}`}
                    >
                      {displayRoom?.player2Ready ? 'READY' : 'Not Ready'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-wrap gap-4">
              {isPlayer && (
                <button
                  onClick={toggleReady}
                  className={`nes-btn ${myReady ? 'is-warning' : 'is-success'} flex-1`}
                >
                  {myReady ? 'Cancel Ready' : 'Ready!'}
                </button>
              )}

              {isHost && bothPlayersJoined && bothReady && (
                <button onClick={handleStartGame} className="nes-btn is-primary flex-1">
                  Start Game!
                </button>
              )}
            </div>

            {/* Spectators */}
            {(displayRoom?.spectators?.length > 0 || role === 'spectator') && (
              <div className="mt-6">
                <p className="text-xs text-gray-400 mb-2">
                  Spectators ({displayRoom?.spectators?.length || 0}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {displayRoom?.spectators?.map((spec: any) => (
                    <span key={spec.id} className="text-xs text-gray-300">
                      {spec.username}
                    </span>
                  ))}
                </div>
                {role === 'spectator' && (
                  <p className="text-xs text-[#92cc41] mt-2">You are spectating</p>
                )}
              </div>
            )}
          </div>

          {/* Chat Section */}
          <div className="nes-container is-dark with-title">
            <p className="title">Chat</p>

            <div
              className="h-64 overflow-y-auto mb-4 p-2"
              style={{ backgroundColor: '#1a1a1a' }}
            >
              {chatMessages.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">
                  No messages yet. Say hello!
                </p>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div key={msg.id || idx} className="mb-2 text-xs">
                    <span className="text-[#92cc41]">{msg.username}: </span>
                    <span className="text-gray-300">{msg.message}</span>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendChat} className="flex gap-2">
              <input
                type="text"
                className="nes-input is-dark flex-1"
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                maxLength={500}
              />
              <button type="submit" className="nes-btn is-primary">
                Send
              </button>
            </form>
          </div>
        </div>

        {/* Room Info */}
        <div className="mt-6 nes-container is-dark">
          <div className="flex flex-wrap gap-4 text-xs text-gray-400">
            <p>Room Code: <span className="text-white">{code}</span></p>
            <p>Challenge: <span className="text-white">{displayRoom?.challenge}</span></p>
            <p>Status: <span className="text-[#92cc41]">{displayRoom?.status}</span></p>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Share the room code with a friend to invite them to play!
          </p>
        </div>
      </div>
    </div>
  );
}
