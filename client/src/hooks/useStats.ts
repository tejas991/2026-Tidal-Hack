import { useQuery } from '@tanstack/react-query';
import { statsApi } from '../api/endpoints/stats';
import type { UserStats } from '../types';

/* ============================================
 * FridgeTrack — Stats Hook
 * ============================================ */

const statsKeys = {
  user: (userId: string) => ['stats', userId] as const,
};

/**
 * Fetch user statistics and environmental impact.
 *
 * Refetches on window focus and goes stale after 5 minutes.
 */
export function useStats(userId: string) {
  return useQuery<UserStats, Error>({
    queryKey: statsKeys.user(userId),
    queryFn: () => statsApi.getStats(userId),
    enabled: userId.length > 0,
    staleTime: 5 * 60 * 1_000,
  });
}
