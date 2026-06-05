import { queryClient } from '@/shared/lib/queryClient';
import { getApiError } from '@/shared/lib/getApiError';
import { tokenStorage } from '@/shared/lib/storage';
import i18n from '@/shared/lib/i18n';

export const SESSION_IDLE_TIMEOUT_CODE = 'SESSION_IDLE_TIMEOUT';

const SESSION_EXPIRED_KEY = 'nlh_session_expired';
const LAST_USER_ACTIVITY_KEY = 'nlh_last_user_activity';
const LOGIN_NOTICE_KEY = 'nlh_login_notice_key';
const SESSION_SYNC_CHANNEL = 'nlh-session-sync';

/** Background polling must not count as user activity (e.g. notification badge). */
const BACKGROUND_ACTIVITY_PATHS = ['/notifications/unread-count/'];

export function isBackgroundActivityRequest(url: string): boolean {
  return BACKGROUND_ACTIVITY_PATHS.some((path) => url.includes(path));
}

let sessionExpiredFlag = false;
let broadcastChannel: BroadcastChannel | null = null;

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!broadcastChannel) {
    broadcastChannel = new BroadcastChannel(SESSION_SYNC_CHANNEL);
  }
  return broadcastChannel;
}

export function isSessionIdleTimeoutError(err: unknown): boolean {
  return getApiError(err).code === SESSION_IDLE_TIMEOUT_CODE;
}

export function isSessionExpired(): boolean {
  if (sessionExpiredFlag) return true;
  try {
    return localStorage.getItem(SESSION_EXPIRED_KEY) === '1';
  } catch {
    return false;
  }
}

export function getLastUserActivityTimestamp(): number {
  try {
    const raw = localStorage.getItem(LAST_USER_ACTIVITY_KEY);
    if (raw) return Number(raw);
  } catch {
    /* ignore */
  }
  return Date.now();
}

/** User-initiated activity: clicks, keys, scroll, navigation. */
export function markUserActivity(): void {
  const now = Date.now();
  try {
    localStorage.setItem(LAST_USER_ACTIVITY_KEY, String(now));
  } catch {
    /* ignore */
  }
  getBroadcastChannel()?.postMessage({ type: 'activity', timestamp: now });
}

/** @deprecated Use markUserActivity for idle tracking. Kept for login/bootstrap. */
export function markSessionActive(): void {
  markUserActivity();
}

export function clearSessionExpiredState(): void {
  sessionExpiredFlag = false;
  try {
    localStorage.removeItem(SESSION_EXPIRED_KEY);
  } catch {
    /* ignore */
  }
}

export function handleSessionExpired(options?: { noticeKey?: string }): void {
  if (sessionExpiredFlag) return;
  sessionExpiredFlag = true;

  try {
    localStorage.setItem(SESSION_EXPIRED_KEY, '1');
    sessionStorage.setItem(LOGIN_NOTICE_KEY, options?.noticeKey ?? 'session.expired');
  } catch {
    /* ignore */
  }

  getBroadcastChannel()?.postMessage({ type: 'expired' });

  tokenStorage.clear();
  queryClient.clear();

  window.location.href = '/login';
}

function applyRemoteExpired(): void {
  if (sessionExpiredFlag) return;
  sessionExpiredFlag = true;
  tokenStorage.clear();
  queryClient.clear();
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

export function consumeLoginNoticeKey(): string | null {
  try {
    const key = sessionStorage.getItem(LOGIN_NOTICE_KEY);
    if (key) sessionStorage.removeItem(LOGIN_NOTICE_KEY);
    return key;
  } catch {
    return null;
  }
}

export function initSessionSync(): () => void {
  const channel = getBroadcastChannel();

  function onStorage(event: StorageEvent) {
    if (event.key === SESSION_EXPIRED_KEY && event.newValue === '1') {
      applyRemoteExpired();
      return;
    }
    if (event.key === LAST_USER_ACTIVITY_KEY && event.newValue) {
      /* Activity from another tab updates local idle timers via getLastUserActivityTimestamp(). */
    }
  }

  function onMessage(event: MessageEvent) {
    const data = event.data as { type?: string; timestamp?: number } | null;
    if (!data?.type) return;
    if (data.type === 'expired') {
      applyRemoteExpired();
    }
    if (data.type === 'activity' && typeof data.timestamp === 'number') {
      try {
        const current = getLastUserActivityTimestamp();
        if (data.timestamp > current) {
          localStorage.setItem(LAST_USER_ACTIVITY_KEY, String(data.timestamp));
        }
      } catch {
        /* ignore */
      }
    }
  }

  window.addEventListener('storage', onStorage);
  channel?.addEventListener('message', onMessage);

  if (isSessionExpired() && !window.location.pathname.startsWith('/login')) {
    applyRemoteExpired();
  }

  return () => {
    window.removeEventListener('storage', onStorage);
    channel?.removeEventListener('message', onMessage);
  };
}

export function getIdleTimeoutMs(idleMinutes: number): number {
  return idleMinutes * 60 * 1000;
}

export function getSessionExpiredMessage(): string {
  return i18n.t('session.expired');
}
