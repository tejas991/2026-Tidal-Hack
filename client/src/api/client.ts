import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from 'axios';
import { env } from '../config/env';

/* ============================================
 * FridgeTrack — API Client
 * ============================================
 * Centralized axios instance with interceptors,
 * typed error handling, and auth support.
 * ============================================ */


// ---- API Error ----

export class ApiError extends Error {
  readonly status: number;
  readonly data?: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}


// ---- Status → Message Map ----

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your input.',
  401: 'Session expired. Please sign in again.',
  403: 'You don\u2019t have permission to do that.',
  404: 'The requested resource was not found.',
  408: 'Request timed out. Try again.',
  409: 'Conflict — this resource was modified elsewhere.',
  413: 'File is too large. Please use a smaller image.',
  422: 'Invalid data. Please check your input.',
  429: 'Too many requests. Slow down and try again.',
  500: 'Something went wrong on our end.',
  502: 'Server is temporarily unavailable.',
  503: 'Service is under maintenance. Try again shortly.',
};

function getErrorMessage(status: number, fallback?: string): string {
  return STATUS_MESSAGES[status] ?? fallback ?? 'An unexpected error occurred.';
}


// ---- Auth Token ----

const AUTH_TOKEN_KEY = 'fridgetrack-auth-token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}


// ---- Create Instance ----

const apiClient: AxiosInstance = axios.create({
  // In development, use empty baseURL so requests go through the Vite dev proxy.
  // In production, use the full backend URL from environment config.
  baseURL: env.IS_DEV ? '' : env.API_URL,
  timeout: 300_000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});


// ---- Request Interceptor ----

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAuthToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);


// ---- Response Interceptor ----

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,

  (error: AxiosError<{ error?: string; message?: string }>) => {
    // Network failure (no response at all)
    if (!error.response) {
      const message = error.code === 'ECONNABORTED'
        ? 'Request timed out. Try again.'
        : 'Connection failed. Check your internet.';

      console.error('[API]', message, error.message);
      return Promise.reject(new ApiError(0, message));
    }

    const { status, data } = error.response;

    // Auto-clear token on 401
    if (status === 401) {
      clearAuthToken();
    }

    const serverMessage = data?.error ?? data?.message;
    const message = getErrorMessage(status, serverMessage);

    console.error('[API]', status, message, data);
    return Promise.reject(new ApiError(status, message, data));
  },
);


// ---- Typed Request Helpers ----

export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const response = await apiClient.get<T>(url, { params });
  return response.data;
}

export async function post<T>(url: string, body?: unknown): Promise<T> {
  const response = await apiClient.post<T>(url, body);
  return response.data;
}

export async function put<T>(url: string, body?: unknown): Promise<T> {
  const response = await apiClient.put<T>(url, body);
  return response.data;
}

export async function patch<T>(url: string, body?: unknown): Promise<T> {
  const response = await apiClient.patch<T>(url, body);
  return response.data;
}

export async function del<T = void>(url: string): Promise<T> {
  const response = await apiClient.delete<T>(url);
  return response.data;
}

/**
 * Upload a file via multipart/form-data.
 * Uses native fetch() instead of axios so the browser correctly sets
 * the Content-Type header with the multipart boundary.
 */
export async function upload<T>(
  url: string,
  formData: FormData,
  _onProgress?: (percent: number) => void,
): Promise<T> {
  const baseUrl = env.IS_DEV ? '' : env.API_URL;

  const response = await fetch(`${baseUrl}${url}`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
    // Do NOT set Content-Type — the browser auto-adds multipart boundary
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const detail = data?.detail ?? data?.message ?? response.statusText;
    throw new ApiError(response.status, detail, data);
  }

  return response.json() as Promise<T>;
}


// ---- Utilities ----

/** Type guard: check if an error is an ApiError */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export default apiClient;
