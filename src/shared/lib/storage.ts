/**
 * Access JWT — только в памяти (не localStorage).
 * Refresh — httpOnly cookie с бэкенда; JS к нему не обращается.
 */
const LEGACY_ACCESS_KEY = 'nlh_access_token';
const LEGACY_REFRESH_KEY = 'nlh_refresh_token';

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
  },
  /** Сохраняет только access; refresh приходит в Set-Cookie с сервера. */
  setAccessFromAuthResponse: (access: string) => {
    accessToken = access;
  },
  clear: () => {
    accessToken = null;
    clearLegacyLocalStorage();
  },
};
