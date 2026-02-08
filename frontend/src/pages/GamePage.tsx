import React, { useEffect, useState, useRef } from 'react';
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
import { getProviderDisplayName, type ProviderKey } from '../components/ProviderSelector';
import { useIsMobile } from '../hooks/useIsMobile';
import { MobileGameLayout } from '../components/mobile';

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
    winner,
    gameMessages,
    player1Console,
    player2Console,
    player1Connected,
    player2Connected,
    player1Processing,
    player2Processing,
    isEvaluating,
    shouldNavigateToResults,
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
    console.log('[GamePage Effect] Running with:', {
      hasRoom: !!room,
      roomCode: room?.code,
      roomPlayer1: room?.player1,
      roomPlayer2: room?.player2,
      currentUserPlayer,
      userId: user?.id,
      player1Id: room?.player1?.id,
      player2Id: room?.player2?.id,
      player1Connected,
      player2Connected,
    });

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

      // Set timer from room settings
      if (room.timerMinutes) {
        setGameTimeoutMinutes(room.timerMinutes);
        setTimeLeft(room.timerMinutes * 60);
      }

      if (room.player1) {
        setPlayer1((prev) => ({ ...prev, name: room.player1!.username }));
      }
      if (room.player2) {
        setPlayer2((prev) => ({ ...prev, name: room.player2!.username }));
      }

      // Connect only the current player to Claude Code Server
      // Each player's browser only connects their own WebSocket
      console.log('[GamePage] Checking WebSocket connection conditions:', {
        hasPlayer1: !!room.player1,
        hasPlayer2: !!room.player2,
        currentUserPlayer,
        player1Connected,
        player2Connected,
      });

      if (room.player1 && room.player2) {
        // Always attempt to connect - the connectPlayer function will handle
        // checking if already connected and room changes
        if (currentUserPlayer === 'player1') {
          console.log('GamePage: Requesting player 1 connection to Claude Code Server');
          console.log('GamePage: Player 1 provider:', room.player1Provider, room.player1Model);
          connectPlayer(1, room.player1.username, room.challenge, room.code, room.player1Provider, room.player1Model);
        } else if (currentUserPlayer === 'player2') {
          console.log('GamePage: Requesting player 2 connection to Claude Code Server');
          console.log('GamePage: Player 2 provider:', room.player2Provider, room.player2Model);
          connectPlayer(2, room.player2.username, room.challenge, room.code, room.player2Provider, room.player2Model);
        } else {
          console.log('[GamePage] Not connecting: currentUserPlayer is null');
        }
      } else {
        console.log('[GamePage] Not connecting: missing player1 or player2 in room data');
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

  // Track if duel has been started to prevent re-triggering (use ref for synchronous updates)
  const duelStartedRef = useRef(false);

  // Auto-start duel when the current player is connected (only once)
  // Player 1 (host) sends the judge message, Player 2 just activates
  useEffect(() => {
    const isConnected = currentUserPlayer === 'player1' ? player1Connected : player2Connected;

    // Only auto-start if:
    // - Connected
    // - Game not active
    // - Not a spectator
    // - Duel hasn't been started yet (prevents re-triggering after End Duel)
    // - Not currently evaluating
    // - No winner yet
    if (isConnected && !isActive && !isSpectator && currentUserPlayer && !duelStartedRef.current && !isEvaluating && !winner) {
      console.log(`${currentUserPlayer} connected, starting duel...`);
      duelStartedRef.current = true; // Set immediately (synchronous)
      if (currentUserPlayer === 'player1') {
        // Host sends the start message
        startDuel();
      } else {
        // Player 2 just activates the game locally without sending message
        setIsActive(true);
      }
    }
  }, [player1Connected, player2Connected, isActive, isSpectator, startDuel, currentUserPlayer, setIsActive, isEvaluating, winner]);

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

  // Redirect to results when game ends (room status changes, winner determined, or GAME_END received)
  useEffect(() => {
    if (room?.status === 'finished' || (winner && !isActive && !isEvaluating) || shouldNavigateToResults) {
      console.log('Navigating to results - room finished, winner determined, or GAME_END received');
      // Small delay to ensure state is saved
      setTimeout(() => {
        navigate(`/results/${code}`);
      }, 1000);
    }
  }, [room?.status, code, navigate, winner, isActive, isEvaluating, shouldNavigateToResults]);

  const isMobile = useIsMobile();

  // Mobile Layout
  if (isMobile) {
    return (
      <MobileGameLayout
        player1={player1}
        player2={player2}
        currentTurn={currentTurn}
        timeLeft={timeLeft}
        isActive={isActive}
        gameMessages={gameMessages}
        player1Processing={player1Processing}
        player2Processing={player2Processing}
        player1Console={player1Console}
        player2Console={player2Console}
        isSpectator={isSpectator}
        currentUserPlayer={currentUserPlayer}
        roomCode={code}
        selectedChallenge={selectedChallenge}
        room={room}
        onPromptChange={handlePromptChange}
        onSubmit={handleSubmit}
        onEndPrompts={handleEndPrompts}
        onLeave={handleReset}
        onEndDuel={handleEndDuel}
      />
    );
  }

  // Desktop Layout
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
              {/* End Duel button - only for host (player1) when it's their turn, game is active and not processing */}
              {currentUserPlayer === 'player1' && isActive && !isEvaluating && (
                <button
                  onClick={handleEndDuel}
                  disabled={player1Processing || player2Processing || currentTurn === 'player2'}
                  className="nes-btn is-warning"
                  type="button"
                  style={{
                    fontSize: 'clamp(0.5rem, 2vw, 0.8rem)',
                    padding: '0.5rem 1rem',
                    opacity: (player1Processing || player2Processing || currentTurn === 'player2') ? 0.5 : 1,
                  }}
                >
                  {(player1Processing || player2Processing) ? 'Wait...' : currentTurn === 'player2' ? "P2's Turn" : 'End Duel'}
                </button>
              )}
              <button
                onClick={handleReset}
                disabled={player1Processing || player2Processing || (currentUserPlayer !== currentTurn && isActive)}
                className="nes-btn is-error"
                type="button"
                style={{
                  fontSize: 'clamp(0.5rem, 2vw, 0.8rem)',
                  padding: '0.5rem 1rem',
                  opacity: (player1Processing || player2Processing || (currentUserPlayer !== currentTurn && isActive)) ? 0.5 : 1,
                }}
              >
                {(player1Processing || player2Processing)
                  ? 'Wait...'
                  : (currentUserPlayer !== currentTurn && isActive)
                    ? (currentTurn === 'player1' ? "P1's Turn" : "P2's Turn")
                    : 'Leave'}
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
                  : 'Connecting to AI Provider...'}
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
          <div className="text-center mb-4 sm:mb-8" style={{ position: 'relative', zIndex: 1 }}>
            <span
              style={{
                display: 'inline-block',
                padding: '0.4rem 1rem',
                backgroundColor: '#92cc41',
                color: '#fff',
                fontSize: '0.7rem',
                fontWeight: 'bold',
              }}
            >
              DUEL IN PROGRESS
            </span>
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
              <div className="flex items-center gap-2 justify-center mb-1">
                <i className="nes-icon trophy is-small sm:is-medium"></i>
                <p style={{ fontSize: 'clamp(0.5rem, 2vw, 0.7rem)' }}>{player1.name}</p>
              </div>
              <p style={{ fontSize: 'clamp(0.35rem, 1.2vw, 0.45rem)', color: '#666', marginBottom: '0.5rem' }}>
                {getProviderDisplayName(
                  (room?.player1Provider || 'anthropic') as ProviderKey,
                  room?.player1Model || 'claude-sonnet-4-20250514'
                )}
              </p>
              <p className="glow-text" style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', color: '#209cee' }}>
                {getFinalScore(player1.score, player1.promptsUsed)}
              </p>
              <p style={{ fontSize: 'clamp(0.35rem, 1.5vw, 0.5rem)', color: '#888' }}>
                {player1.score} x {getMultiplier(player1.promptsUsed)}
              </p>
            </div>

            <div className="vs-divider" style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)' }}>VS</div>

            <div className="text-center animate-slide-right">
              <div className="flex items-center gap-2 justify-center mb-1">
                <i className="nes-icon trophy is-small sm:is-medium"></i>
                <p style={{ fontSize: 'clamp(0.5rem, 2vw, 0.7rem)' }}>{player2.name}</p>
              </div>
              <p style={{ fontSize: 'clamp(0.35rem, 1.2vw, 0.45rem)', color: '#666', marginBottom: '0.5rem' }}>
                {getProviderDisplayName(
                  (room?.player2Provider || 'anthropic') as ProviderKey,
                  room?.player2Model || 'claude-sonnet-4-20250514'
                )}
              </p>
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
