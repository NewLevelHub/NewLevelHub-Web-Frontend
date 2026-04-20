import { env } from '@/shared/config/env';

/** Собрать URL картинки ресурса (бэкенд отдаёт относительный путь к `/media/`). */
export function resolveMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  const base = env.MEDIA_BASE_URL.replace(/\/$/, '');
  if (!base) return p;
  return `${base}${p}`;
}
