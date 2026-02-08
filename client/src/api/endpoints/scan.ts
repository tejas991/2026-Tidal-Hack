import { upload, get, ApiError, isApiError } from '../client';
import type { BackendScanResponse, ScanResult } from '../../types';

/* ============================================
 * FridgeTrack — Scan API Endpoints
 * ============================================
 * Image upload, detection, and scan history.
 * ============================================ */


// ---- Constants ----

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);


// ---- Helpers ----

function validateImageFile(file: File): void {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new ApiError(
      422,
      `Invalid file format "${file.type}". Accepted: JPEG, PNG, WebP, HEIC.`,
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    throw new ApiError(
      413,
      `File is too large (${sizeMB} MB). Maximum size is 10 MB.`,
    );
  }
}


// ---- Endpoints ----

/**
 * Upload a fridge image for AI detection.
 *
 * @param file       - Image file (JPEG, PNG, WebP, or HEIC, max 10 MB)
 * @param userId     - User ID for inventory tracking (defaults to "demo_user")
 * @param onProgress - Optional callback receiving upload percentage (0–100)
 * @returns Scan result from backend with detected items
 */
async function uploadImage(
  file: File,
  userId: string = 'demo_user',
  onProgress?: (percent: number) => void,
): Promise<BackendScanResponse> {
  validateImageFile(file);

  const formData = new FormData();
  formData.append('image', file); // Backend expects field name "image" (File alias)
  formData.append('user_id', userId); // Backend Form field with default "demo_user"

  try {
    return await upload<BackendScanResponse>('/api/scan', formData, onProgress);
  } catch (error: unknown) {
    if (isApiError(error)) {
      if (error.status === 413) {
        throw new ApiError(413, 'File is too large. Please use a smaller image.', error.data);
      }
      if (error.status === 422) {
        throw new ApiError(422, 'Image could not be processed. Try a different photo.', error.data);
      }
      if (error.status === 500) {
        throw new ApiError(500, 'Detection failed. Please try again.', error.data);
      }
    }
    throw error;
  }
}

/**
 * Fetch scan history for a user.
 *
 * NOTE: This endpoint is not yet implemented on the backend.
 * Returns an empty array and logs a warning.
 *
 * @param userId - The user's ID
 * @returns Array of past scan results (currently always empty)
 */
async function getScanHistory(userId: string): Promise<ScanResult[]> {
  console.warn(
    '[scanApi.getScanHistory] Endpoint not yet implemented on backend: GET /api/scans/{userId}',
  );

  // Stub: return empty array until backend implements scan history
  void userId;
  return [];
}


// ---- Public API ----

export const scanApi = {
  uploadImage,
  getScanHistory,
} as const;
