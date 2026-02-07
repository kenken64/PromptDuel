import { MAX_PROMPT_CHARS, getMultiplier, MULTIPLIER_TABLE, MAX_PROMPTS } from '../gameRules';

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
  readOnly?: boolean;
  currentUserPlayer?: Player | null; // Which player the current user is
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
  readOnly = false,
  currentUserPlayer = null,
}: UnifiedPromptAreaProps) {
  const isProcessing = player1Processing || player2Processing;
  const currentPlayer = currentTurn === 'player1' ? player1 : player2;

  // The player data for the current user (for showing their own stats)
  const myPlayer = currentUserPlayer === 'player1' ? player1 : currentUserPlayer === 'player2' ? player2 : null;

  // Can only edit if it's your turn (currentUserPlayer matches currentTurn)
  const canEdit = !readOnly && currentUserPlayer === currentTurn;

  // Debug logging
  console.log('[UnifiedPromptArea] Debug:', {
    currentUserPlayer,
    currentTurn,
    canEdit,
    isActive,
    readOnly,
    isProcessing,
    'currentPlayer.hasEnded': currentPlayer.hasEnded,
    'currentPlayer.promptsUsed': currentPlayer.promptsUsed,
  });
  const isPlayer1Turn = currentTurn === 'player1';
  const charsLeft = MAX_PROMPT_CHARS - currentPlayer.prompt.length;
  const isOverLimit = charsLeft < 0;

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
            disabled={!canEdit || !isActive || currentPlayer.isReady || currentPlayer.promptsUsed >= MAX_PROMPTS || currentPlayer.hasEnded}
            maxLength={MAX_PROMPT_CHARS + 50}
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
                : !canEdit && currentUserPlayer
                  ? `Waiting for ${currentPlayer.name}'s turn...`
                  : currentPlayer.hasEnded
                    ? "You've ended your prompts!"
                    : currentPlayer.promptsUsed >= MAX_PROMPTS
                      ? "You've used all your prompts!"
                      : `Write your prompt here... (max ${MAX_PROMPT_CHARS} chars)`
            }
          />
        </div>
        <div
          className="mt-2 flex justify-between items-center flex-wrap gap-2"
          style={{ fontSize: 'clamp(0.4rem, 2vw, 0.6rem)' }}
        >
          <div style={{ color: isOverLimit ? '#e76e55' : charsLeft <= 40 ? '#f7d51d' : undefined }}>
            {currentPlayer.prompt.length}/{MAX_PROMPT_CHARS} chars
            {isOverLimit && (
              <span style={{ color: '#e76e55', marginLeft: '0.5rem' }}>
                ({Math.abs(charsLeft)} over limit!)
              </span>
            )}
          </div>
          <div style={{ color: (myPlayer?.promptsUsed ?? 0) >= MAX_PROMPTS ? '#e76e55' : undefined }}>
            Your Remaining: {MAX_PROMPTS - (myPlayer?.promptsUsed ?? 0)}
          </div>
        </div>

        {/* Character limit bar */}
        <div
          style={{
            marginTop: '0.4rem',
            height: '4px',
            backgroundColor: '#333',
            width: '100%',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min((currentPlayer.prompt.length / MAX_PROMPT_CHARS) * 100, 100)}%`,
              backgroundColor: isOverLimit ? '#e76e55' : charsLeft <= 40 ? '#f7d51d' : '#92cc41',
              transition: 'width 0.1s, background-color 0.2s',
            }}
          />
        </div>
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
        className={`nes-btn ${isPlayer1Turn ? 'is-primary' : 'is-success'}`}
        type="button"
        style={{
          width: '100%',
          marginBottom: '0.5rem',
          fontSize: 'clamp(0.6rem, 2.5vw, 0.8rem)',
          minHeight: '44px',
          opacity: isProcessing || !canEdit ? 0.5 : 1,
        }}
      >
        {isProcessing ? '⏳ Claude is working...' : !canEdit && currentUserPlayer ? `⏳ ${currentPlayer.name}'s Turn` : currentPlayer.hasEnded ? '✗ Ended' : currentPlayer.isReady ? '✓ Submitted!' : '→ Submit Prompt'}
      </button>

      {/* End Prompts Early Button - only show when it's your turn */}
      {canEdit && isActive && myPlayer && !myPlayer.hasEnded && myPlayer.promptsUsed > 0 && (
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
          {isProcessing ? 'Claude is working...' : `End My Prompts Early (${myPlayer.promptsUsed}/7 used)`}
        </button>
      )}

      {/* Multiplier Info - show YOUR stats, not the current turn player's */}
      {isActive && myPlayer && !myPlayer.hasEnded && myPlayer.promptsUsed < MAX_PROMPTS && (
        <div
          className="nes-container is-dark"
          style={{
            fontSize: 'clamp(0.4rem, 2vw, 0.55rem)',
            padding: '0.8rem',
            lineHeight: '1.6',
            borderColor: '#f7d51d',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <span style={{ color: '#f7d51d' }}>Your multiplier: </span>
              <span style={{
                color: getMultiplier(myPlayer.promptsUsed) >= 0.85 ? '#92cc41' : getMultiplier(myPlayer.promptsUsed) >= 0.5 ? '#f7d51d' : '#e76e55',
                fontWeight: 'bold',
              }}>
                {myPlayer.promptsUsed > 0 ? `×${getMultiplier(myPlayer.promptsUsed)}` : '---'}
              </span>
              {myPlayer.promptsUsed > 0 && myPlayer.promptsUsed < MAX_PROMPTS && (
                <span style={{ color: '#888', marginLeft: '0.8rem' }}>
                  Next prompt: ×{getMultiplier(myPlayer.promptsUsed + 1)}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.2rem' }}>
              {Object.entries(MULTIPLIER_TABLE).slice(1).map(([n]) => (
                <div
                  key={n}
                  style={{
                    width: 'clamp(1rem, 3vw, 1.5rem)',
                    height: 'clamp(1rem, 3vw, 1.5rem)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'clamp(0.3rem, 1.2vw, 0.4rem)',
                    border: `2px solid ${Number(n) <= myPlayer.promptsUsed ? '#92cc41' : '#444'}`,
                    color: Number(n) <= myPlayer.promptsUsed ? '#92cc41' : '#666',
                    backgroundColor: Number(n) === myPlayer.promptsUsed + 1 ? '#333' : 'transparent',
                  }}
                >
                  {n}
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: '0.4rem', color: '#888' }}>
            Final Score = Code Quality × Multiplier — use more prompts for a higher multiplier!
          </div>
        </div>
      )}
    </div>
  );
}
