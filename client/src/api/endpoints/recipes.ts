import { post, ApiError, isApiError } from '../client';
import type { Recipe } from '../../types';

/* ============================================
 * FridgeTrack — Recipes API Endpoints
 * ============================================
 * AI-powered recipe generation via Gemini.
 * Rate-limited — uses exponential backoff.
 * ============================================ */


// ---- Constants ----

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1_000;


// ---- Retry Helper ----

/**
 * Exponential backoff with jitter for Gemini API rate limits.
 *
 * Retries on 429 (rate limit) and 503 (service unavailable) only.
 * Other errors are thrown immediately.
 */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      const isRetryable =
        isApiError(error) && (error.status === 429 || error.status === 503);

      if (!isRetryable || attempt === MAX_RETRIES) {
        throw error;
      }

      const delay = BASE_DELAY_MS * 2 ** attempt + Math.random() * 500;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}


// ---- Endpoints ----

/**
 * Generate recipe suggestions from a user's expiring inventory items.
 *
 * Uses the Gemini API on the backend — subject to rate limits.
 * Automatically retries with exponential backoff on 429/503.
 *
 * @param userId - The user's ID
 * @returns Array of recipe suggestions using expiring items
 */
async function generate(userId: string): Promise<Recipe[]> {
  try {
    return await withRetry(async () => {
      const response = await post<{ success: boolean; data?: Recipe[] }>(
        '/api/get-recipes',
        { user_id: userId },
      );
      return response.data ?? [];
    });
  } catch (error: unknown) {
    if (isApiError(error)) {
      if (error.status === 429) {
        throw new ApiError(
          429,
          'Recipe generation is rate-limited. Please wait a moment and try again.',
          error.data,
        );
      }
      if (error.status === 404) {
        return [];
      }
    }
    throw error;
  }
}

/**
 * Search for recipes matching specific ingredients.
 *
 * Uses the Gemini API on the backend — subject to rate limits.
 * Automatically retries with exponential backoff on 429/503.
 *
 * @param ingredients - Array of ingredient names to search with
 * @returns Array of matching recipes
 */
async function getByIngredients(ingredients: string[]): Promise<Recipe[]> {
  if (ingredients.length === 0) {
    return [];
  }

  try {
    return await withRetry(async () => {
      const response = await post<{ success: boolean; data?: Recipe[] }>(
        '/api/recipes/search',
        { ingredients },
      );
      return response.data ?? [];
    });
  } catch (error: unknown) {
    if (isApiError(error)) {
      if (error.status === 429) {
        throw new ApiError(
          429,
          'Recipe search is rate-limited. Please wait a moment and try again.',
          error.data,
        );
      }
      if (error.status === 422) {
        throw new ApiError(
          422,
          'Invalid ingredients. Please check your input.',
          error.data,
        );
      }
    }
    throw error;
  }
}


// ---- Public API ----

export const recipesApi = {
  generate,
  getByIngredients,
} as const;
