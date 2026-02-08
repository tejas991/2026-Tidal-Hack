import { get } from '../client';
import type { UserStats, BackendStatsResponse } from '../../types';

/* ============================================
 * FridgeTrack — Stats API Endpoint
 * ============================================ */


// ---- Helpers ----

/** Map backend stats fields to frontend UserStats shape. */
function mapStats(raw: BackendStatsResponse): UserStats {
  return {
    total_items_tracked: raw.total_items_tracked,
    items_saved: raw.items_saved,
    items_wasted: raw.items_wasted,
    estimated_savings_usd: raw.money_saved,
    pounds_saved: raw.pounds_saved,
    co2_saved_kg: raw.co2_saved,
    scans_this_month: 0, // not yet tracked by backend
  };
}


// ---- Endpoints ----

/**
 * Fetch user statistics and environmental impact.
 *
 * Backend route: GET /api/stats/{user_id}
 */
async function getStats(userId: string): Promise<UserStats> {
  const response = await get<BackendStatsResponse>(
    `/api/stats/${encodeURIComponent(userId)}`,
  );
  return mapStats(response);
}


// ---- Public API ----

export const statsApi = {
  getStats,
} as const;
