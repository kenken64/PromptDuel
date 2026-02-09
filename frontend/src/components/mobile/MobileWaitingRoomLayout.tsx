import React, { useState, useRef, useEffect } from 'react';
import { ProviderSelector, getProviderDisplayName, type ProviderKey } from '../ProviderSelector';

interface ChatMessage {
  id?: number;
  user_id?: number;
  username: string;
  message: string;
}

interface Spectator {
  id: number;
  username: string;
}

interface MobileWaitingRoomLayoutProps {
  roomCode: string;
  challenge: number;
  timerMinutes?: number;
  player1?: { id: number; username: string };
  player2?: { id: number; username: string };
  player1Ready: boolean;
  player2Ready: boolean;
  player1Provider?: string;
  player1Model?: string;
  player2Provider?: string;
  player2Model?: string;
  isHost: boolean;
  currentUserId?: number;
  currentUserIsPlayer1: boolean;
  currentUserIsPlayer2: boolean;
  myProvider: ProviderKey;
  myModel: string;
  canChangeProvider: boolean;
  isSpectator?: boolean;
  spectators?: Spectator[];
  chatMessages?: ChatMessage[];
  isChatLoading?: boolean;
  onProviderChange: (provider: ProviderKey) => void;
  onModelChange: (model: string) => void;
  onReady: () => void;
  onStart: () => void;
  onLeave: () => void;
  onSendChat?: (message: string) => void;
}

export function MobileWaitingRoomLayout({
  roomCode,
  challenge,
  timerMinutes = 20,
  player1,
  player2,
  player1Ready,
  player2Ready,
  player1Provider,
  player1Model,
  player2Provider,
  player2Model,
  isHost,
  currentUserId,
  currentUserIsPlayer1,
  currentUserIsPlayer2,
  myProvider,
  myModel,
  canChangeProvider,
  isSpectator = false,
  spectators = [],
  chatMessages = [],
  isChatLoading = false,
  onProviderChange,
  onModelChange,
  onReady,
  onStart,
  onLeave,
  onSendChat,
}: MobileWaitingRoomLayoutProps) {
  const [activeTab, setActiveTab] = useState<'players' | 'chat'>('players');
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const bothReady = player1Ready && player2Ready && player1 && player2;
  const isCurrentUserReady = (currentUserIsPlayer1 && player1Ready) || (currentUserIsPlayer2 && player2Ready);
  const isPlayer = currentUserIsPlayer1 || currentUserIsPlayer2;

  // Auto-scroll chat
  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim() && onSendChat) {
      onSendChat(chatInput.trim());
      setChatInput('');
    }
  };

  return (
    <div className="page-container mobile-safe-top mobile-safe-bottom">
      {/* Header */}
      <header className="app-header" style={{ padding: '0.5rem 0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src="/logo.png" alt="Prompt Duel" style={{ height: '35px' }} />
            <div>
              <div style={{ fontSize: '0.6rem', color: '#92cc41' }}>Room: {roomCode}</div>
              <div style={{ fontSize: '0.4rem', color: '#888' }}>Challenge {challenge} | {timerMinutes}min</div>
            </div>
          </div>
          <button
            onClick={onLeave}
            className="nes-btn is-error"
            style={{ fontSize: '0.4rem', padding: '0.25rem 0.5rem', minHeight: 'auto' }}
          >
            Leave
          </button>
        </div>
      </header>

      {/* Spectator Banner */}
      {isSpectator && (
        <div style={{ textAlign: 'center', padding: '0.4rem', background: '#f7d51d', color: '#000' }}>
          <span style={{ fontSize: '0.45rem' }}>You are spectating this room</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '3px solid #333',
        marginBottom: '0.75rem',
        backgroundColor: '#1a1a2e',
      }}>
        <button
          onClick={() => setActiveTab('players')}
          style={{
            flex: 1,
            padding: '0.75rem 1rem',
            fontSize: '0.55rem',
            color: activeTab === 'players' ? '#92cc41' : '#888',
            backgroundColor: activeTab === 'players' ? 'rgba(146, 204, 65, 0.1)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'players' ? '3px solid #92cc41' : '3px solid transparent',
            cursor: 'pointer',
            fontFamily: "'Press Start 2P', cursive",
            marginBottom: '-3px',
          }}
        >
          Players
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          style={{
            flex: 1,
            padding: '0.75rem 1rem',
            fontSize: '0.55rem',
            color: activeTab === 'chat' ? '#92cc41' : '#888',
            backgroundColor: activeTab === 'chat' ? 'rgba(146, 204, 65, 0.1)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'chat' ? '3px solid #92cc41' : '3px solid transparent',
            cursor: 'pointer',
            fontFamily: "'Press Start 2P', cursive",
            marginBottom: '-3px',
          }}
        >
          Chat {chatMessages.length > 0 && `(${chatMessages.length})`}
        </button>
      </div>

      <div className="page-content" style={{ padding: '0.75rem', paddingTop: 0 }}>
        {/* Players Tab */}
        {activeTab === 'players' && (
          <div>
            {/* Player 1 Card */}
            <div
              className={`nes-container ${player1Ready ? 'is-rounded' : 'is-dark'}`}
              style={{
                padding: '0.75rem',
                borderColor: player1Ready ? '#92cc41' : undefined,
                marginBottom: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.55rem', color: '#209cee' }}>
                    {player1?.username || 'Waiting...'}
                  </span>
                  {player1 && isHost && player1.id === player1?.id && (
                    <span style={{ fontSize: '0.4rem', color: '#888', marginLeft: '0.5rem' }}>(Host)</span>
                  )}
                </div>
                {player1 && (
                  <span
                    style={{
                      fontSize: '0.35rem',
                      padding: '0.15rem 0.3rem',
                      background: player1Ready ? '#92cc41' : '#666',
                      color: player1Ready ? '#000' : '#fff',
                    }}
                  >
                    {player1Ready ? 'READY' : 'Not Ready'}
                  </span>
                )}
              </div>

              {/* Provider Info */}
              {player1 && (
                <div style={{ marginBottom: '0.5rem' }}>
                  {currentUserIsPlayer1 && canChangeProvider ? (
                    <ProviderSelector
                      provider={myProvider}
                      model={myModel}
                      onProviderChange={onProviderChange}
                      onModelChange={onModelChange}
                      disabled={!canChangeProvider}
                      compact={true}
                    />
                  ) : (
                    <div style={{ fontSize: '0.4rem', color: '#888' }}>
                      AI: {getProviderDisplayName(
                        (currentUserIsPlayer1 ? myProvider : (player1Provider || 'anthropic')) as ProviderKey,
                        currentUserIsPlayer1 ? myModel : (player1Model || 'claude-sonnet-4-20250514')
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Ready Button for Player 1 */}
              {currentUserIsPlayer1 && (
                <button
                  onClick={onReady}
                  disabled={!player2}
                  className={`nes-btn ${isCurrentUserReady ? 'is-warning' : 'is-success'}`}
                  style={{ width: '100%', fontSize: '0.45rem', opacity: !player2 ? 0.5 : 1 }}
                >
                  {isCurrentUserReady ? 'Cancel Ready' : 'Ready!'}
                </button>
              )}
            </div>

            {/* VS Divider */}
            <div style={{ textAlign: 'center', padding: '0.25rem', color: '#666', fontSize: '0.7rem' }}>VS</div>

            {/* Player 2 Card */}
            <div
              className={`nes-container ${player2Ready ? 'is-rounded' : 'is-dark'} ${!player2 ? '' : ''}`}
              style={{
                padding: '0.75rem',
                borderColor: player2Ready ? '#92cc41' : undefined,
                borderStyle: !player2 ? 'dashed' : 'solid',
                marginBottom: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.55rem', color: player2 ? '#92cc41' : '#666' }}>
                  {player2?.username || 'Waiting for opponent...'}
                </span>
                {player2 && (
                  <span
                    style={{
                      fontSize: '0.35rem',
                      padding: '0.15rem 0.3rem',
                      background: player2Ready ? '#92cc41' : '#666',
                      color: player2Ready ? '#000' : '#fff',
                    }}
                  >
                    {player2Ready ? 'READY' : 'Not Ready'}
                  </span>
                )}
              </div>

              {/* Provider Info */}
              {player2 && (
                <div style={{ marginBottom: '0.5rem' }}>
                  {currentUserIsPlayer2 && canChangeProvider ? (
                    <ProviderSelector
                      provider={myProvider}
                      model={myModel}
                      onProviderChange={onProviderChange}
                      onModelChange={onModelChange}
                      disabled={!canChangeProvider}
                      compact={true}
                    />
                  ) : (
                    <div style={{ fontSize: '0.4rem', color: '#888' }}>
                      AI: {getProviderDisplayName(
                        (currentUserIsPlayer2 ? myProvider : (player2Provider || 'anthropic')) as ProviderKey,
                        currentUserIsPlayer2 ? myModel : (player2Model || 'claude-sonnet-4-20250514')
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Ready Button for Player 2 */}
              {currentUserIsPlayer2 && player2 && (
                <button
                  onClick={onReady}
                  className={`nes-btn ${isCurrentUserReady ? 'is-warning' : 'is-success'}`}
                  style={{ width: '100%', fontSize: '0.45rem' }}
                >
                  {isCurrentUserReady ? 'Cancel Ready' : 'Ready!'}
                </button>
              )}
            </div>

            {/* Start Button (Host only) */}
            {isHost && bothReady && (
              <button
                onClick={onStart}
                className="nes-btn is-primary"
                style={{ width: '100%', fontSize: '0.55rem', marginBottom: '0.75rem' }}
              >
                Start Game!
              </button>
            )}

            {/* Status Messages */}
            <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
              {!player2 && (
                <p style={{ fontSize: '0.4rem', color: '#f7d51d' }}>
                  Waiting for opponent to join...
                </p>
              )}
              {player2 && !bothReady && isPlayer && (
                <p style={{ fontSize: '0.4rem', color: '#888' }}>
                  Both players must be ready to start
                </p>
              )}
              {bothReady && !isHost && (
                <p style={{ fontSize: '0.4rem', color: '#92cc41' }}>
                  Waiting for host to start the game...
                </p>
              )}
            </div>

            {/* Room Code Share */}
            <div className="nes-container is-dark" style={{ padding: '0.6rem', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.4rem', color: '#888', marginBottom: '0.25rem' }}>
                Share this code with your opponent:
              </div>
              <div style={{ fontSize: '1rem', color: '#f7d51d', textAlign: 'center' }}>
                {roomCode}
              </div>
            </div>

            {/* Spectators */}
            {spectators.length > 0 && (
              <div className="nes-container is-dark" style={{ padding: '0.6rem' }}>
                <div style={{ fontSize: '0.4rem', color: '#888', marginBottom: '0.25rem' }}>
                  Spectators ({spectators.length}):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                  {spectators.map((spec) => (
                    <span key={spec.id} style={{ fontSize: '0.35rem', color: '#ccc' }}>
                      {spec.username}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)' }}>
            {/* Chat Messages */}
            <div
              className="nes-container is-dark custom-scrollbar"
              style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: '0.5rem',
                marginBottom: '0.5rem',
              }}
            >
              {chatMessages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#666', fontSize: '0.4rem' }}>
                  No messages yet. Say hello!
                </div>
              ) : (
                [...chatMessages].reverse().map((msg, idx) => {
                  const isCurrentUser = msg.user_id === currentUserId;
                  return (
                    <div
                      key={msg.id || idx}
                      style={{
                        textAlign: isCurrentUser ? 'right' : 'left',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.4rem 0.6rem',
                          borderRadius: '4px',
                          backgroundColor: isCurrentUser ? 'rgba(146, 204, 65, 0.2)' : 'rgba(32, 156, 238, 0.1)',
                          maxWidth: '85%',
                          textAlign: 'left',
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
                        }}
                      >
                        <span
                          style={{
                            color: isCurrentUser ? '#92cc41' : '#209cee',
                            fontWeight: 'bold',
                            fontSize: '0.4rem',
                          }}
                        >
                          {isCurrentUser ? 'You' : msg.username}:
                        </span>{' '}
                        <span style={{ color: '#ccc', fontSize: '0.45rem' }}>{msg.message}</span>
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            {!isSpectator && onSendChat && (
              <form onSubmit={handleSendChat} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="nes-input is-dark"
                  placeholder={isChatLoading ? 'Loading...' : 'Type a message...'}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  maxLength={500}
                  disabled={isChatLoading}
                  style={{ flex: 1, fontSize: '0.45rem', padding: '0.4rem', minHeight: '44px' }}
                />
                <button
                  type="submit"
                  className="nes-btn is-primary"
                  disabled={!chatInput.trim() || isChatLoading}
                  style={{ fontSize: '0.4rem', padding: '0.4rem 0.6rem', width: 'auto', minWidth: '60px', marginBottom: 0 }}
                >
                  Send
                </button>
              </form>
            )}

            {/* Show chat input for players even if onSendChat is undefined (fallback) */}
            {!isSpectator && !onSendChat && (
              <div style={{ textAlign: 'center', padding: '0.5rem', color: '#888', fontSize: '0.4rem' }}>
                Chat loading...
              </div>
            )}

            {isSpectator && (
              <div style={{ textAlign: 'center', padding: '0.5rem', color: '#888', fontSize: '0.4rem' }}>
                Spectators cannot send messages
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
