import { get, put, ApiError, isApiError } from '../client';
import type {
  InventoryItem,
  ItemStatus,
  BackendInventoryResponse,
  BackendExpiringResponse,
  BackendInventoryItem,
  BackendItemStatusResponse,
} from '../../types';

/* ============================================
 * FridgeTrack — Inventory API Endpoints
 * ============================================
 * CRUD operations and expiration queries.
 * ============================================ */


// ---- Constants ----

const DEFAULT_EXPIRING_DAYS = 3;


// ---- Helpers ----

/** Map a backend inventory item (_id) to frontend shape (id). */
function mapItem(raw: BackendInventoryItem): InventoryItem {
  return {
    id: raw._id,
    user_id: raw.user_id,
    item_name: raw.item_name,
    expiration_date: raw.expiration_date ?? '',
    detected_at: raw.detected_at,
    confidence_score: raw.confidence_score,
    image_url: raw.image_url,
    quantity: raw.quantity,
    category: raw.category as InventoryItem['category'],
  };
}


// ---- Endpoints ----

/**
 * Fetch all inventory items for a user.
 *
 * Backend route: GET /api/inventory/{user_id}?status=active
 *
 * @param userId - The user's ID
 * @param status - Filter by status (default: "active")
 * @returns Array of inventory items
 */
async function getAll(
  userId: string,
  status: ItemStatus = 'active',
): Promise<InventoryItem[]> {
  try {
    const response = await get<BackendInventoryResponse>(
      `/api/inventory/${encodeURIComponent(userId)}`,
      { status },
    );
    return (response.items ?? []).map(mapItem);
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
 * Backend route: GET /api/expiring-items/{user_id}?days=3
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
    const response = await get<BackendExpiringResponse>(
      `/api/expiring-items/${encodeURIComponent(userId)}`,
      { days },
    );
    return (response.expiring_items ?? []).map(mapItem);
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
 * NOTE: This endpoint is not yet implemented on the backend.
 * Logs a warning and throws an error.
 *
 * @param item - Item data (without id)
 * @returns The created item
 */
async function addItem(
  item: Omit<InventoryItem, 'id'>,
): Promise<InventoryItem> {
  console.warn(
    '[inventoryApi.addItem] Endpoint not yet implemented on backend: POST /api/inventory',
  );
  void item;
  throw new ApiError(501, 'Adding items manually is not yet supported by the backend.');
}

/**
 * Update an item's status (active, consumed, wasted).
 *
 * Backend route: PUT /api/items/{item_id}/status
 * Expects form-encoded `status` field.
 *
 * @param itemId - The item's MongoDB ID
 * @param status - New status value
 * @returns Confirmation message
 */
async function updateItemStatus(
  itemId: string,
  status: ItemStatus,
): Promise<BackendItemStatusResponse> {
  try {
    const params = new URLSearchParams();
    params.append('status', status);

    const response = await put<BackendItemStatusResponse>(
      `/api/items/${encodeURIComponent(itemId)}/status`,
      params,
    );
    return response;
  } catch (error: unknown) {
    if (isApiError(error)) {
      if (error.status === 404) {
        throw new ApiError(404, 'Item not found. It may have been deleted.', error.data);
      }
      if (error.status === 400) {
        throw new ApiError(400, 'Invalid status. Use: active, consumed, or wasted.', error.data);
      }
    }
    throw error;
  }
}

/**
 * Delete an inventory item.
 *
 * NOTE: This endpoint is not yet implemented on the backend.
 * Use updateItemStatus(id, 'consumed') or updateItemStatus(id, 'wasted') instead.
 * Logs a warning and throws an error.
 *
 * @param id - The item's ID
 */
async function deleteItem(id: string): Promise<void> {
  console.warn(
    '[inventoryApi.deleteItem] Endpoint not yet implemented on backend: DELETE /api/inventory/{id}. ' +
    'Use updateItemStatus() to mark items as consumed or wasted instead.',
  );
  void id;
  throw new ApiError(501, 'Deleting items is not yet supported. Mark as consumed or wasted instead.');
}


// ---- Public API ----

export const inventoryApi = {
  getAll,
  getExpiring,
  addItem,
  updateItemStatus,
  deleteItem,
} as const;
