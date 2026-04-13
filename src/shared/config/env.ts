export const env = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  /** База для абсолютных URL медиа (Django `/media/...`). В dev: `http://localhost:8000`. */
  MEDIA_BASE_URL: import.meta.env.VITE_MEDIA_BASE_URL || '',
  APP_NAME: import.meta.env.VITE_APP_NAME || 'NewLevelHub',
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
} as const;
