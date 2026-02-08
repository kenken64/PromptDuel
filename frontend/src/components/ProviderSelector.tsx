import React from 'react';

// Provider configuration matching ai-code-server
export const PROVIDER_CONFIG = {
  anthropic: {
    name: 'Anthropic',
    icon: '🤖',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', default: true },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
    ],
  },
  openai: {
    name: 'OpenAI',
    icon: '🧠',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', default: true },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    ],
  },
  google: {
    name: 'Google',
    icon: '✨',
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', default: true },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    ],
  },
};

export type ProviderKey = keyof typeof PROVIDER_CONFIG;

interface ProviderSelectorProps {
  provider: ProviderKey;
  model: string;
  onProviderChange: (provider: ProviderKey) => void;
  onModelChange: (model: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function ProviderSelector({
  provider,
  model,
  onProviderChange,
  onModelChange,
  disabled = false,
  compact = false,
}: ProviderSelectorProps) {
  const providerConfig = PROVIDER_CONFIG[provider];
  const providers = Object.entries(PROVIDER_CONFIG) as [ProviderKey, typeof PROVIDER_CONFIG[ProviderKey]][];

  const handleProviderChange = (newProvider: ProviderKey) => {
    // Only call onProviderChange - the parent (WaitingRoom) handles setting the default model
    // and calling updateProvider with both provider AND model together
    // DO NOT call onModelChange here as it would use stale provider state
    onProviderChange(newProvider);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2" style={{ fontSize: '0.65rem' }}>
        <span style={{ color: '#888' }}>AI:</span>
        <select
          value={provider}
          onChange={(e) => handleProviderChange(e.target.value as ProviderKey)}
          disabled={disabled}
          className="nes-select is-dark"
          style={{
            fontSize: '0.65rem',
            padding: '2px 4px',
            minWidth: '100px',
            height: '24px',
          }}
        >
          {providers.map(([key, config]) => (
            <option key={key} value={key}>
              {config.icon} {config.name}
            </option>
          ))}
        </select>
        <select
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={disabled}
          className="nes-select is-dark"
          style={{
            fontSize: '0.65rem',
            padding: '2px 4px',
            minWidth: '120px',
            height: '24px',
          }}
        >
          {providerConfig.models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="provider-selector" style={{ marginTop: '12px' }}>
      <div style={{ marginBottom: '8px' }}>
        <label style={{ fontSize: '0.7rem', color: '#888', display: 'block', marginBottom: '4px' }}>
          AI Provider
        </label>
        <div className="flex gap-2">
          {providers.map(([key, config]) => (
            <button
              key={key}
              onClick={() => handleProviderChange(key)}
              disabled={disabled}
              className={`nes-btn ${provider === key ? 'is-primary' : ''}`}
              style={{
                fontSize: '0.6rem',
                padding: '4px 8px',
                opacity: disabled ? 0.5 : 1,
              }}
            >
              {config.icon} {config.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ fontSize: '0.7rem', color: '#888', display: 'block', marginBottom: '4px' }}>
          Model
        </label>
        <select
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={disabled}
          className="nes-select is-dark"
          style={{
            fontSize: '0.7rem',
            width: '100%',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          {providerConfig.models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} {m.default ? '(Default)' : ''}
            </option>
          ))}
        </select>
      </div>

      {disabled && (
        <p style={{ fontSize: '0.6rem', color: '#666', marginTop: '8px', fontStyle: 'italic' }}>
          Provider locked after clicking Ready
        </p>
      )}
    </div>
  );
}

// Helper function to get default model for a provider
export function getDefaultModel(provider: ProviderKey): string {
  const config = PROVIDER_CONFIG[provider];
  const defaultModel = config.models.find(m => m.default);
  return defaultModel ? defaultModel.id : config.models[0].id;
}

// Helper to get display name for provider+model combo
export function getProviderDisplayName(provider: ProviderKey, model: string): string {
  const config = PROVIDER_CONFIG[provider];
  const modelInfo = config.models.find(m => m.id === model);
  return `${config.icon} ${config.name} - ${modelInfo?.name || model}`;
}
