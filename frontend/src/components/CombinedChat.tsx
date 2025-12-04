interface Message {
  sender: string;
  text: string;
  timestamp: number;
  type: 'player1' | 'player2' | 'judge';
}

interface CombinedChatProps {
  messages: Message[];
}

export function CombinedChat({ messages }: CombinedChatProps) {
  return (
    <div className="nes-container is-dark with-title">
      <p className="title" style={{ fontSize: 'clamp(0.7rem, 3vw, 1rem)' }}>
        Chat & Commentary
      </p>

      <div className="space-y-2 sm:space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
        {messages.length === 0 ? (
          <div
            className="text-center py-8"
            style={{ opacity: 0.5, fontSize: 'clamp(0.5rem, 2.5vw, 0.7rem)' }}
          >
            <p>Waiting for the duel to begin...</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`nes-container is-rounded ${
                message.type === 'judge' ? '' : message.type === 'player1' ? 'is-dark' : 'is-dark'
              }`}
              style={{
                padding: '0.6rem',
                backgroundColor:
                  message.type === 'judge'
                    ? '#f7d51d'
                    : message.type === 'player1'
                      ? '#209cee'
                      : '#92cc41',
                color: message.type === 'judge' ? '#000' : '#fff',
                fontSize: 'clamp(0.5rem, 2.5vw, 0.6rem)',
                marginBottom: '0.5rem',
              }}
            >
              <div
                style={{
                  fontWeight: 'bold',
                  marginBottom: '0.3rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  flexWrap: 'wrap',
                }}
              >
                {message.type === 'judge' && <i className="nes-icon trophy is-small"></i>}
                {message.type === 'player1' && <i className="nes-icon coin is-small"></i>}
                {message.type === 'player2' && <i className="nes-icon coin is-small"></i>}
                <span>{message.sender}</span>
              </div>
              <p style={{ lineHeight: '1.3', wordBreak: 'break-word' }}>{message.text}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
