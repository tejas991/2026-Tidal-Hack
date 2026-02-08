import { useQuery } from '@tanstack/react-query';
import { healthApi } from '../api/endpoints/health';
import type { HealthCheckResponse } from '../types';

/* ============================================
 * FridgeTrack — Health Check Hook
 * ============================================
 * On-demand query to verify backend connectivity.
 * Disabled by default — trigger via refetch().
 * ============================================ */

export function useHealthCheck() {
  return useQuery<HealthCheckResponse, Error>({
    queryKey: ['health'],
    queryFn: () => healthApi.check(),
    enabled: false, // only fires when refetch() is called
    retry: false,
    staleTime: 0,
  });
}
