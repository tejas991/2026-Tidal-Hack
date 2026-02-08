import { useState } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { inventoryApi } from '../api/endpoints/inventory';
import { scanApi } from '../api/endpoints/scan';
import type { InventoryItem, ItemStatus, BackendScanResponse, BackendItemStatusResponse } from '../types';

/* ============================================
 * FridgeTrack — Inventory Hooks
 * ============================================
 * React Query hooks for inventory CRUD,
 * expiring-items polling, scan upload, and
 * item status updates with cache invalidation.
 * ============================================ */


// ---- Query Keys ----

const inventoryKeys = {
  all:     (userId: string) => ['inventory', userId] as const,
  expiring:(userId: string, days: number) => ['expiring', userId, days] as const,
};


// ---- Queries ----

/**
 * Fetch all inventory items for a user.
 *
 * Refetches on window focus (React Query default).
 */
export function useInventory(userId: string) {
  return useQuery<InventoryItem[], Error>({
    queryKey: inventoryKeys.all(userId),
    queryFn: () => inventoryApi.getAll(userId),
    enabled: userId.length > 0,
    staleTime: 5 * 60 * 1_000,
  });
}

/**
 * Fetch items expiring within `days`.
 *
 * Auto-refetches every 5 minutes so the dashboard
 * stays current without a manual refresh.
 */
export function useExpiringItems(userId: string, days: number = 3) {
  return useQuery<InventoryItem[], Error>({
    queryKey: inventoryKeys.expiring(userId, days),
    queryFn: () => inventoryApi.getExpiring(userId, days),
    enabled: userId.length > 0,
    refetchInterval: 5 * 60 * 1_000,
  });
}


// ---- Mutations ----

/**
 * Add a new item to inventory.
 *
 * NOTE: Backend endpoint not yet implemented.
 * This mutation will fail with a 501 error until the backend adds POST /api/inventory.
 */
export function useAddItem(userId: string) {
  const queryClient = useQueryClient();

  return useMutation<InventoryItem, Error, Omit<InventoryItem, 'id'>>({
    mutationFn: (item) => inventoryApi.addItem(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all(userId) });
    },
  });
}

/**
 * Update an inventory item's status (active → consumed / wasted).
 *
 * Backend route: PUT /api/items/{item_id}/status
 * Invalidates inventory caches on success.
 */
export function useUpdateItemStatus(userId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    BackendItemStatusResponse,
    Error,
    { itemId: string; status: ItemStatus }
  >({
    mutationFn: ({ itemId, status }) => inventoryApi.updateItemStatus(itemId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all(userId) });
      queryClient.invalidateQueries({ queryKey: ['expiring', userId] });
    },
  });
}

/**
 * Remove an inventory item permanently.
 *
 * Optimistically removes the item from the cache and
 * rolls back on error.
 */
export function useRemoveItem(userId: string) {
  const queryClient = useQueryClient();

  return useMutation<{ item_id: string; deleted: boolean }, Error, string>({
    mutationFn: (itemId) => inventoryApi.removeItem(itemId),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: inventoryKeys.all(userId) });
      await queryClient.cancelQueries({ queryKey: ['expiring', userId] });

      const previousAll = queryClient.getQueryData<InventoryItem[]>(inventoryKeys.all(userId));
      queryClient.setQueryData<InventoryItem[]>(inventoryKeys.all(userId), (old) =>
        old?.filter((item) => item.id !== itemId),
      );

      // Also optimistically remove from all expiring caches
      queryClient.setQueriesData<InventoryItem[]>({ queryKey: ['expiring', userId] }, (old) =>
        old?.filter((item) => item.id !== itemId),
      );

      return { previousAll };
    },
    onError: (_err, _itemId, context: any) => {
      if (context?.previousAll) {
        queryClient.setQueryData(inventoryKeys.all(userId), context.previousAll);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all(userId) });
      queryClient.invalidateQueries({ queryKey: ['expiring', userId] });
    },
  });
}

/**
 * Upload a fridge image for AI scanning.
 *
 * Tracks upload progress (0–100) via `progress` in the return value.
 * Invalidates the inventory cache on success so newly-detected
 * items appear immediately.
 */
export function useScanImage(userId: string) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);

  const mutation = useMutation<BackendScanResponse, Error, File>({
    mutationFn: (file) => scanApi.uploadImage(file, userId, setProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all(userId) });
    },
    onSettled: () => {
      setProgress(0);
    },
  });

  return { ...mutation, progress };
}
