import { get } from '../client';
import type { HealthCheckResponse } from '../../types';

/* ============================================
 * FridgeTrack — Health Check API
 * ============================================
 * Ping the backend to verify connectivity.
 * ============================================ */

/**
 * Hit the detailed health check endpoint.
 *
 * Backend route: GET /health
 *
 * @returns Backend status including database and component health
 */
async function check(): Promise<HealthCheckResponse> {
  return get<HealthCheckResponse>('/health');
}

export const healthApi = {
  check,
} as const;
