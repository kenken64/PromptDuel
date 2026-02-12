import { useState, useEffect } from 'react';
import { config } from '../config';

export interface Challenge {
  id: number;
  name: string;
  shortName: string;
  difficulty: string;
  description: string;
  longDescription: string;
  videoUrl: string;
  active: boolean;
}

// Module-level cache so we only fetch once across all components
let cachedChallenges: Challenge[] | null = null;
let fetchPromise: Promise<Challenge[]> | null = null;

async function fetchChallenges(): Promise<Challenge[]> {
  const response = await fetch(`${config.apiUrl}/challenges`);
  const data = await response.json();
  if (data.success) {
    return data.challenges;
  }
  throw new Error('Failed to fetch challenges');
}

export function useChallenges() {
  const [challenges, setChallenges] = useState<Challenge[]>(cachedChallenges || []);
  const [isLoading, setIsLoading] = useState(!cachedChallenges);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedChallenges) {
      setChallenges(cachedChallenges);
      setIsLoading(false);
      return;
    }

    if (!fetchPromise) {
      fetchPromise = fetchChallenges();
    }

    fetchPromise
      .then((data) => {
        cachedChallenges = data;
        setChallenges(data);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
        fetchPromise = null;
      });
  }, []);

  const getChallenge = (id: number): Challenge | undefined => {
    return challenges.find((c) => c.id === id);
  };

  return { challenges, isLoading, error, getChallenge };
}
