import React, { useState } from 'react';
import { getFinalScore, getMultiplier, MAX_PROMPT_CHARS, MAX_PROMPTS } from '../../gameRules';
import { getProviderDisplayName, type ProviderKey } from '../ProviderSelector';

type Player = 'player1' | 'player2';

interface PlayerState {
  name: string;
  prompt: string;
  score: number;
  isReady: boolean;
  promptsUsed: number;
  hasEnded: boolean;
}

interface Message {
  sender: string;
  text: string;
  timestamp: number;
  type: 'player1' | 'player2' | 'judge' | 'system';
}

interface MobileGameLayoutProps {
  player1: PlayerState;
  player2: PlayerState;
  currentTurn: Player;
  timeLeft: number;
  isActive: boolean;
  gameMessages: Message[];
  player1Processing: boolean;
  player2Processing: boolean;
  player1Console: string[];
  player2Console: string[];
  isSpectator: boolean;
  currentUserPlayer: Player | null;
  roomCode?: string;
  selectedChallenge: number;
  room?: any;
  onPromptChange: (player: Player, prompt: string) => void;
  onSubmit: (player: Player) => void;
  onEndPrompts: (player: Player) => void;
  onLeave: () => void;
  onEndDuel?: () => void;
}

export function MobileGameLayout({
  player1,
  player2,
  currentTurn,
  timeLeft,
  isActive,
  gameMessages,
  player1Processing,
  player2Processing,
  player1Console,
  player2Console,
  isSpectator,
  currentUserPlayer,
  roomCode,
  selectedChallenge,
  room,
  onPromptChange,
  onSubmit,
  onEndPrompts,
  onLeave,
  onEndDuel,
}: MobileGameLayoutProps) {
  const [activeTab, setActiveTab] = useState<'arena' | 'chat' | 'scores' | 'info'>('arena');

  const isProcessing = player1Processing || player2Processing;
  const currentPlayer = currentTurn === 'player1' ? player1 : player2;
  const myPlayer = currentUserPlayer === 'player1' ? player1 : currentUserPlayer === 'player2' ? player2 : null;
  const myProcessing = currentUserPlayer === 'player1' ? player1Processing :
                       currentUserPlayer === 'player2' ? player2Processing : false;
  const canEdit = !isSpectator && currentUserPlayer === currentTurn && !myProcessing;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const charsLeft = MAX_PROMPT_CHARS - currentPlayer.prompt.length;
  const isOverLimit = charsLeft < 0;

  return (
    <div className="mobile-game">
      {/* Mobile Header */}
      <header className="app-header mobile-safe-top" style={{ padding: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src="/logo.png" alt="Prompt Duel" style={{ height: '35px' }} />
            <div>
              <div style={{ fontSize: '0.6rem', color: '#92cc41' }}>Room: {roomCode}</div>
              <div style={{ fontSize: '0.4rem', color: '#888' }}>Challenge {selectedChallenge}</div>
            </div>
          </div>

          {/* Timer */}
          <div
            className={`mobile-timer ${timeLeft < 60 ? 'is-warning' : ''}`}
            style={{
              background: timeLeft < 60 ? '#e76e55' : '#333',
              color: '#fff',
              padding: '0.25rem 0.5rem',
              fontSize: '0.7rem',
            }}
          >
            {formatTime(timeLeft)}
          </div>
        </div>
      </header>

      {/* Status Bar */}
      {isSpectator && (
        <div style={{ textAlign: 'center', padding: '0.5rem', background: '#f7d51d', color: '#000' }}>
          <span style={{ fontSize: '0.5rem' }}>SPECTATING</span>
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
          onClick={() => setActiveTab('arena')}
          style={{
            flex: 1,
            padding: '0.75rem 0.5rem',
            fontSize: '0.5rem',
            color: activeTab === 'arena' ? '#92cc41' : '#888',
            backgroundColor: activeTab === 'arena' ? 'rgba(146, 204, 65, 0.1)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'arena' ? '3px solid #92cc41' : '3px solid transparent',
            cursor: 'pointer',
            fontFamily: "'Press Start 2P', cursive",
            marginBottom: '-3px',
          }}
        >
          Battle
        </button>
        <button
          onClick={() => setActiveTab('scores')}
          style={{
            flex: 1,
            padding: '0.75rem 0.5rem',
            fontSize: '0.5rem',
            color: activeTab === 'scores' ? '#92cc41' : '#888',
            backgroundColor: activeTab === 'scores' ? 'rgba(146, 204, 65, 0.1)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'scores' ? '3px solid #92cc41' : '3px solid transparent',
            cursor: 'pointer',
            fontFamily: "'Press Start 2P', cursive",
            marginBottom: '-3px',
          }}
        >
          Scores
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          style={{
            flex: 1,
            padding: '0.75rem 0.5rem',
            fontSize: '0.5rem',
            color: activeTab === 'chat' ? '#92cc41' : '#888',
            backgroundColor: activeTab === 'chat' ? 'rgba(146, 204, 65, 0.1)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'chat' ? '3px solid #92cc41' : '3px solid transparent',
            cursor: 'pointer',
            fontFamily: "'Press Start 2P', cursive",
            marginBottom: '-3px',
          }}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveTab('info')}
          style={{
            flex: 1,
            padding: '0.75rem 0.5rem',
            fontSize: '0.5rem',
            color: activeTab === 'info' ? '#92cc41' : '#888',
            backgroundColor: activeTab === 'info' ? 'rgba(146, 204, 65, 0.1)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'info' ? '3px solid #92cc41' : '3px solid transparent',
            cursor: 'pointer',
            fontFamily: "'Press Start 2P', cursive",
            marginBottom: '-3px',
          }}
        >
          Info
        </button>
      </div>

      {/* Tab Content */}
      <div className="page-content" style={{ paddingTop: 0 }}>
        {/* Arena Tab */}
        {activeTab === 'arena' && (
          <div className="mobile-battle-arena">
            {/* Player Status Cards */}
            <div className="player-indicators">
              <div
                className={`player-indicator nes-container ${currentTurn === 'player1' && isActive ? 'is-rounded' : 'is-dark'}`}
                style={{
                  padding: '0.5rem',
                  borderColor: currentTurn === 'player1' && isActive ? '#209cee' : undefined,
                  borderWidth: currentTurn === 'player1' && isActive ? '3px' : undefined,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.5rem' }}>{player1.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.4rem' }}>{player1.promptsUsed}/7</span>
                    {player1.hasEnded && <span style={{ fontSize: '0.35rem', color: '#e76e55' }}>ENDED</span>}
                    {player1Processing && <span style={{ fontSize: '0.35rem', color: '#f7d51d' }}>AI...</span>}
                  </div>
                </div>
              </div>

              <div className="vs-badge" style={{ textAlign: 'center', padding: '0.25rem', color: '#666' }}>
                VS
              </div>

              <div
                className={`player-indicator nes-container ${currentTurn === 'player2' && isActive ? 'is-rounded' : 'is-dark'}`}
                style={{
                  padding: '0.5rem',
                  borderColor: currentTurn === 'player2' && isActive ? '#92cc41' : undefined,
                  borderWidth: currentTurn === 'player2' && isActive ? '3px' : undefined,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.5rem' }}>{player2.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.4rem' }}>{player2.promptsUsed}/7</span>
                    {player2.hasEnded && <span style={{ fontSize: '0.35rem', color: '#e76e55' }}>ENDED</span>}
                    {player2Processing && <span style={{ fontSize: '0.35rem', color: '#f7d51d' }}>AI...</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Turn Indicator */}
            {isActive && (
              <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                <span
                  style={{
                    fontSize: '0.55rem',
                    padding: '0.25rem 0.75rem',
                    background: currentPlayer.hasEnded ? '#333' : currentTurn === 'player1' ? '#209cee' : '#92cc41',
                    color: '#fff',
                  }}
                >
                  {currentPlayer.hasEnded ? `${currentPlayer.name} ended` : `${currentPlayer.name}'s Turn`}
                </span>
              </div>
            )}

            {/* Prompt Input */}
            <div className="nes-container is-dark" style={{ padding: '0.75rem' }}>
              <label style={{ fontSize: '0.45rem', color: '#888', marginBottom: '0.5rem', display: 'block' }}>
                Create Your Prompt
              </label>
              <textarea
                value={currentPlayer.prompt}
                onChange={(e) => onPromptChange(currentTurn, e.target.value)}
                disabled={!canEdit || !isActive || currentPlayer.isReady || currentPlayer.promptsUsed >= MAX_PROMPTS || currentPlayer.hasEnded || isProcessing}
                maxLength={MAX_PROMPT_CHARS + 50}
                className="nes-textarea"
                style={{
                  minHeight: '100px',
                  fontSize: '0.5rem',
                  lineHeight: '1.4',
                }}
                placeholder={
                  !isActive
                    ? 'Waiting to start...'
                    : !canEdit && currentUserPlayer
                      ? `Waiting for ${currentPlayer.name}...`
                      : currentPlayer.hasEnded
                        ? "You've ended your prompts!"
                        : currentPlayer.promptsUsed >= MAX_PROMPTS
                          ? "You've used all prompts!"
                          : `Write your prompt here...`
                }
              />

              {/* Character count */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.4rem' }}>
                <span style={{ color: isOverLimit ? '#e76e55' : charsLeft <= 40 ? '#f7d51d' : '#888' }}>
                  {currentPlayer.prompt.length}/{MAX_PROMPT_CHARS}
                </span>
                <span style={{ color: (myPlayer?.promptsUsed ?? 0) >= MAX_PROMPTS ? '#e76e55' : '#888' }}>
                  Remaining: {MAX_PROMPTS - (myPlayer?.promptsUsed ?? 0)}
                </span>
              </div>

              {/* Character bar */}
              <div style={{ height: '4px', background: '#333', marginTop: '0.25rem' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min((currentPlayer.prompt.length / MAX_PROMPT_CHARS) * 100, 100)}%`,
                  background: isOverLimit ? '#e76e55' : charsLeft <= 40 ? '#f7d51d' : '#92cc41',
                  transition: 'width 0.1s',
                }} />
              </div>

              {/* Submit Button */}
              <button
                onClick={() => onSubmit(currentTurn)}
                disabled={
                  !canEdit ||
                  !isActive ||
                  !currentPlayer.prompt.trim() ||
                  isOverLimit ||
                  currentPlayer.isReady ||
                  currentPlayer.promptsUsed >= MAX_PROMPTS ||
                  currentPlayer.hasEnded ||
                  isProcessing
                }
                className={`nes-btn ${currentTurn === 'player1' ? 'is-primary' : 'is-success'}`}
                style={{
                  width: '100%',
                  marginTop: '0.75rem',
                  fontSize: '0.55rem',
                  opacity: isProcessing || !canEdit ? 0.5 : 1,
                }}
              >
                {isProcessing ? 'AI Working...' : !canEdit && currentUserPlayer ? `${currentPlayer.name}'s Turn` : 'Submit Prompt'}
              </button>

              {/* End Prompts Button */}
              {canEdit && isActive && myPlayer && !myPlayer.hasEnded && myPlayer.promptsUsed > 0 && (
                <button
                  onClick={() => onEndPrompts(currentTurn)}
                  disabled={isProcessing}
                  className="nes-btn is-error"
                  style={{
                    width: '100%',
                    marginTop: '0.5rem',
                    fontSize: '0.45rem',
                    opacity: isProcessing ? 0.5 : 1,
                  }}
                >
                  End My Prompts ({myPlayer.promptsUsed}/7 used)
                </button>
              )}

              {/* Multiplier Info */}
              {isActive && myPlayer && !myPlayer.hasEnded && myPlayer.promptsUsed < MAX_PROMPTS && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.4rem', color: '#888' }}>
                  <span style={{ color: '#f7d51d' }}>Multiplier: </span>
                  <span style={{ color: '#92cc41' }}>
                    {myPlayer.promptsUsed > 0 ? `×${getMultiplier(myPlayer.promptsUsed)}` : '---'}
                  </span>
                  {myPlayer.promptsUsed > 0 && myPlayer.promptsUsed < MAX_PROMPTS && (
                    <span style={{ marginLeft: '0.5rem' }}>
                      (Next: ×{getMultiplier(myPlayer.promptsUsed + 1)})
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
              {currentUserPlayer === 'player1' && isActive && onEndDuel && (
                <button
                  onClick={onEndDuel}
                  disabled={isProcessing || currentTurn === 'player2'}
                  className="nes-btn is-warning"
                  style={{ flex: 1, fontSize: '0.45rem', opacity: (isProcessing || currentTurn === 'player2') ? 0.5 : 1 }}
                >
                  End Duel
                </button>
              )}
              <button
                onClick={onLeave}
                disabled={isProcessing || (currentUserPlayer !== currentTurn && isActive)}
                className="nes-btn is-error"
                style={{ flex: 1, fontSize: '0.45rem', opacity: (isProcessing || (currentUserPlayer !== currentTurn && isActive)) ? 0.5 : 1 }}
              >
                Leave
              </button>
            </div>
          </div>
        )}

        {/* Scores Tab */}
        {activeTab === 'scores' && (
          <div className="mobile-scoreboard nes-container is-dark">
            <div className="players-container">
              <div className="player-score">
                <div className="name" style={{ fontSize: '0.5rem', color: '#209cee' }}>{player1.name}</div>
                {room?.player1Provider && (
                  <div style={{ fontSize: '0.35rem', color: '#666', marginBottom: '0.25rem' }}>
                    {getProviderDisplayName(room.player1Provider as ProviderKey, room.player1Model)}
                  </div>
                )}
                <div className="score" style={{ fontSize: '1.5rem', color: '#209cee' }}>
                  {getFinalScore(player1.score, player1.promptsUsed)}
                </div>
                <div className="details">
                  {player1.score} × {getMultiplier(player1.promptsUsed)}
                </div>
                <div className="details">Prompts: {player1.promptsUsed}/7</div>
              </div>

              <div className="vs" style={{ fontSize: '1rem', color: '#666' }}>VS</div>

              <div className="player-score">
                <div className="name" style={{ fontSize: '0.5rem', color: '#92cc41' }}>{player2.name}</div>
                {room?.player2Provider && (
                  <div style={{ fontSize: '0.35rem', color: '#666', marginBottom: '0.25rem' }}>
                    {getProviderDisplayName(room.player2Provider as ProviderKey, room.player2Model)}
                  </div>
                )}
                <div className="score" style={{ fontSize: '1.5rem', color: '#92cc41' }}>
                  {getFinalScore(player2.score, player2.promptsUsed)}
                </div>
                <div className="details">
                  {player2.score} × {getMultiplier(player2.promptsUsed)}
                </div>
                <div className="details">Prompts: {player2.promptsUsed}/7</div>
              </div>
            </div>
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="mobile-chat nes-container is-dark custom-scrollbar" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {gameMessages.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#666', fontSize: '0.45rem', padding: '1rem' }}>
                No messages yet...
              </div>
            ) : (
              [...gameMessages].reverse().map((msg, idx) => (
                <div
                  key={idx}
                  className="message"
                  style={{
                    padding: '0.5rem',
                    borderBottom: '1px solid #222',
                    fontSize: '0.45rem',
                  }}
                >
                  <div className="sender" style={{
                    color: msg.type === 'player1' ? '#209cee' : msg.type === 'player2' ? '#92cc41' : msg.type === 'judge' ? '#f7d51d' : '#888',
                    fontSize: '0.4rem',
                    marginBottom: '0.25rem',
                  }}>
                    {msg.sender}
                  </div>
                  <div style={{ color: '#ccc', wordBreak: 'break-word' }}>
                    {msg.text.startsWith('TURN:') || msg.text.startsWith('SCORE_UPDATE:') || msg.text.startsWith('RESULTS:') || msg.text.startsWith('GAME_END')
                      ? null
                      : msg.text.replace(/\[START:\d+:\d+\]/, '')}
                  </div>
                </div>
              )).filter(Boolean)
            )}
          </div>
        )}

        {/* Info Tab */}
        {activeTab === 'info' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Challenge Info */}
            <div className="nes-container is-dark" style={{ padding: '0.75rem' }}>
              <div style={{ fontSize: '0.5rem', color: '#f7d51d', marginBottom: '0.5rem' }}>
                Challenge {selectedChallenge}
              </div>
              <div style={{ fontSize: '0.4rem', color: '#888' }}>
                {selectedChallenge === 1
                  ? 'BracketValidator - Implement a function that validates balanced brackets'
                  : 'QuantumHeist - Advanced multi-step coding challenge'}
              </div>
            </div>

            {/* Player 1 Console */}
            <div className="nes-container is-dark" style={{ padding: '0.75rem' }}>
              <div style={{ fontSize: '0.45rem', color: '#209cee', marginBottom: '0.5rem' }}>
                {player1.name}'s Console
              </div>
              <div
                className="custom-scrollbar"
                style={{
                  maxHeight: '150px',
                  overflowY: 'auto',
                  backgroundColor: '#000',
                  padding: '0.5rem',
                  fontFamily: 'monospace',
                  fontSize: '0.35rem',
                  color: '#0f0',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {player1Console.length > 0
                  ? player1Console.slice(-50).join('\n')
                  : 'No output yet...'}
              </div>
            </div>

            {/* Player 2 Console */}
            <div className="nes-container is-dark" style={{ padding: '0.75rem' }}>
              <div style={{ fontSize: '0.45rem', color: '#92cc41', marginBottom: '0.5rem' }}>
                {player2.name}'s Console
              </div>
              <div
                className="custom-scrollbar"
                style={{
                  maxHeight: '150px',
                  overflowY: 'auto',
                  backgroundColor: '#000',
                  padding: '0.5rem',
                  fontFamily: 'monospace',
                  fontSize: '0.35rem',
                  color: '#0f0',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {player2Console.length > 0
                  ? player2Console.slice(-50).join('\n')
                  : 'No output yet...'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
