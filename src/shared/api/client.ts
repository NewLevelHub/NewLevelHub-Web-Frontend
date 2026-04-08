import axios from 'axios';
import { env } from '@/shared/config/env';
import { API } from '@/shared/api/endpoints';
import { tokenStorage } from '@/shared/lib/storage';

export const apiClient = axios.create({
  baseURL: env.API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
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

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const reqUrl = String(originalRequest?.url ?? '');

    // Не пытаемся «refresh» повторно при ошибке самого refresh — иначе цикл.
    if (reqUrl.includes('/auth/token/refresh/')) {
      tokenStorage.clear();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
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
      // Refresh в httpOnly cookie; тело может быть пустым, если cookie есть.
      const { data } = await axios.post<{ access: string }>(
        `${env.API_BASE_URL}${API.auth.refreshToken}`,
        {},
        { withCredentials: true },
      );
      const newAccess = data.access;

      tokenStorage.setAccessToken(newAccess);
      processQueue(null, newAccess);

      originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      tokenStorage.clear();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
