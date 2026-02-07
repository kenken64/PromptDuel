import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRoom } from '../contexts/RoomContext';
import { useGame } from '../contexts/GameContext';
import { UnifiedPromptArea } from '../components/UnifiedPromptArea';
import { Timer } from '../components/Timer';
import { CombinedChat } from '../components/CombinedChat';
import { InfoTabs } from '../components/InfoTabs';
import { getFinalScore, getMultiplier } from '../gameRules';
import { config } from '../config';

export function GamePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { room: contextRoom, leaveRoom } = useRoom();
  const [localRoom, setLocalRoom] = useState<any>(null);

  // Use context room if available, otherwise use local room
  const room = contextRoom || localRoom;

  // Fetch room data if not available in context
  useEffect(() => {
    if (!contextRoom && code && token) {
      console.log('Fetching room data for:', code);
      fetch(`${config.apiUrl}/rooms/${code}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.room) {
            console.log('Room data fetched:', data.room);
            setLocalRoom(data.room);
          }
        })
        .catch((err) => console.error('Failed to fetch room:', err));
    }
  }, [contextRoom, code, token]);

  // Determine which player the current user is
  const currentUserPlayer: 'player1' | 'player2' | null =
    room?.player1?.id === user?.id
      ? 'player1'
      : room?.player2?.id === user?.id
        ? 'player2'
        : null;
  const {
    player1,
    player2,
    currentTurn,
    timeLeft,
    isActive,
    gameMessages,
    player1Console,
    player2Console,
    player1Connected,
    player2Connected,
    player1Processing,
    player2Processing,
    isEvaluating,
    selectedChallenge,
    gameTimeoutMinutes,
    setPlayer1,
    setPlayer2,
    setSelectedChallenge,
    setGameTimeoutMinutes,
    setTimeLeft,
    setIsActive,
    handleSubmit,
    handleEndPrompts,
    startDuel,
    handleEndDuel,
    resetGame,
    connectPlayer,
    isSpectator,
  } = useGame();

  // Initialize game from room data
  useEffect(() => {
    if (room) {
      console.log('GamePage: Room data available', {
        code: room.code,
        challenge: room.challenge,
        player1: room.player1,
        player2: room.player2,
        player1Connected,
        player2Connected,
      });

      setSelectedChallenge(room.challenge as 1 | 2);

      if (room.player1) {
        setPlayer1((prev) => ({ ...prev, name: room.player1!.username }));
      }
      if (room.player2) {
        setPlayer2((prev) => ({ ...prev, name: room.player2!.username }));
      }

      // Connect only the current player to Claude Code Server
      // Each player's browser only connects their own WebSocket
      if (room.player1 && room.player2) {
        if (currentUserPlayer === 'player1' && !player1Connected) {
          console.log('GamePage: Connecting player 1 to Claude Code Server');
          connectPlayer(1, room.player1.username, room.challenge, room.code);
        } else if (currentUserPlayer === 'player2' && !player2Connected) {
          console.log('GamePage: Connecting player 2 to Claude Code Server');
          connectPlayer(2, room.player2.username, room.challenge, room.code);
        }
      }
    } else {
      console.log('GamePage: Room data not available yet');
    }
  }, [
    room,
    setSelectedChallenge,
    setPlayer1,
    setPlayer2,
    connectPlayer,
    player1Connected,
    player2Connected,
    currentUserPlayer,
  ]);

  // Auto-start duel when the current player is connected
  // Player 1 (host) sends the judge message, Player 2 just activates
  useEffect(() => {
    const isConnected = currentUserPlayer === 'player1' ? player1Connected : player2Connected;

    if (isConnected && !isActive && !isSpectator && currentUserPlayer) {
      console.log(`${currentUserPlayer} connected, starting duel...`);
      if (currentUserPlayer === 'player1') {
        // Host sends the start message
        startDuel();
      } else {
        // Player 2 just activates the game locally without sending message
        setIsActive(true);
      }
    }
  }, [player1Connected, player2Connected, isActive, isSpectator, startDuel, currentUserPlayer, setIsActive]);

  const handlePromptChange = (player: 'player1' | 'player2', prompt: string) => {
    if (player === 'player1') {
      setPlayer1((prev) => ({ ...prev, prompt }));
    } else {
      setPlayer2((prev) => ({ ...prev, prompt }));
    }
  };

  const handleReset = async () => {
    await leaveRoom(code);
    resetGame();
    navigate('/lobby');
  };

  // Redirect to results when game ends
  useEffect(() => {
    if (room?.status === 'finished') {
      navigate(`/results/${code}`);
    }
  }, [room?.status, code, navigate]);

  return (
    <div className="page-container font-['Press_Start_2P']">
      <div className="bg-pattern"></div>

      {/* Header */}
      <header className="app-header p-4">
        <div className="container mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4 animate-fade-in">
              <img src="/logo.png" alt="Prompt Duel" style={{ height: '70px', width: 'auto' }} />
              <div>
                <h1 className="text-primary glow-text" style={{ fontSize: 'clamp(0.8rem, 4vw, 1.5rem)', lineHeight: '1.8rem' }}>
                  Prompt Duel
                </h1>
                <p style={{ fontSize: 'clamp(0.4rem, 1.5vw, 0.6rem)', color: '#92cc41' }}>
                  Challenge {selectedChallenge} - Room: {code}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-6 flex-wrap animate-fade-in animate-delay-1">
              <Timer timeLeft={timeLeft} isActive={isActive} />
              {((currentUserPlayer === 'player1' && player1Connected) ||
                (currentUserPlayer === 'player2' && player2Connected)) && (
                <div className="nes-badge animate-glow">
                  <span className="is-success" style={{ fontSize: 'clamp(0.4rem, 1.5vw, 0.6rem)' }}>
                    CONNECTED
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 animate-fade-in animate-delay-2">
              <span style={{ fontSize: '0.7rem', color: '#888' }}>
                Playing as <span style={{ color: '#92cc41' }}>{user?.username}</span>
              </span>
              <button
                onClick={handleReset}
                className="nes-btn is-error"
                type="button"
                style={{ fontSize: 'clamp(0.5rem, 2vw, 0.8rem)', padding: '0.5rem 1rem' }}
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Battle Area */}
      <main className="page-content">
        {/* Waiting for connection */}
        {!isActive && !isSpectator && (
          <div className="text-center mb-4 sm:mb-8 animate-fade-in">
            <div className="nes-container is-dark" style={{ display: 'inline-block', padding: '1rem 2rem' }}>
              <p style={{ fontSize: '0.8rem', color: '#92cc41' }}>
                {((currentUserPlayer === 'player1' && player1Connected) ||
                  (currentUserPlayer === 'player2' && player2Connected))
                  ? 'Starting duel...'
                  : 'Connecting to Claude Code...'}
              </p>
            </div>
          </div>
        )}

        {/* Spectator Banner */}
        {isSpectator && (
          <div className="text-center mb-4 animate-fade-in">
            <div className="nes-badge inline-block">
              <span className="is-warning">SPECTATING</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">You are watching this game live</p>
          </div>
        )}

        {/* Duel Active Indicator */}
        {isActive && !isSpectator && (
          <div className="text-center mb-4 sm:mb-8">
            <div className="nes-badge inline-block">
              <span className="is-success" style={{ fontSize: '0.7rem' }}>DUEL IN PROGRESS</span>
            </div>
          </div>
        )}

        {/* Unified Prompt Area */}
        <UnifiedPromptArea
          player1={player1}
          player2={player2}
          currentTurn={currentTurn}
          isActive={isActive}
          onPromptChange={handlePromptChange}
          onSubmit={handleSubmit}
          onEndPrompts={handleEndPrompts}
          player1Processing={player1Processing}
          player2Processing={player2Processing}
          readOnly={isSpectator}
          currentUserPlayer={currentUserPlayer}
        />

        {/* Combined Chat */}
        <div className="mt-4 sm:mt-6">
          <CombinedChat messages={gameMessages} />
        </div>

        {/* Info Tabs - Video & Console */}
        <div className="mt-4 sm:mt-6">
          <InfoTabs
            player1={player1}
            player2={player2}
            player1Console={player1Console}
            player2Console={player2Console}
            challenge={selectedChallenge}
          />
        </div>

        {/* Score Display */}
        <div className="nes-container is-dark with-title mt-4 sm:mt-6 glow-primary">
          <p className="title" style={{ fontSize: 'clamp(0.7rem, 3vw, 1rem)' }}>
            Scoreboard
          </p>
          <div className="flex items-center justify-center gap-4 sm:gap-8 flex-wrap">
            <div className="text-center animate-slide-left">
              <div className="flex items-center gap-2 justify-center mb-2">
                <i className="nes-icon trophy is-small sm:is-medium"></i>
                <p style={{ fontSize: 'clamp(0.5rem, 2vw, 0.7rem)' }}>{player1.name}</p>
              </div>
              <p className="glow-text" style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', color: '#209cee' }}>
                {getFinalScore(player1.score, player1.promptsUsed)}
              </p>
              <p style={{ fontSize: 'clamp(0.35rem, 1.5vw, 0.5rem)', color: '#888' }}>
                {player1.score} x {getMultiplier(player1.promptsUsed)}
              </p>
            </div>

            <div className="vs-divider" style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)' }}>VS</div>

            <div className="text-center animate-slide-right">
              <div className="flex items-center gap-2 justify-center mb-2">
                <i className="nes-icon trophy is-small sm:is-medium"></i>
                <p style={{ fontSize: 'clamp(0.5rem, 2vw, 0.7rem)' }}>{player2.name}</p>
              </div>
              <p className="glow-text" style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', color: '#92cc41' }}>
                {getFinalScore(player2.score, player2.promptsUsed)}
              </p>
              <p style={{ fontSize: 'clamp(0.35rem, 1.5vw, 0.5rem)', color: '#888' }}>
                {player2.score} x {getMultiplier(player2.promptsUsed)}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
