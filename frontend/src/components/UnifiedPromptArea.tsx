type Player = 'player1' | 'player2';

interface PlayerState {
  name: string;
  prompt: string;
  score: number;
  isReady: boolean;
  promptsUsed: number;
  hasEnded: boolean;
}

interface UnifiedPromptAreaProps {
  player1: PlayerState;
  player2: PlayerState;
  currentTurn: Player;
  isActive: boolean;
  onPromptChange: (player: Player, prompt: string) => void;
  onSubmit: (player: Player) => void;
  onEndPrompts: (player: Player) => void;
  player1Processing?: boolean;
  player2Processing?: boolean;
}

export function UnifiedPromptArea({
  player1,
  player2,
  currentTurn,
  isActive,
  onPromptChange,
  onSubmit,
  onEndPrompts,
  player1Processing = false,
  player2Processing = false,
}: UnifiedPromptAreaProps) {
  const isProcessing = player1Processing || player2Processing;
  const currentPlayer = currentTurn === 'player1' ? player1 : player2;
  const isPlayer1Turn = currentTurn === 'player1';

  return (
    <div className="nes-container is-dark with-title" style={{ position: 'relative' }}>
      <p className="title" style={{ fontSize: 'clamp(0.7rem, 3vw, 1rem)' }}>
        Battle Arena
      </p>

      {/* Player Indicators */}
      <div className="flex items-center justify-between mb-4 sm:mb-6 flex-wrap gap-2 sm:gap-4">
        <div
          className={`nes-container ${isPlayer1Turn && isActive ? 'is-rounded' : 'is-dark'}`}
          style={{
            padding: '0.5rem',
            borderColor: isPlayer1Turn && isActive ? '#209cee' : undefined,
            borderWidth: isPlayer1Turn && isActive ? '4px' : undefined,
            flex: '1 1 auto',
            minWidth: '140px',
          }}
        >
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center sm:justify-start">
            <div className="flex items-center gap-1 sm:gap-2">
              <i className="nes-icon coin is-small"></i>
              <span style={{ fontSize: 'clamp(0.5rem, 2.5vw, 0.7rem)' }}>{player1.name}</span>
            </div>
            <div
              className="flex items-center gap-1"
              style={{ fontSize: 'clamp(0.4rem, 2vw, 0.6rem)' }}
            >
              <i className="nes-icon star is-small"></i>
              <span>{player1.promptsUsed}/7</span>
            </div>
            {player1.isReady && <i className="nes-icon check is-small"></i>}
            {player1.hasEnded && (
              <span style={{ fontSize: 'clamp(0.4rem, 1.5vw, 0.5rem)', color: '#e76e55' }}>ENDED</span>
            )}
          </div>
        </div>

        <div className="nes-badge is-splited" style={{ fontSize: 'clamp(0.6rem, 2.5vw, 0.8rem)' }}>
          <span className="is-dark">V</span>
          <span className="is-primary">S</span>
        </div>

        <div
          className={`nes-container ${!isPlayer1Turn && isActive ? 'is-rounded' : 'is-dark'}`}
          style={{
            padding: '0.5rem',
            borderColor: !isPlayer1Turn && isActive ? '#92cc41' : undefined,
            borderWidth: !isPlayer1Turn && isActive ? '4px' : undefined,
            flex: '1 1 auto',
            minWidth: '140px',
          }}
        >
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center sm:justify-start">
            <div className="flex items-center gap-1 sm:gap-2">
              <i className="nes-icon coin is-small"></i>
              <span style={{ fontSize: 'clamp(0.5rem, 2.5vw, 0.7rem)' }}>{player2.name}</span>
            </div>
            <div
              className="flex items-center gap-1"
              style={{ fontSize: 'clamp(0.4rem, 2vw, 0.6rem)' }}
            >
              <i className="nes-icon star is-small"></i>
              <span>{player2.promptsUsed}/7</span>
            </div>
            {player2.isReady && <i className="nes-icon check is-small"></i>}
            {player2.hasEnded && (
              <span style={{ fontSize: 'clamp(0.4rem, 1.5vw, 0.5rem)', color: '#e76e55' }}>ENDED</span>
            )}
          </div>
        </div>
      </div>

      {/* Turn Indicator */}
      {isActive && (
        <div className="mb-4 text-center">
          <div className={`nes-badge ${currentPlayer.hasEnded ? 'is-dark' : isPlayer1Turn ? 'is-error' : 'is-success'}`}>
            <span style={{ fontSize: 'clamp(0.5rem, 2.5vw, 0.8rem)' }}>
              {currentPlayer.hasEnded ? `${currentPlayer.name} has ended` : `${currentPlayer.name}'s Turn!`}
            </span>
          </div>
        </div>
      )}

      {/* Prompt Input */}
      <div className="mb-4">
        <label
          style={{
            fontSize: 'clamp(0.5rem, 2.5vw, 0.7rem)',
            marginBottom: '0.5rem',
            display: 'block',
          }}
        >
          Create Your Prompt
        </label>
        <div className="nes-field">
          <textarea
            value={currentPlayer.prompt}
            onChange={(e) => onPromptChange(currentTurn, e.target.value)}
            disabled={!isActive || currentPlayer.isReady || currentPlayer.promptsUsed >= 7 || currentPlayer.hasEnded}
            className="nes-textarea"
            style={{
              minHeight: '150px',
              fontFamily: 'inherit',
              fontSize: 'clamp(0.5rem, 2.5vw, 0.6rem)',
              lineHeight: '1.4',
            }}
            placeholder={
              !isActive
                ? 'Waiting to start...'
                : currentPlayer.hasEnded
                  ? "You've ended your prompts!"
                  : currentPlayer.promptsUsed >= 7
                    ? "You've used all your prompts!"
                    : 'Write your creative prompt here...'
            }
          />
        </div>
        <div
          className="mt-2 flex justify-between items-center flex-wrap gap-2"
          style={{ fontSize: 'clamp(0.4rem, 2vw, 0.6rem)' }}
        >
          <div>
            {currentPlayer.prompt.length} chars •{' '}
            {
              currentPlayer.prompt
                .trim()
                .split(/\s+/)
                .filter((w) => w).length
            }{' '}
            words
          </div>
          <div style={{ color: currentPlayer.promptsUsed >= 7 ? '#e76e55' : undefined }}>
            Remaining: {7 - currentPlayer.promptsUsed}
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={() => onSubmit(currentTurn)}
        disabled={
          !isActive ||
          !currentPlayer.prompt.trim() ||
          currentPlayer.isReady ||
          currentPlayer.promptsUsed >= 7 ||
          currentPlayer.hasEnded ||
          isProcessing
        }
        className={`nes-btn ${isPlayer1Turn ? 'is-primary' : 'is-success'}`}
        type="button"
        style={{
          width: '100%',
          marginBottom: '0.5rem',
          fontSize: 'clamp(0.6rem, 2.5vw, 0.8rem)',
          minHeight: '44px',
          opacity: isProcessing ? 0.5 : 1,
        }}
      >
        {isProcessing ? '⏳ Claude is working...' : currentPlayer.hasEnded ? '✗ Ended' : currentPlayer.isReady ? '✓ Submitted!' : '→ Submit Prompt'}
      </button>

      {/* End Prompts Early Button */}
      {isActive && !currentPlayer.hasEnded && currentPlayer.promptsUsed > 0 && (
        <button
          onClick={() => onEndPrompts(currentTurn)}
          disabled={isProcessing}
          className="nes-btn is-error"
          type="button"
          style={{
            width: '100%',
            marginBottom: '1rem',
            fontSize: 'clamp(0.5rem, 2vw, 0.7rem)',
            minHeight: '36px',
            opacity: isProcessing ? 0.5 : 1,
          }}
        >
          {isProcessing ? 'Claude is working...' : `End My Prompts Early (${currentPlayer.promptsUsed}/7 used)`}
        </button>
      )}

      {/* Tips */}
      {isActive && !currentPlayer.isReady && currentPlayer.promptsUsed < 7 && !currentPlayer.hasEnded && (
        <div
          className="nes-container is-rounded"
          style={{ fontSize: 'clamp(0.5rem, 2.5vw, 0.6rem)', padding: '0.8rem', lineHeight: '1.4' }}
        >
          <p>💡 Tip: Be creative! Longer prompts earn more points.</p>
        </div>
      )}
    </div>
  );
}
