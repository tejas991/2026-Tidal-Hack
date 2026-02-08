/* ============================================
 * FridgeTrack — Environment Configuration
 * ============================================
 * Typed, validated access to Vite env vars.
 * Throws at startup if required vars are missing.
 * ============================================ */

interface Env {
  /** Backend API base URL (no trailing slash) */
  API_URL: string;
  /** Current environment */
  ENV: 'development' | 'production';
  /** Convenience flag */
  IS_DEV: boolean;
  IS_PROD: boolean;
}

function getEnvVar(key: string): string | undefined {
  return (import.meta as unknown as { env?: Record<string, string> }).env?.[key];
}

function requireEnvVar(key: string): string {
  const value = getEnvVar(key);
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Create a .env.local file in the client/ directory.\n` +
      `See .env.example for reference.`,
    );
  }
  return value;
}

const envValue = getEnvVar('VITE_ENV') ?? 'development';

if (envValue !== 'development' && envValue !== 'production') {
  throw new Error(
    `Invalid VITE_ENV value: "${envValue}". Expected "development" or "production".`,
  );
}

export const env: Env = {
  API_URL: requireEnvVar('VITE_API_URL').replace(/\/+$/, ''),
  ENV: envValue,
  IS_DEV: envValue === 'development',
  IS_PROD: envValue === 'production',
};
