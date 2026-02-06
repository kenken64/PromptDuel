export const MAX_PROMPT_CHARS = 280;
export const MAX_PROMPTS = 7;

export const MULTIPLIER_TABLE: Record<number, number> = {
  0: 0,
  1: 0.3,
  2: 0.5,
  3: 0.7,
  4: 0.85,
  5: 0.9,
  6: 0.95,
  7: 1.0,
};

export function getMultiplier(promptsUsed: number): number {
  return MULTIPLIER_TABLE[Math.min(promptsUsed, MAX_PROMPTS)] ?? 0;
}

export function getFinalScore(rawScore: number, promptsUsed: number): number {
  return Math.round(rawScore * getMultiplier(promptsUsed));
}
