import { Archive, FileText, HardDrive, Image, Play } from 'lucide-react';
import type { StorageFile } from '@/shared/types';

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export function formatFileSize(size: number): string {
  if (size <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = size;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export function relativeDate(dateStr: string, lang: string): string {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  if (diffDays === 0) return rtf.format(0, 'day');
  if (diffDays < 30) return rtf.format(-diffDays, 'day');
  return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' }).format(date);
}

export function getFileExt(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

export const EXT_BADGE_STYLES: Record<string, string> = {
  pdf:     'from-red-500 to-red-700',
  fig:     'from-purple-500 to-violet-700',
  xls:     'from-green-600 to-green-800',
  xlsx:    'from-green-600 to-green-800',
  key:     'from-amber-400 to-amber-600',
  numbers: 'from-green-500 to-green-700',
  pages:   'from-amber-500 to-amber-700',
  png:     'from-cyan-400 to-cyan-600',
  jpg:     'from-cyan-400 to-cyan-600',
  jpeg:    'from-cyan-400 to-cyan-600',
  webp:    'from-cyan-500 to-sky-600',
  gif:     'from-pink-400 to-pink-600',
  svg:     'from-teal-400 to-teal-600',
  json:    'from-orange-500 to-orange-600',
  mp4:     'from-indigo-500 to-indigo-700',
  mp3:     'from-violet-500 to-violet-700',
  mov:     'from-indigo-400 to-indigo-600',
  zip:     'from-slate-500 to-slate-700',
  rar:     'from-slate-500 to-slate-700',
  doc:     'from-blue-500 to-blue-700',
  docx:    'from-blue-500 to-blue-700',
  ppt:     'from-rose-500 to-rose-700',
  pptx:    'from-rose-500 to-rose-700',
  txt:     'from-slate-400 to-slate-600',
  csv:     'from-emerald-500 to-emerald-700',
};

const ARCHIVE_CONTENT_TYPES = [
  'application/zip', 'application/x-rar-compressed', 'application/x-rar',
  'application/x-7z-compressed', 'application/gzip', 'application/x-tar', 'application/x-bzip2',
];

export function getFileCategoryFromContentType(contentType: string): 'docs' | 'img' | 'media' | 'arch' | 'other' {
  if (contentType.startsWith('image/')) return 'img';
  if (contentType.startsWith('video/') || contentType.startsWith('audio/')) return 'media';
  if (ARCHIVE_CONTENT_TYPES.includes(contentType)) return 'arch';
  if (contentType.startsWith('application/') || contentType.startsWith('text/')) return 'docs';
  return 'other';
}

export function categorizeBytes(files: StorageFile[]): Record<string, number> {
  const cats: Record<string, number> = { docs: 0, img: 0, media: 0, arch: 0, other: 0 };
  for (const f of files) {
    const ext = getFileExt(f.name);
    const size = f.file_size ?? f.size ?? 0;
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'key', 'pages', 'numbers'].includes(ext)) {
      cats.docs += size;
    } else if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'heic', 'bmp', 'tiff'].includes(ext)) {
      cats.img += size;
    } else if (['mp4', 'mp3', 'mov', 'avi', 'wav', 'mkv', 'aac', 'flac', 'ogg'].includes(ext)) {
      cats.media += size;
    } else if (['zip', 'tar', 'gz', 'rar', '7z', 'bz2'].includes(ext)) {
      cats.arch += size;
    } else {
      cats.other += size;
    }
  }
  return cats;
}

export function getOwnerInitials(ownerName: string): string {
  return (ownerName || '?')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const CX = 100, CY = 96, R = 76;

function arcPt(p: number): [number, number] {
  const a = Math.PI * p;
  return [CX - R * Math.cos(a), CY - R * Math.sin(a)];
}

export function buildGaugePaths(gaugePct: number): { arcUsed: string; arcAll: string } {
  const [sx, sy] = arcPt(0);
  const [ex, ey] = arcPt(Math.min(gaugePct, 0.9999));
  const [fx, fy] = arcPt(0.9999);
  return {
    arcUsed: `M ${sx} ${sy} A ${R} ${R} 0 0 1 ${ex} ${ey}`,
    arcAll:  `M ${sx} ${sy} A ${R} ${R} 0 0 1 ${fx} ${fy}`,
  };
}

export const BREAKDOWN_ITEMS = [
  { key: 'docs',  labelKey: 'files.bdDocs',  Icon: FileText,  colorClass: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',           barClass: 'from-red-400 to-red-600' },
  { key: 'img',   labelKey: 'files.bdImg',   Icon: Image,     colorClass: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',    barClass: 'from-green-400 to-green-600' },
  { key: 'media', labelKey: 'files.bdMedia', Icon: Play,      colorClass: 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400', barClass: 'from-purple-400 to-purple-600' },
  { key: 'arch',  labelKey: 'files.bdArch',  Icon: Archive,   colorClass: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',    barClass: 'from-slate-400 to-slate-500' },
  { key: 'other', labelKey: 'files.bdOther', Icon: HardDrive, colorClass: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',   barClass: 'from-amber-400 to-amber-600' },
] as const;
