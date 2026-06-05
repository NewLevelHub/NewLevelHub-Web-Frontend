function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const env = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  /** База для абсолютных URL медиа (Django `/media/...`). В dev: `http://localhost:8000`. */
  MEDIA_BASE_URL: import.meta.env.VITE_MEDIA_BASE_URL || '',
  APP_NAME: import.meta.env.VITE_APP_NAME || 'NewLevelHub',
  /** Idle session timeout in minutes — must match backend IDLE_SESSION_TIMEOUT_MINUTES. */
  IDLE_SESSION_TIMEOUT_MINUTES: parsePositiveInt(
    import.meta.env.VITE_IDLE_SESSION_TIMEOUT_MINUTES,
    5,
  ),
  /** Show warning modal this many minutes before idle timeout. */
  IDLE_SESSION_WARNING_MINUTES: parsePositiveInt(
    import.meta.env.VITE_IDLE_SESSION_WARNING_MINUTES,
    1,
  ),
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
} as const;
