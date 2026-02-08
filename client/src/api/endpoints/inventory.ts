import { get, post, patch, del, ApiError, isApiError } from '../client';
import type { InventoryItem } from '../../types';

/* ============================================
 * FridgeTrack — Inventory API Endpoints
 * ============================================
 * CRUD operations and expiration queries.
 * ============================================ */


// ---- Constants ----

const DEFAULT_EXPIRING_DAYS = 3;


// ---- Endpoints ----

/**
 * Fetch all inventory items for a user.
 *
 * @param userId - The user's ID
 * @returns Array of inventory items
 */
async function getAll(userId: string): Promise<InventoryItem[]> {
  try {
    const response = await get<{ success: boolean; data?: InventoryItem[] }>(
      `/api/inventory/${encodeURIComponent(userId)}`,
    );
    return response.data ?? [];
  } catch (error: unknown) {
    if (isApiError(error) && error.status === 404) {
      return [];
    }
    throw error;
  }
}

/**
 * Fetch items expiring within a given number of days.
 *
 * @param userId - The user's ID
 * @param days   - Lookahead window in days (default: 3)
 * @returns Items sorted by expiration date, soonest first
 */
async function getExpiring(
  userId: string,
  days: number = DEFAULT_EXPIRING_DAYS,
): Promise<InventoryItem[]> {
  try {
    const response = await get<{ success: boolean; data?: InventoryItem[] }>(
      `/api/expiring-items/${encodeURIComponent(userId)}`,
      { days },
    );
    return response.data ?? [];
  } catch (error: unknown) {
    if (isApiError(error) && error.status === 404) {
      return [];
    }
    throw error;
  }
}

/**
 * Manually add an item to inventory.
 *
 * @param item - Item data (without id, which the server generates)
 * @returns The created item with server-assigned id
 */
async function addItem(
  item: Omit<InventoryItem, 'id'>,
): Promise<InventoryItem> {
  try {
    const response = await post<{ success: boolean; data?: InventoryItem }>(
      '/api/inventory',
      item,
    );
    if (!response.data) {
      throw new ApiError(500, 'Server returned no data for created item.');
    }
    return response.data;
  } catch (error: unknown) {
    if (isApiError(error)) {
      if (error.status === 422) {
        throw new ApiError(422, 'Invalid item data. Please check your input.', error.data);
      }
    }
    throw error;
  }
}

/**
 * Update an existing inventory item.
 *
 * @param id      - The item's ID
 * @param updates - Partial fields to update
 * @returns The updated item
 */
async function updateItem(
  id: string,
  updates: Partial<InventoryItem>,
): Promise<InventoryItem> {
  try {
    const response = await patch<{ success: boolean; data?: InventoryItem }>(
      `/api/inventory/${encodeURIComponent(id)}`,
      updates,
    );
    if (!response.data) {
      throw new ApiError(500, 'Server returned no data for updated item.');
    }
    return response.data;
  } catch (error: unknown) {
    if (isApiError(error)) {
      if (error.status === 404) {
        throw new ApiError(404, 'Item not found. It may have been deleted.', error.data);
      }
      if (error.status === 422) {
        throw new ApiError(422, 'Invalid update data. Please check your input.', error.data);
      }
    }
    throw error;
  }
}

/**
 * Delete an inventory item (consumed or wasted).
 *
 * @param id - The item's ID
 */
async function deleteItem(id: string): Promise<void> {
  try {
    await del(`/api/inventory/${encodeURIComponent(id)}`);
  } catch (error: unknown) {
    if (isApiError(error)) {
      if (error.status === 404) {
        throw new ApiError(404, 'Item not found. It may have already been removed.', error.data);
      }
    }
    throw error;
  }
}


// ---- Public API ----

export const inventoryApi = {
  getAll,
  getExpiring,
  addItem,
  updateItem,
  deleteItem,
} as const;
