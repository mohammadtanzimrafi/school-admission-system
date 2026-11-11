declare global {
  interface Window {
    __APP_CONFIG__?: { apiBaseUrl?: string }
  }
}

const DEFAULT_API_BASE_URL = 'http://localhost:8080'

/**
 * Where the backend lives. Checked in this order:
 *  1. /config.js, written from the VITE_API_BASE_URL environment variable when the
 *     Docker container starts (changeable without rebuilding the image);
 *  2. VITE_API_BASE_URL at build/dev time;
 *  3. http://localhost:8080.
 */
export function resolveApiBaseUrl(
  runtime: string | undefined = window.__APP_CONFIG__?.apiBaseUrl,
  buildTime: string | undefined = import.meta.env.VITE_API_BASE_URL,
): string {
  const chosen = [runtime, buildTime].find((value) => value && value.trim() !== '') ?? DEFAULT_API_BASE_URL
  return chosen.trim().replace(/\/+$/, '')
}

export const API_BASE_URL = resolveApiBaseUrl()

/** How often live data is re-fetched, in milliseconds. */
export const REFRESH_INTERVAL = {
  classes: 3_000,
  hold: 4_000,
  myHolds: 5_000,
} as const
