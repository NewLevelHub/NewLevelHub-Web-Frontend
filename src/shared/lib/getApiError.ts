import type { AxiosError } from 'axios';

export interface ApiError {
  code: string;
  message: string;
  fields: Record<string, string[]>;
}

export function getApiError(err: unknown): ApiError {
  const axiosErr = err as AxiosError<{
    success: false;
    error: { code: string; message: string; details: Record<string, string[]> };
  }>;

  const error = axiosErr?.response?.data?.error;

  if (error?.message) {
    return {
      code: error.code ?? 'UNKNOWN_ERROR',
      message: error.message,
      fields: error.details ?? {},
    };
  }

  if (err instanceof Error && err.message) {
    return { code: 'CLIENT_ERROR', message: err.message, fields: {} };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'Что-то пошло не так. Попробуйте позже.',
    fields: {},
  };
}
