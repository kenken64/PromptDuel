import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRoom } from '../contexts/RoomContext';
import { useSupabaseChat } from '../contexts/SupabaseChatContext';
import { config } from '../config';

export function WaitingRoom() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const {
    room,
    role,
    isConnected,
    toggleReady,
    startGame,
    leaveRoom,
    connectToRoom,
    disconnectFromRoom,
  } = useRoom();
  const {
    messages: chatMessages,
    isLoading: isChatLoading,
    sendMessage: sendSupabaseMessage,
    subscribeToRoom,
    unsubscribeFromRoom,
  } = useSupabaseChat();

  const [isLoadingRoom, setIsLoadingRoom] = useState(true);
  const [roomData, setRoomData] = useState<any>(null);
  const [error, setError] = useState('');
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch room details
  const fetchRoom = async () => {
    if (!code || !token) return;

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

  // Initial fetch
  useEffect(() => {
    fetchRoom();
  }, [code, token, user?.id, navigate]);

  // Poll for room updates every 3 seconds (fallback for WebSocket issues)
  useEffect(() => {
    if (!code || !token || isLoadingRoom) return;

    const interval = setInterval(() => {
      fetchRoom();
    }, 3000);

    return () => clearInterval(interval);
  }, [code, token, isLoadingRoom]);

  // Connect to room WebSocket
  useEffect(() => {
    if (code && !isLoadingRoom && roomData) {
      connectToRoom(code);
    }

    return () => {
      disconnectFromRoom();
    };
  }, [code, isLoadingRoom, roomData, connectToRoom, disconnectFromRoom]);

  // Subscribe to Supabase chat when room is loaded
  useEffect(() => {
    if (code && !isLoadingRoom) {
      subscribeToRoom(code);
    }

    return () => {
      unsubscribeFromRoom();
    };
  }, [code, isLoadingRoom, subscribeToRoom, unsubscribeFromRoom]);

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

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim() && code) {
      const success = await sendSupabaseMessage(code, chatInput.trim());
      if (success) {
        setChatInput('');
      }
    }
  };

  const handleStartGame = async () => {
    const result = await startGame();
    if (!result.success) {
      setError(result.error || 'Failed to start game');
    }
  };

  const handleLeaveRoom = async () => {
    await leaveRoom(code);
    navigate('/lobby');
  };

  if (isLoadingRoom) {
    return (
      <div className="page-container flex items-center justify-center font-['Press_Start_2P']">
        <div className="bg-pattern"></div>
        <div className="loading-container">
          <i className="nes-icon trophy is-large trophy-bounce"></i>
          <p className="loading-text text-sm">Loading room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container flex items-center justify-center font-['Press_Start_2P']">
        <div className="bg-pattern"></div>
        <div className="nes-container is-dark with-title max-w-md animate-fade-in">
          <p className="title">Error</p>
          <p className="text-sm mb-4 text-error">{error}</p>
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
    <div className="page-container font-['Press_Start_2P']">
      <div className="bg-pattern"></div>

      {/* Header */}
      <header className="app-header p-4">
        <div className="container mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 animate-fade-in">
            <i className="nes-icon trophy is-medium trophy-bounce"></i>
            <div>
              <h1 className="text-lg text-primary glow-text">Room: {code}</h1>
              <p className="text-xs text-[#92cc41]">
                Challenge {displayRoom?.challenge} - Waiting for players
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 animate-fade-in animate-delay-1">
            {isConnected ? (
              <span className="nes-badge">
                <span className="is-success">Connected</span>
              </span>
            ) : (
              <span className="nes-badge">
                <span className="is-warning">Connecting...</span>
              </span>
            )}
            <span style={{ fontSize: '0.7rem', color: '#888' }}>
              Welcome, <span style={{ color: '#92cc41' }}>{user?.username}</span>
            </span>
            <button onClick={handleLeaveRoom} className="nes-btn is-error text-xs">
              Leave
            </button>
          </div>
        </div>
      </header>

      <main className="page-content">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Players Section */}
          <div className="nes-container is-dark with-title animate-fade-in animate-delay-2 glow-primary">
            <p className="title">Players</p>

            <div className="grid gap-4">
              {/* Player 1 */}
              <div
                className={`player-slot ${displayRoom?.player1Ready ? 'is-ready' : ''} ${!player1 ? 'is-empty' : ''}`}
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
                      className={`status-badge ${displayRoom?.player1Ready ? 'is-playing' : ''}`}
                      style={{ background: displayRoom?.player1Ready ? '#92cc41' : '#666' }}
                    >
                      {displayRoom?.player1Ready ? 'READY' : 'Not Ready'}
                    </span>
                  )}
                </div>
                {/* Player 1 Ready Button */}
                {isPlayer1 && (
                  <div className="mt-3">
                    <button
                      onClick={toggleReady}
                      className={`nes-btn ${myReady ? 'is-warning' : 'is-success'} w-full`}
                      style={{ fontSize: '0.7rem' }}
                    >
                      {myReady ? 'Cancel Ready' : 'Ready!'}
                    </button>
                  </div>
                )}
              </div>

              {/* VS */}
              <div className="vs-divider text-center text-2xl">VS</div>

              {/* Player 2 */}
              <div
                className={`player-slot ${displayRoom?.player2Ready ? 'is-ready' : ''} ${!player2 ? 'is-empty' : ''}`}
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
                      className={`status-badge ${displayRoom?.player2Ready ? 'is-playing' : ''}`}
                      style={{ background: displayRoom?.player2Ready ? '#92cc41' : '#666' }}
                    >
                      {displayRoom?.player2Ready ? 'READY' : 'Not Ready'}
                    </span>
                  )}
                </div>
                {/* Player 2 Ready Button */}
                {isPlayer2 && (
                  <div className="mt-3">
                    <button
                      onClick={toggleReady}
                      className={`nes-btn ${myReady ? 'is-warning' : 'is-success'} w-full`}
                      style={{ fontSize: '0.7rem' }}
                    >
                      {myReady ? 'Cancel Ready' : 'Ready!'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Start Game Button - only for host when both ready */}
            {isHost && bothPlayersJoined && bothReady && (
              <div className="mt-6">
                <button onClick={handleStartGame} className="nes-btn is-primary w-full">
                  Start Game!
                </button>
              </div>
            )}

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
          <div className="nes-container is-dark with-title animate-fade-in animate-delay-3">
            <p className="title">Chat</p>

            <div className="chat-container mb-4 p-2">
              {chatMessages.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">
                  No messages yet. Say hello!
                </p>
              ) : (
                chatMessages.map((msg, idx) => {
                  const isCurrentUser = msg.user_id === user?.id || msg.username === user?.username;
                  return (
                    <div
                      key={msg.id || idx}
                      className="chat-message"
                      style={{
                        textAlign: isCurrentUser ? 'right' : 'left',
                        marginBottom: '8px',
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '6px 10px',
                          borderRadius: '4px',
                          backgroundColor: isCurrentUser ? 'rgba(146, 204, 65, 0.2)' : 'rgba(32, 156, 238, 0.1)',
                          maxWidth: '80%',
                        }}
                      >
                        <span
                          style={{
                            color: isCurrentUser ? '#92cc41' : '#209cee',
                            fontWeight: 'bold',
                            fontSize: '0.65rem',
                          }}
                        >
                          {isCurrentUser ? 'You' : msg.username}:
                        </span>{' '}
                        <span style={{ color: '#ccc', fontSize: '0.7rem' }}>{msg.message}</span>
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendChat} className="flex gap-2">
              <input
                type="text"
                className="nes-input is-dark flex-1"
                placeholder={isChatLoading ? "Loading..." : "Type a message..."}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                maxLength={500}
                disabled={isChatLoading}
              />
              <button type="submit" className="nes-btn is-primary" disabled={isChatLoading || !chatInput.trim()}>
                Send
              </button>
            </form>
          </div>
        </div>

        {/* Room Info */}
        <div className="mt-6 nes-container is-dark animate-fade-in animate-delay-4">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
            <p style={{ fontSize: '0.75rem', color: '#888', margin: 0 }}>
              Room Code: <span style={{ color: '#92cc41', fontWeight: 'bold', marginLeft: '8px' }}>{code}</span>
            </p>
            <p style={{ fontSize: '0.75rem', color: '#888', margin: 0 }}>
              Challenge: <span style={{ color: '#209cee', marginLeft: '8px' }}>{displayRoom?.challenge}</span>
            </p>
            <p style={{ fontSize: '0.75rem', color: '#888', margin: 0 }}>
              Status: <span style={{ color: '#92cc41', marginLeft: '8px' }}>{displayRoom?.status}</span>
            </p>
          </div>
          <p style={{ fontSize: '0.7rem', color: '#666', marginTop: '16px', marginBottom: 0 }}>
            Share the room code with a friend to invite them to play!
          </p>
        </div>
      </main>
    </div>
  );
}
