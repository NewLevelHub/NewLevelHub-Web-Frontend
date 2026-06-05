import axios from 'axios';
import { create } from 'zustand';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { env } from '@/shared/config/env';
import { mapApiUser } from '@/shared/lib/mapUser';
import { queryClient } from '@/shared/lib/queryClient';
import { tokenStorage } from '@/shared/lib/storage';
import {
  clearSessionExpiredState,
  isSessionExpired,
  markSessionActive,
} from '@/shared/lib/sessionManager';
import type { User } from '@/shared/types';

/** Подсказка: когда-то логинились — при перезагрузке пробуем refresh по httpOnly cookie. */
const AUTH_SESSION_HINT_KEY = 'nlh_auth_session_hint';

/** Ключи для сохранения оригинального пользователя при импersonации. */
const IMPERSONATION_ORIGINAL_USER_KEY = 'nlh_original_user';

function setSessionHint() {
  try {
    localStorage.setItem(AUTH_SESSION_HINT_KEY, '1');
  } catch {
    /* ignore */
  }
}

function clearSessionHint() {
  try {
    localStorage.removeItem(AUTH_SESSION_HINT_KEY);
  } catch {
    /* ignore */
  }
}

function shouldTryRefreshFromCookie() {
  try {
    return localStorage.getItem(AUTH_SESSION_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

function saveOriginalUserToStorage(user: User) {
  try {
    localStorage.setItem(IMPERSONATION_ORIGINAL_USER_KEY, JSON.stringify(user));
  } catch {
    /* ignore */
  }
}

function clearImpersonationStorage() {
  try {
    localStorage.removeItem(IMPERSONATION_ORIGINAL_USER_KEY);
  } catch {
    /* ignore */
  }
}

function readOriginalUserFromStorage(): User | null {
  try {
    const raw = localStorage.getItem(IMPERSONATION_ORIGINAL_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

interface RegisterPayload {
  email: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  invite_token?: string;
}

interface InviteRegisterPayload {
  token: string;
  first_name: string;
  last_name: string;
  password: string;
  phone?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  /** Импersonация: оригинальный суперадмин пока активна сессия. */
  isImpersonating: boolean;
  originalUser: User | null;

  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  registerByInvite: (payload: InviteRegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  /** Local cleanup without backend call — used for idle-timeout exit from warning modal. */
  logoutLocal: () => void;
  fetchMe: () => Promise<void>;
  bootstrap: () => Promise<void>;

  startImpersonation: (targetUser: User, accessToken: string) => void;
  stopImpersonation: () => void;
}

/** Восстанавливаем originalUser из localStorage при инициализации стора. */
const storedOriginalUser = readOriginalUserFromStorage();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  isImpersonating: storedOriginalUser !== null,
  originalUser: storedOriginalUser,

  login: async (email, password, rememberMe = false) => {
    clearSessionExpiredState();
    const { data } = await apiClient.post(API.auth.login, {
      email,
      password,
      remember_me: rememberMe,
    });
    queryClient.clear();
    tokenStorage.setAccessFromAuthResponse(data.tokens.access);
    setSessionHint();
    clearSessionExpiredState();
    markSessionActive();
    set({ user: mapApiUser(data.user as Record<string, unknown>), isAuthenticated: true });
  },

  register: async (payload) => {
    const { data } = await apiClient.post(API.auth.register, payload);
    queryClient.clear();
    tokenStorage.setAccessFromAuthResponse(data.tokens.access);
    setSessionHint();
    clearSessionExpiredState();
    markSessionActive();
    set({ user: mapApiUser(data.user as Record<string, unknown>), isAuthenticated: true });
  },

  registerByInvite: async (payload) => {
    await apiClient.post(API.auth.registerInvite, payload);
  },

  logout: async () => {
    try {
      await apiClient.post(API.auth.logout, {});
    } finally {
      get().logoutLocal();
    }
  },

  logoutLocal: () => {
    tokenStorage.clear();
    clearSessionHint();
    clearImpersonationStorage();
    queryClient.clear();
    set({
      user: null,
      isAuthenticated: false,
      isImpersonating: false,
      originalUser: null,
    });
  },

  fetchMe: async () => {
    const { data } = await apiClient.get(API.auth.me);
    set({ user: mapApiUser(data as Record<string, unknown>), isAuthenticated: true });
  },

  bootstrap: async () => {
    if (isSessionExpired()) {
      get().logoutLocal();
      set({ isLoading: false });
      return;
    }

    try {
      // Перехватываем impersonation-токен, сохранённый перед hard-reload.
      const pendingImpersonationToken = tokenStorage.consumeImpersonationAccess();
      if (pendingImpersonationToken) {
        tokenStorage.setAccessToken(pendingImpersonationToken);
      }

      if (!tokenStorage.getAccessToken() && shouldTryRefreshFromCookie()) {
        const { data } = await axios.post<{ access: string }>(
          `${env.API_BASE_URL}${API.auth.refreshToken}`,
          {},
          { withCredentials: true },
        );
        tokenStorage.setAccessToken(data.access);
      }
      if (!tokenStorage.getAccessToken()) {
        set({ isLoading: false });
        return;
      }
      await get().fetchMe();
      markSessionActive();

      /**
       * Если после bootstrap мы обнаруживаем, что в localStorage есть originalUser,
       * но текущий пользователь — это суперадмин (а не тот, кого имитировали),
       * значит страница была перезагружена во время импersonации.
       * В этом случае чистим состояние импersonации — токен в памяти уже не тот.
       */
      const { isImpersonating, user } = get();
      if (isImpersonating && user) {
        const storedOriginal = readOriginalUserFromStorage();
        if (storedOriginal && user.id === storedOriginal.id) {
          // Перезагрузка: bootstrap восстановил суперадмина — чистим импersonацию.
          clearImpersonationStorage();
          set({ isImpersonating: false, originalUser: null });
        }
      }
    } catch {
      tokenStorage.clear();
      clearSessionHint();
      clearImpersonationStorage();
      queryClient.clear();
      set({
        user: null,
        isAuthenticated: false,
        isImpersonating: false,
        originalUser: null,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  startImpersonation: (targetUser, accessToken) => {
    const { user } = get();
    if (!user) return;

    // Сохраняем оригинального суперадмина в localStorage для индикации активной сессии.
    saveOriginalUserToStorage(user);

    // Жёсткая перезагрузка нужна, чтобы избежать race-condition с RequireRole
    // guard'ами на странице, где находился суперадмин (например, /team/manage,
    // /building/staff, /users/:id) — без hard nav смена роли в state триггерит
    // <Navigate to="/403">. Токен передаём через sessionStorage, потому что
    // access-токен живёт только в памяти.
    tokenStorage.stashImpersonationAccess(accessToken);
    // Подавляем targetUser ради линтера — он будет прочитан после reload через fetchMe.
    void targetUser;
    queryClient.clear();
    window.location.replace('/dashboard');
  },

  stopImpersonation: () => {
    const { originalUser } = get();
    if (!originalUser) return;

    queryClient.clear();
    tokenStorage.clear();
    clearImpersonationStorage();

    // Hard reload зеркалит поведение startImpersonation и исключает race condition:
    // смена состояния без hard reload триггерит ре-рендеры, которые сразу делают
    // API-запросы с null-токеном; их 401 и одновременный bootstrap оба бьются за
    // httpOnly cookie — BLACKLIST_AFTER_ROTATION гарантирует падение второго
    // и window.location.href='/login' в перехватчике.
    window.location.replace('/dashboard');
  },
}));
