import type { AxiosError } from 'axios';

type ApiErrorBody = {
  detail?: unknown;
  message?: string;
  [key: string]: unknown;
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

/**
 * Extract the first meaningful error message from a DRF error response.
 *
 * Handles these response body shapes:
 *   { "detail": "Token expired" }                          → string detail
 *   { "detail": ["msg1", "msg2"] }                        → joined array
 *   { "new_password": ["Too short.", "Too common."] }      → field-level array
 *   { "email": ["Enter a valid email address."] }          → any field-level array
 *   { "message": "Something went wrong" }                  → message field
 */
function unwrapPayload(data: unknown): unknown {
  if (data && typeof data === 'object' && 'detail' in data && 'error' in data) {
    return (data as { detail: unknown }).detail;
  }
  return data;
}

/** 403: сотрудник без привязки к компании (бэкенд может вернуть code / detail). */
export function isCompanyNotAssignedError(error: unknown): boolean {
  const err = error as AxiosError<Record<string, unknown>>;
  if (err.response?.status !== 403) return false;
  const raw = err.response.data;
  if (!raw || typeof raw !== 'object') return false;

  const topCode = raw.code;
  if (topCode === 'company_not_assigned') return true;

  const unwrapped = unwrapPayload(raw);
  if (unwrapped && typeof unwrapped === 'object') {
    const u = unwrapped as Record<string, unknown>;
    if (u.code === 'company_not_assigned') return true;
    if (typeof u.detail === 'object' && u.detail !== null && 'code' in u.detail) {
      if ((u.detail as { code?: string }).code === 'company_not_assigned') return true;
    }
  }

  const detail = raw.detail;
  if (typeof detail === 'string' && detail.toLowerCase().includes('company_not_assigned')) return true;

  return false;
}

export function getApiErrorMessage(error: unknown, fallback = 'Произошла ошибка'): string {
  const err = error as AxiosError<ApiErrorBody>;
  const raw = err.response?.data;
  if (raw == null) return err.message || fallback;

  const unwrapped = unwrapPayload(raw);
  if (typeof unwrapped === 'string') return unwrapped || fallback;
  if (Array.isArray(unwrapped)) {
    const joined = unwrapped.map(String).join('; ');
    return joined || fallback;
  }
  if (unwrapped == null || typeof unwrapped !== 'object') return err.message || fallback;

  const data = unwrapped as ApiErrorBody;

  const fromDetail = stringifyDetail(data.detail);
  if (fromDetail) return fromDetail;

  if (typeof data.message === 'string') return data.message;

  for (const [, value] of Object.entries(data)) {
    if (Array.isArray(value) && value.length) {
      const first = String(value[0]);
      if (first) return first;
    }
  }

  return fallback;
}
