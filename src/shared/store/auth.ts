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

  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  registerByInvite: (payload: InviteRegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  bootstrap: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

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

  registerByInvite: async (payload) => {
    const { data } = await apiClient.post(API.auth.registerInvite, payload);
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
      set({ user: null, isAuthenticated: false });
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
    } catch {
      tokenStorage.clear();
      clearSessionHint();
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },
}));
