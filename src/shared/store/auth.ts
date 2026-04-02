import { create } from 'zustand';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { tokenStorage } from '@/shared/lib/storage';
import type { User } from '@/shared/types';

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

  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  bootstrap: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const { data } = await apiClient.post(API.auth.login, { email, password });
    tokenStorage.setTokens(data.tokens.access, data.tokens.refresh);
    set({ user: data.user, isAuthenticated: true });
  },

  register: async (payload) => {
    const { data } = await apiClient.post(API.auth.register, payload);
    tokenStorage.setTokens(data.tokens.access, data.tokens.refresh);
    set({ user: data.user, isAuthenticated: true });
  },

  logout: async () => {
    try {
      const refresh = tokenStorage.getRefreshToken();
      if (refresh) {
        await apiClient.post(API.auth.logout, { refresh });
      }
    } finally {
      tokenStorage.clear();
      set({ user: null, isAuthenticated: false });
    }
  },

  fetchMe: async () => {
    const { data } = await apiClient.get(API.auth.me);
    set({ user: data, isAuthenticated: true });
  },

  bootstrap: async () => {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      set({ isLoading: false });
      return;
    }
    try {
      await get().fetchMe();
    } catch {
      tokenStorage.clear();
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },
}));
