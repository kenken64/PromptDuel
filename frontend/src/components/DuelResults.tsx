type Player = 'player1' | 'player2';

interface PlayerState {
  name: string;
  prompt: string;
  score: number;
  isReady: boolean;
  promptsUsed: number;
}

interface DuelResultsProps {
  player1: PlayerState;
  player2: PlayerState;
  winner: Player | null;
  onPlayAgain: () => void;
}

export function DuelResults({ player1, player2, winner, onPlayAgain }: DuelResultsProps) {
  const winnerState = winner === 'player1' ? player1 : player2;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#212529',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div style={{ maxWidth: '800px', width: '100%' }}>
        {/* Winner Announcement */}
        <div className="text-center mb-6 sm:mb-8">
          <i className="nes-icon trophy is-large pixel-pulse"></i>
          <h1 style={{ fontSize: 'clamp(1.5rem, 6vw, 2rem)', margin: '1.5rem 0 1rem' }}>
            Victory!
          </h1>
          <div className="nes-badge is-splited" style={{ fontSize: 'clamp(0.8rem, 4vw, 1.2rem)' }}>
            <span className="is-warning">{winnerState.name}</span>
            <span className="is-success">Wins!</span>
          </div>
        </div>

        {/* Final Scores */}
        <div className="nes-container is-dark with-title mb-4 sm:mb-6">
          <p className="title" style={{ fontSize: 'clamp(0.7rem, 3vw, 1rem)' }}>
            Final Scores
          </p>

          <div className="space-y-4">
            <div
              className={`nes-container ${winner === 'player1' ? 'is-rounded' : 'is-dark'}`}
              style={{
                padding: '0.8rem',
                borderColor: winner === 'player1' ? '#f7d51d' : undefined,
                borderWidth: winner === 'player1' ? '4px' : undefined,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem sm:gap-1rem' }}>
                  {winner === 'player1' && (
                    <i className="nes-icon trophy is-small sm:is-medium"></i>
                  )}
                  <span style={{ fontSize: 'clamp(0.7rem, 3vw, 1rem)' }}>{player1.name}</span>
                </div>
                <span style={{ fontSize: 'clamp(1.5rem, 6vw, 2rem)', color: '#209cee' }}>
                  {player1.score}
                </span>
              </div>
            </div>

            <div
              className={`nes-container ${winner === 'player2' ? 'is-rounded' : 'is-dark'}`}
              style={{
                padding: '0.8rem',
                borderColor: winner === 'player2' ? '#f7d51d' : undefined,
                borderWidth: winner === 'player2' ? '4px' : undefined,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem sm:gap-1rem' }}>
                  {winner === 'player2' && (
                    <i className="nes-icon trophy is-small sm:is-medium"></i>
                  )}
                  <span style={{ fontSize: 'clamp(0.7rem, 3vw, 1rem)' }}>{player2.name}</span>
                </div>
                <span style={{ fontSize: 'clamp(1.5rem, 6vw, 2rem)', color: '#92cc41' }}>
                  {player2.score}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="nes-container is-dark text-center">
            <p
              style={{
                fontSize: 'clamp(0.5rem, 2.5vw, 0.6rem)',
                opacity: 0.7,
                marginBottom: '0.5rem',
              }}
            >
              Total Points
            </p>
            <p style={{ fontSize: 'clamp(1rem, 4vw, 1.5rem)' }}>{player1.score + player2.score}</p>
          </div>
          <div className="nes-container is-dark text-center">
            <p
              style={{
                fontSize: 'clamp(0.5rem, 2.5vw, 0.6rem)',
                opacity: 0.7,
                marginBottom: '0.5rem',
              }}
            >
              Rounds Played
            </p>
            <p style={{ fontSize: 'clamp(1rem, 4vw, 1.5rem)' }}>3</p>
          </div>
        </div>

        {/* Play Again Button */}
        <div className="text-center">
          <button
            onClick={onPlayAgain}
            className="nes-btn is-success"
            type="button"
            style={{
              fontSize: 'clamp(0.7rem, 3vw, 1rem)',
              padding: '0.8rem 1.5rem',
              minHeight: '44px',
            }}
          >
            ↻ Play Again
          </button>
        </div>
      </div>
    </div>
  );
}
