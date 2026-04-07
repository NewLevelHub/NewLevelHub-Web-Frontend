import type { AxiosError } from 'axios';

type ApiErrorBody = {
  detail?: unknown;
  message?: string;
};

function stringifyDetail(detail: unknown): string {
  if (detail == null) return '';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map(String).join('; ');
  if (typeof detail === 'object') {
    const obj = detail as Record<string, unknown>;
    for (const v of Object.values(obj)) {
      if (Array.isArray(v) && v.length) return String(v[0]);
      if (typeof v === 'string') return v;
    }
  }
  return '';
}

/** DRF + custom_exception_handler: detail may be string, object, or nested under response.data */
export function getApiErrorMessage(error: unknown, fallback = 'Произошла ошибка'): string {
  const err = error as AxiosError<ApiErrorBody>;
  const data = err.response?.data;
  if (!data) return err.message || fallback;

  const fromDetail = stringifyDetail(data.detail);
  if (fromDetail) return fromDetail;

  if (typeof data.message === 'string') return data.message;
  return fallback;
}
