import axios from 'axios';
import { env } from '@/shared/config/env';
import { API } from '@/shared/api/endpoints';
import { queryClient } from '@/shared/lib/queryClient';
import { tokenStorage } from '@/shared/lib/storage';
import {
  handleSessionExpired,
  isLocalAbsoluteSessionExpired,
  isSessionAbsoluteTimeoutError,
  isSessionExpired,
  isSessionIdleTimeoutError,
  isSessionTimeoutError,
} from '@/shared/lib/sessionManager';
import i18n from '@/shared/lib/i18n';

export const apiClient = axios.create({
  baseURL: env.API_BASE_URL,
  headers: { Accept: 'application/json' },
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  // Block only authenticated calls after idle logout — allow fresh login/register.
  if (isSessionExpired() && token) {
    return Promise.reject(new axios.Cancel('Session expired'));
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const lang = i18n.language ?? 'ru';
  config.headers['Accept-Language'] = lang === 'ru' ? 'ru-RU' : 'en-US';
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => {
    if (token) p.resolve(token);
    else p.reject(error);
  });
  failedQueue = [];
}

function rejectSessionExpired(error: unknown, noticeKey = 'session.expired') {
  handleSessionExpired({ noticeKey });
  return Promise.reject(error);
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    const originalRequest = error.config;
    const reqUrl = String(originalRequest?.url ?? '');

    if (isSessionAbsoluteTimeoutError(error)) {
      return rejectSessionExpired(error, 'session.absoluteExpired');
    }

    if (isSessionIdleTimeoutError(error)) {
      return rejectSessionExpired(error);
    }

    if (isSessionExpired()) {
      return Promise.reject(error);
    }

    if (reqUrl.includes('/auth/token/refresh/')) {
      if (isSessionTimeoutError(error)) {
        const noticeKey = isSessionAbsoluteTimeoutError(error)
          ? 'session.absoluteExpired'
          : 'session.expired';
        return rejectSessionExpired(error, noticeKey);
      }
      handleSessionExpired({ noticeKey: 'session.expired' });
      return Promise.reject(error);
    }

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isLocalAbsoluteSessionExpired(env.ABSOLUTE_SESSION_TIMEOUT_MINUTES)) {
      return rejectSessionExpired(error, 'session.absoluteExpired');
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          },
          reject,
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post<{ access: string }>(
        `${env.API_BASE_URL}${API.auth.refreshToken}`,
        {},
        {
          withCredentials: true,
          headers: { 'Accept-Language': (i18n.language ?? 'ru') === 'ru' ? 'ru-RU' : 'en-US' },
        },
      );
      const newAccess = data.access;

      tokenStorage.setAccessToken(newAccess);
      processQueue(null, newAccess);

      originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      if (isSessionAbsoluteTimeoutError(refreshError)) {
        return rejectSessionExpired(refreshError, 'session.absoluteExpired');
      }
      if (isSessionIdleTimeoutError(refreshError)) {
        return rejectSessionExpired(refreshError);
      }
      handleSessionExpired({ noticeKey: 'session.expired' });
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
