import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRoom } from '../contexts/RoomContext';
import { useGame } from '../contexts/GameContext';
import { UnifiedPromptArea } from '../components/UnifiedPromptArea';
import { Timer } from '../components/Timer';
import { CombinedChat } from '../components/CombinedChat';
import { InfoTabs } from '../components/InfoTabs';
import { getFinalScore, getMultiplier } from '../gameRules';

export function GamePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { room, leaveRoom } = useRoom();
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
      setSelectedChallenge(room.challenge as 1 | 2);

      if (room.player1) {
        setPlayer1((prev) => ({ ...prev, name: room.player1!.username }));
      }
      if (room.player2) {
        setPlayer2((prev) => ({ ...prev, name: room.player2!.username }));
      }

      // Connect players to Claude Code Server with roomCode for spectator support
      if (room.player1 && room.player2 && !player1Connected && !player2Connected) {
        connectPlayer(1, room.player1.username, room.challenge, room.code);
        connectPlayer(2, room.player2.username, room.challenge, room.code);
      }
    }
  }, [
    room,
    setSelectedChallenge,
    setPlayer1,
    setPlayer2,
    connectPlayer,
    player1Connected,
    player2Connected,
  ]);

  const handlePromptChange = (player: 'player1' | 'player2', prompt: string) => {
    if (player === 'player1') {
      setPlayer1((prev) => ({ ...prev, prompt }));
    } else {
      setPlayer2((prev) => ({ ...prev, prompt }));
    }
  };

  const handleReset = async () => {
    await leaveRoom();
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
    <div className="min-h-screen" style={{ backgroundColor: '#212529', color: '#fff' }}>
      {/* Header */}
      <div
        style={{ backgroundColor: '#000', padding: '1rem 0', borderBottom: '4px solid #92cc41' }}
      >
        <div className="container mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <i className="nes-icon trophy is-medium sm:is-large"></i>
              <div>
                <h1 style={{ fontSize: 'clamp(0.8rem, 4vw, 1.5rem)', lineHeight: '1.8rem' }}>
                  Prompt Duel
                </h1>
                <p style={{ fontSize: 'clamp(0.4rem, 1.5vw, 0.6rem)', color: '#92cc41' }}>
                  Challenge {selectedChallenge} - Room: {code}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-6 flex-wrap">
              <Timer timeLeft={timeLeft} isActive={isActive} />
              {player1Connected && player2Connected && (
                <div className="nes-badge">
                  <span className="is-success" style={{ fontSize: 'clamp(0.4rem, 1.5vw, 0.6rem)' }}>
                    CONNECTED
                  </span>
                </div>
              )}
            </div>

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

      {/* Main Battle Area */}
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {!isActive && timeLeft === gameTimeoutMinutes * 60 && !isSpectator && (
          <div className="text-center mb-4 sm:mb-8">
            <button
              onClick={startDuel}
              className="nes-btn is-warning"
              type="button"
              style={{ fontSize: 'clamp(0.8rem, 3vw, 1rem)', padding: '0.8rem 1.5rem' }}
            >
              Start Duel!
            </button>
          </div>
        )}

        {/* Spectator Banner */}
        {isSpectator && (
          <div className="text-center mb-4">
            <div className="nes-badge inline-block">
              <span className="is-warning">SPECTATING</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">You are watching this game live</p>
          </div>
        )}

        {/* End Duel Button - shows when duel is active */}
        {isActive && !isSpectator && (
          <div className="text-center mb-4 sm:mb-8">
            <button
              onClick={handleEndDuel}
              disabled={isEvaluating || player1Processing || player2Processing}
              className="nes-btn is-error"
              type="button"
              style={{
                fontSize: 'clamp(0.7rem, 2.5vw, 0.9rem)',
                padding: '0.6rem 1.2rem',
                opacity: player1Processing || player2Processing ? 0.5 : 1,
              }}
            >
              {isEvaluating
                ? 'Evaluating...'
                : player1Processing || player2Processing
                  ? 'Claude is working...'
                  : 'End Duel & Evaluate'}
            </button>
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
        <div className="nes-container is-dark with-title mt-4 sm:mt-6">
          <p className="title" style={{ fontSize: 'clamp(0.7rem, 3vw, 1rem)' }}>
            Scoreboard
          </p>
          <div className="flex items-center justify-center gap-4 sm:gap-8 flex-wrap">
            <div className="text-center">
              <div className="flex items-center gap-2 justify-center mb-2">
                <i className="nes-icon trophy is-small sm:is-medium"></i>
                <p style={{ fontSize: 'clamp(0.5rem, 2vw, 0.7rem)' }}>{player1.name}</p>
              </div>
              <p style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', color: '#209cee' }}>
                {getFinalScore(player1.score, player1.promptsUsed)}
              </p>
              <p style={{ fontSize: 'clamp(0.35rem, 1.5vw, 0.5rem)', color: '#888' }}>
                {player1.score} x {getMultiplier(player1.promptsUsed)}
              </p>
            </div>

            <div style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', opacity: 0.5 }}>VS</div>

            <div className="text-center">
              <div className="flex items-center gap-2 justify-center mb-2">
                <i className="nes-icon trophy is-small sm:is-medium"></i>
                <p style={{ fontSize: 'clamp(0.5rem, 2vw, 0.7rem)' }}>{player2.name}</p>
              </div>
              <p style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', color: '#92cc41' }}>
                {getFinalScore(player2.score, player2.promptsUsed)}
              </p>
              <p style={{ fontSize: 'clamp(0.35rem, 1.5vw, 0.5rem)', color: '#888' }}>
                {player2.score} x {getMultiplier(player2.promptsUsed)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
