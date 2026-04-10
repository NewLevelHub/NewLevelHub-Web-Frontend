import axios from 'axios';
import { create } from 'zustand';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { env } from '@/shared/config/env';
import { mapApiUser } from '@/shared/lib/mapUser';
import { tokenStorage } from '@/shared/lib/storage';
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

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  /** Импersonация: оригинальный суперадмин пока активна сессия. */
  isImpersonating: boolean;
  originalUser: User | null;

  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
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
    const { data } = await apiClient.post(API.auth.login, {
      email,
      password,
      remember_me: rememberMe,
    });
    tokenStorage.setAccessFromAuthResponse(data.tokens.access);
    setSessionHint();
    set({ user: mapApiUser(data.user as Record<string, unknown>), isAuthenticated: true });
  },

  register: async (payload) => {
    const { data } = await apiClient.post(API.auth.register, payload);
    tokenStorage.setAccessFromAuthResponse(data.tokens.access);
    setSessionHint();
    set({ user: mapApiUser(data.user as Record<string, unknown>), isAuthenticated: true });
  },

  logout: async () => {
    try {
      await apiClient.post(API.auth.logout, {});
    } finally {
      tokenStorage.clear();
      clearSessionHint();
      clearImpersonationStorage();
      set({
        user: null,
        isAuthenticated: false,
        isImpersonating: false,
        originalUser: null,
      });
    }
  },

  fetchMe: async () => {
    const { data } = await apiClient.get(API.auth.me);
    set({ user: mapApiUser(data as Record<string, unknown>), isAuthenticated: true });
  },

  bootstrap: async () => {
    try {
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

    // Устанавливаем токен целевого пользователя в память.
    tokenStorage.setAccessToken(accessToken);

    set({
      user: targetUser,
      isAuthenticated: true,
      isImpersonating: true,
      originalUser: user,
    });
  },

  stopImpersonation: () => {
    const { originalUser } = get();
    if (!originalUser) return;

    /**
     * Сбрасываем токен в памяти: при следующем запросе apiClient использует null,
     * что вызовет 401 и автоматически перенаправит на логин.
     * Вместо этого мы сразу делаем bootstrap чтобы восстановить суперадмина через cookie.
     */
    tokenStorage.clear();
    clearImpersonationStorage();

    set({
      user: originalUser,
      isAuthenticated: true,
      isImpersonating: false,
      originalUser: null,
    });

    // Восстанавливаем актуальный access-токен через cookie refresh.
    get()
      .bootstrap()
      .catch(() => {
        /* bootstrap сам обработает ошибку */
      });
  },
}));
