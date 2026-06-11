import { queryClient } from '@/shared/lib/queryClient';
import { getApiError } from '@/shared/lib/getApiError';
import { tokenStorage } from '@/shared/lib/storage';
import i18n from '@/shared/lib/i18n';

export const SESSION_IDLE_TIMEOUT_CODE = 'SESSION_IDLE_TIMEOUT';
export const SESSION_ABSOLUTE_TIMEOUT_CODE = 'SESSION_ABSOLUTE_TIMEOUT';

const SESSION_EXPIRED_KEY = 'nlh_session_expired';
const LAST_USER_ACTIVITY_KEY = 'nlh_last_user_activity';
const SESSION_CREATED_AT_KEY = 'nlh_session_created_at';
const LOGIN_NOTICE_KEY = 'nlh_login_notice_key';
const LOGIN_NOTICE_BROADCAST_KEY = 'nlh_login_notice_broadcast';
const SESSION_SYNC_CHANNEL = 'nlh-session-sync';
const SESSION_CREATED_AT_CLAIM = 'session_created_at';

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

export function isSessionAbsoluteTimeoutError(err: unknown): boolean {
  return getApiError(err).code === SESSION_ABSOLUTE_TIMEOUT_CODE;
}

export function isSessionTimeoutError(err: unknown): boolean {
  return isSessionIdleTimeoutError(err) || isSessionAbsoluteTimeoutError(err);
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getSessionCreatedAtFromToken(token: string | null): number | null {
  if (!token) return null;
  const payload = parseJwtPayload(token);
  const raw = payload?.[SESSION_CREATED_AT_CLAIM];
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw * 1000;
  }
  return null;
}

export function syncSessionCreatedAtFromToken(token: string | null): void {
  const createdAt = getSessionCreatedAtFromToken(token);
  if (createdAt === null) return;
  try {
    localStorage.setItem(SESSION_CREATED_AT_KEY, String(createdAt));
  } catch {
    /* ignore */
  }
  getBroadcastChannel()?.postMessage({ type: 'session_created_at', timestamp: createdAt });
}

export function getSessionCreatedAtMs(): number | null {
  try {
    const raw = localStorage.getItem(SESSION_CREATED_AT_KEY);
    if (raw) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function clearSessionCreatedAt(): void {
  try {
    localStorage.removeItem(SESSION_CREATED_AT_KEY);
  } catch {
    /* ignore */
  }
}

export function getAbsoluteTimeoutMs(absoluteMinutes: number): number {
  return absoluteMinutes * 60 * 1000;
}

export function isLocalAbsoluteSessionExpired(absoluteMinutes: number): boolean {
  const createdAt = getSessionCreatedAtMs();
  if (createdAt === null) return false;
  return Date.now() - createdAt >= getAbsoluteTimeoutMs(absoluteMinutes);
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
  clearSessionCreatedAt();
}

export function handleSessionExpired(options?: { noticeKey?: string }): void {
  if (sessionExpiredFlag) return;
  sessionExpiredFlag = true;

  try {
    localStorage.setItem(SESSION_EXPIRED_KEY, '1');
    const noticeKey = options?.noticeKey ?? 'session.expired';
    sessionStorage.setItem(LOGIN_NOTICE_KEY, noticeKey);
    localStorage.setItem(LOGIN_NOTICE_BROADCAST_KEY, noticeKey);
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
  try {
    const noticeKey = localStorage.getItem(LOGIN_NOTICE_BROADCAST_KEY);
    if (noticeKey) {
      sessionStorage.setItem(LOGIN_NOTICE_KEY, noticeKey);
      localStorage.removeItem(LOGIN_NOTICE_BROADCAST_KEY);
    }
  } catch {
    /* ignore */
  }
  tokenStorage.clear();
  queryClient.clear();
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

export function consumeLoginNoticeKey(): string | null {
  try {
    const key =
      sessionStorage.getItem(LOGIN_NOTICE_KEY) ??
      localStorage.getItem(LOGIN_NOTICE_BROADCAST_KEY);
    if (key) {
      sessionStorage.removeItem(LOGIN_NOTICE_KEY);
      localStorage.removeItem(LOGIN_NOTICE_BROADCAST_KEY);
    }
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
    if (event.key === SESSION_CREATED_AT_KEY && event.newValue) {
      /* Absolute session timers read via getSessionCreatedAtMs(). */
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
    if (data.type === 'session_created_at' && typeof data.timestamp === 'number') {
      try {
        localStorage.setItem(SESSION_CREATED_AT_KEY, String(data.timestamp));
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
