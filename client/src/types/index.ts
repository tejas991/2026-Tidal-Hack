/* ============================================
 * FridgeTrack — Type Definitions
 * ============================================ */

// ---- Enums & Unions ----

export type ExpirationUrgencyLevel = 'expired' | 'critical' | 'warning' | 'good' | 'fresh';

export type FoodCategory =
  | 'dairy'
  | 'produce'
  | 'meat'
  | 'seafood'
  | 'grains'
  | 'beverages'
  | 'condiments'
  | 'frozen'
  | 'snacks'
  | 'leftovers'
  | 'other';

export type SortOption =
  | 'expiration_asc'
  | 'expiration_desc'
  | 'name_asc'
  | 'name_desc'
  | 'added_newest'
  | 'added_oldest'
  | 'category';

export type FilterCategory = FoodCategory | 'all' | 'expiring_soon';

export type RecipeDifficulty = 'easy' | 'medium' | 'hard';


// ---- Data Models ----

export interface InventoryItem {
  readonly id: string;
  readonly user_id: string;
  item_name: string;
  expiration_date: string;
  readonly detected_at: string;
  confidence_score: number;
  image_url?: string;
  category?: FoodCategory;
  quantity?: number;
  manually_added?: boolean;
}

export interface BoundingBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface DetectedItem {
  item_name: string;
  confidence_score: number;
  bounding_box?: BoundingBox;
  expiration_date?: string;
  category?: FoodCategory;
}

export interface ScanResult {
  readonly id: string;
  readonly user_id: string;
  readonly scanned_at: string;
  readonly items: readonly DetectedItem[];
  readonly image_url: string;
  readonly processing_time_ms: number;
}

export interface RecipeIngredient {
  name: string;
  amount: number;
  unit?: string;
  in_inventory: boolean;
}

export interface Recipe {
  readonly id: string;
  name: string;
  description?: string;
  prep_time_minutes: number;
  ingredients: readonly RecipeIngredient[];
  instructions: readonly string[];
  uses_expiring_items: readonly string[];
  difficulty?: RecipeDifficulty;
  servings?: number;
}

export interface ShoppingListItem {
  readonly id: string;
  item_name: string;
  quantity?: number;
  unit?: string;
  readonly added_at: string;
  purchased: boolean;
  category?: FoodCategory;
}

export interface UserStats {
  readonly total_items_tracked: number;
  readonly items_saved: number;
  readonly items_wasted: number;
  readonly estimated_savings_usd: number;
  readonly pounds_saved: number;
  readonly co2_saved_kg: number;
  readonly scans_this_month: number;
}


// ---- UI State ----

export interface UploadState {
  isUploading: boolean;
  progress: number;
  error?: string;
}

export interface ExpirationUrgency {
  readonly level: ExpirationUrgencyLevel;
  readonly days_until_expiration: number;
  readonly color: string;
  readonly label: string;
}


// ---- API Types ----

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type ScanResponse = ApiResponse<ScanResult>;

export type RecipesResponse = ApiResponse<readonly Recipe[]>;

export type InventoryResponse = ApiResponse<readonly InventoryItem[]>;

export type StatsResponse = ApiResponse<UserStats>;

export type ShoppingListResponse = ApiResponse<readonly ShoppingListItem[]>;


// ---- Pagination ----

export interface PaginatedResponse<T> {
  success: boolean;
  data?: readonly T[];
  total: number;
  page: number;
  per_page: number;
  error?: string;
}


// ---- Request Payloads ----

export interface AddItemPayload {
  item_name: string;
  expiration_date: string;
  category?: FoodCategory;
  quantity?: number;
}

export interface UpdateItemPayload {
  item_name?: string;
  expiration_date?: string;
  category?: FoodCategory;
  quantity?: number;
}

export type ItemStatus = 'active' | 'consumed' | 'wasted';


// ---- Backend Response Shapes ----
// These match the actual FastAPI response models.

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  database: string;
  components: {
    food_detector: string;
    date_extractor: string;
    gemini: string;
  };
}

export interface BackendDetectionResult {
  item_name: string;
  confidence: number;
  bounding_box: number[];
  expiration_date: string | null;
}

export interface BackendScanResponse {
  scan_id: string;
  items_detected: BackendDetectionResult[];
  total_items: number;
  processing_time: number;
  message: string;
}

export interface BackendInventoryItem {
  _id: string;
  user_id: string;
  item_name: string;
  expiration_date?: string;
  detected_at: string;
  confidence_score: number;
  image_url?: string;
  quantity?: number;
  category?: string;
  status: string;
}

export interface BackendInventoryResponse {
  user_id: string;
  items: BackendInventoryItem[];
  total: number;
}

export interface BackendExpiringResponse {
  user_id: string;
  expiring_items: BackendInventoryItem[];
  total_expiring: number;
  urgency_breakdown: {
    today: number;
    tomorrow: number;
    this_week: number;
  };
}

export interface BackendRecipe {
  name: string;
  ingredients: string[];
  instructions: string[];
  prep_time: string;
  items_used: string[];
}

export interface BackendRecipeResponse {
  recipes: BackendRecipe[];
  expiring_items_used: string[];
  message: string;
}

export interface BackendItemStatusResponse {
  message: string;
  item_id: string;
}

export interface BackendStatsResponse {
  total_items_tracked: number;
  items_saved: number;
  items_wasted: number;
  money_saved: number;
  pounds_saved: number;
  co2_saved: number;
}
