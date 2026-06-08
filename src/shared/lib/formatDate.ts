/**
 * Locale-aware date formatting utilities.
 *
 * All functions read the active i18n language at call time, so they always
 * reflect the current language without requiring the caller to thread a locale
 * parameter through the component tree.
 *
 * Usage:
 *   import { fmtDate, fmtDateTime, fmtTime } from '@/shared/lib/formatDate';
 *
 *   fmtDate('2025-06-03T09:00:00')          // "3 июн 2025" / "Jun 3, 2025"
 *   fmtDateTime('2025-06-03T09:00:00')       // "03.06.2025, 09:00" / "06/03/2025, 09:00"
 *   fmtTime('2025-06-03T09:00:00')           // "09:00"
 */

import i18n from '@/shared/lib/i18n';
import { dateLocaleTag } from '@/shared/lib/localeFormat';

function locale(): string {
  return dateLocaleTag(i18n.language);
}

/**
 * Returns "3 июн 2025" (ru) or "Jun 3, 2025" (en).
 * Pass a null-ish value to get the dash placeholder "—".
 */
export function fmtDate(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale(), options);
}

/**
 * Returns "03.06.2025, 09:00" (ru) or "06/03/2025, 09:00 AM" (en).
 * Pass a null-ish value to get the dash placeholder "—".
 */
export function fmtDateTime(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  },
): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(locale(), options);
}

/**
 * Returns only the time portion, e.g. "09:00".
 */
export function fmtTime(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' },
): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(locale(), options);
}

/**
 * Returns "3 июн" (ru) or "Jun 3" (en) — day + short month, no year.
 */
export function fmtDayMonth(value: string | Date | null | undefined): string {
  return fmtDate(value, { day: 'numeric', month: 'short' });
}

/**
 * Returns "июнь 2025" (ru) or "June 2025" (en) — long month + year.
 */
export function fmtMonthYear(value: string | Date | null | undefined): string {
  return fmtDate(value, { month: 'long', year: 'numeric' });
}

/**
 * Returns "3 июня 2025 г." (ru) or "June 3, 2025" (en) — long date.
 */
export function fmtDateLong(value: string | Date | null | undefined): string {
  return fmtDate(value, { day: 'numeric', month: 'long', year: 'numeric' });
}
