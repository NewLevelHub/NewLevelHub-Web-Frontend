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
export function getApiErrorMessage(error: unknown, fallback = 'Произошла ошибка'): string {
  const err = error as AxiosError<ApiErrorBody>;
  const data = err.response?.data;
  if (!data) return err.message || fallback;

  // 1. Standard DRF `detail` key (string or array)
  const fromDetail = stringifyDetail(data.detail);
  if (fromDetail) return fromDetail;

  // 2. `message` key
  if (typeof data.message === 'string') return data.message;

  // 3. DRF field-level validation errors: { field: ["error msg", ...] }
  //    Walk all keys and return the first non-empty array item found.
  if (typeof data === 'object' && data !== null) {
    for (const [, value] of Object.entries(data)) {
      if (Array.isArray(value) && value.length) {
        const first = String(value[0]);
        if (first) return first;
      }
    }
  }

  return fallback;
}
