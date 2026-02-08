import { get, ApiError, isApiError } from '../client';
import type { Recipe, BackendRecipeResponse, BackendRecipe } from '../../types';

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


// ---- Helpers ----

/** Map backend Recipe shape to frontend Recipe type */
function mapRecipe(raw: BackendRecipe, index: number): Recipe {
  return {
    id: `generated-${index}`,
    name: raw.name,
    prep_time_minutes: parseInt(raw.prep_time, 10) || 0,
    ingredients: raw.ingredients.map((name) => ({
      name,
      amount: 1,
      in_inventory: true,
    })),
    instructions: raw.instructions,
    uses_expiring_items: raw.items_used,
  };
}


// ---- Endpoints ----

/**
 * Generate recipe suggestions from a user's expiring inventory items.
 *
 * Backend route: GET /api/recipes/{user_id}?days=3
 *
 * Uses the Gemini API on the backend — subject to rate limits.
 * Automatically retries with exponential backoff on 429/503.
 *
 * @param userId - The user's ID
 * @param days   - Lookahead window for expiring items (default: 3)
 * @returns Array of recipe suggestions using expiring items
 */
async function generate(userId: string, days: number = 3): Promise<Recipe[]> {
  try {
    return await withRetry(async () => {
      const response = await get<BackendRecipeResponse>(
        `/api/recipes/${encodeURIComponent(userId)}`,
        { days },
      );
      return (response.recipes ?? []).map(mapRecipe);
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
 * NOTE: This endpoint is not yet implemented on the backend.
 * Returns an empty array and logs a warning.
 *
 * @param ingredients - Array of ingredient names to search with
 * @returns Array of matching recipes (currently always empty)
 */
async function getByIngredients(ingredients: string[]): Promise<Recipe[]> {
  console.warn(
    '[recipesApi.getByIngredients] Endpoint not yet implemented on backend: POST /api/recipes/search',
  );
  void ingredients;
  return [];
}


// ---- Public API ----

export const recipesApi = {
  generate,
  getByIngredients,
} as const;
