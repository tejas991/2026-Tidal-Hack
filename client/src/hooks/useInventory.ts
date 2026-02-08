import { useState } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { inventoryApi } from '../api/endpoints/inventory';
import { scanApi } from '../api/endpoints/scan';
import type { InventoryItem, ScanResponse } from '../types';

/* ============================================
 * FridgeTrack — Inventory Hooks
 * ============================================
 * React Query hooks for inventory CRUD,
 * expiring-items polling, scan upload, and
 * item deletion with cache invalidation.
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
 * Invalidates the inventory cache on success.
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
 * Update an existing inventory item.
 *
 * Invalidates the inventory cache on success.
 */
export function useUpdateItem(userId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    InventoryItem,
    Error,
    { id: string; updates: Partial<InventoryItem> }
  >({
    mutationFn: ({ id, updates }) => inventoryApi.updateItem(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all(userId) });
    },
  });
}

/**
 * Delete an inventory item.
 *
 * Invalidates the inventory and expiring-items caches on success.
 */
export function useDeleteItem(userId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => inventoryApi.deleteItem(id),
    onSuccess: () => {
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

  const mutation = useMutation<ScanResponse, Error, File>({
    mutationFn: (file) => scanApi.uploadImage(file, setProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all(userId) });
    },
    onSettled: () => {
      setProgress(0);
    },
  });

  return { ...mutation, progress };
}
