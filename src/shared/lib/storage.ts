/**
 * Access JWT — только в памяти (не localStorage).
 * Refresh — httpOnly cookie с бэкенда; JS к нему не обращается.
 */
import { syncSessionCreatedAtFromToken } from '@/shared/lib/sessionManager';
const LEGACY_ACCESS_KEY = 'nlh_access_token';
const LEGACY_REFRESH_KEY = 'nlh_refresh_token';
const IMPERSONATION_TOKEN_KEY = 'nlh_impersonation_access';

let accessToken: string | null = null;

function clearLegacyLocalStorage() {
  try {
    localStorage.removeItem(LEGACY_ACCESS_KEY);
    localStorage.removeItem(LEGACY_REFRESH_KEY);
  } catch {
    /* ignore */
  }
}

clearLegacyLocalStorage();

export const tokenStorage = {
  getAccessToken: () => accessToken,
  setAccessToken: (token: string) => {
    accessToken = token;
    syncSessionCreatedAtFromToken(token);
  },
  /** Сохраняет только access; refresh приходит в Set-Cookie с сервера. */
  setAccessFromAuthResponse: (access: string) => {
    accessToken = access;
    syncSessionCreatedAtFromToken(access);
  },
  clear: () => {
    accessToken = null;
    clearLegacyLocalStorage();
  },
  /**
   * Передаёт impersonation-токен через hard-reload: hard window.location нужен,
   * чтобы обойти race-condition с RequireRole guard'ами на странице, где
   * суперадмин нажал «Войти от имени».
   */
  stashImpersonationAccess: (token: string) => {
    try {
      sessionStorage.setItem(IMPERSONATION_TOKEN_KEY, token);
    } catch {
      /* ignore */
    }
  },
  consumeImpersonationAccess: (): string | null => {
    try {
      const token = sessionStorage.getItem(IMPERSONATION_TOKEN_KEY);
      sessionStorage.removeItem(IMPERSONATION_TOKEN_KEY);
      return token;
    } catch {
      return null;
    }
  },
};
