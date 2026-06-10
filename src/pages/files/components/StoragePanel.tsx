import { useTranslation } from 'react-i18next';
import { HardDrive, Trash2, Users, User } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { BREAKDOWN_ITEMS, formatFileSize } from '../utils/fileBrowserUtils';
import type { StorageScope } from '../types';

interface StoragePanelProps {
  usedBytes: number;
  limitBytes: number;
  fileCount: number;
  arcUsed: string;
  arcAll: string;
  gaugePct: number;
  bytesCats: Record<string, number>;
  trashPersonalBytes: number;
  trashCompanyBytes: number;
  scope: StorageScope;
  personalBytes: number;
  companyBytes: number;
  isGuest?: boolean;
}

export function StoragePanel({
  usedBytes,
  limitBytes,
  fileCount,
  arcUsed,
  arcAll,
  gaugePct,
  bytesCats,
  trashPersonalBytes,
  trashCompanyBytes,
  scope,
  personalBytes,
  companyBytes,
  isGuest,
}: StoragePanelProps) {
  const { t } = useTranslation();

  const isFull    = gaugePct >= 1;
  const isDanger  = gaugePct >= 0.85 && gaugePct < 1;
  const isWarning = gaugePct >= 0.7  && gaugePct < 0.85;

  // full ≥100% → crimson, danger 85-99% → red, warning 70-84% → orange, ok → green
  const arcStroke = isFull
    ? '#b91c1c'
    : isDanger
      ? '#ef4444'
      : isWarning
        ? '#f97316'
        : 'var(--brand)';


  const iconBoxClass = isFull
    ? 'bg-red-200 dark:bg-red-900'
    : isDanger
      ? 'bg-red-100 dark:bg-red-950'
      : isWarning
        ? 'bg-orange-100 dark:bg-orange-950'
        : 'bg-brand-subtle';

  const iconColor = isFull
    ? '#b91c1c'
    : isDanger
      ? '#ef4444'
      : isWarning
        ? '#f97316'
        : 'var(--brand-text)';

  const totalTrashBytes = trashPersonalBytes + trashCompanyBytes;

  // Use limitBytes as the common denominator for all bars so they're all on the same scale.
  // If no limit is set (limitBytes === 0), fall back to total known usage.
  const ref = limitBytes > 0 ? limitBytes : Math.max(usedBytes + totalTrashBytes, 1);

  const trashPersonalPct = Math.min((trashPersonalBytes / ref) * 100, 100);
  const trashCompanyPct  = Math.min((trashCompanyBytes  / ref) * 100, 100);

  const crossBytes = scope === 'personal' ? companyBytes : personalBytes;
  const crossPct   = Math.min((crossBytes / ref) * 100, 100);
  const crossLabel = scope === 'personal' ? t('files.bdCompany') : t('files.bdMyFiles');
  const CrossIcon  = scope === 'personal' ? Users : User;
  // Color scheme per scope direction (concrete Tailwind classes — CSS-var gradients don't work in v4)
  const crossIconBoxClass = scope === 'personal'
    ? 'bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400'
    : 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400';
  const crossBarClass = scope === 'personal' ? 'from-violet-400 to-violet-500' : 'from-blue-400 to-blue-500';

  return (
    <aside className="sticky top-4">
      <div className="bg-surface border border-default rounded-2xl p-4 flex flex-col gap-3">

        <div className="flex items-center">
          <span className="text-[13px] font-semibold text-primary">{t('files.storage')}</span>
        </div>

        {/* SVG semicircle gauge */}
        <div className="flex flex-col items-center">
          <div className="relative" style={{ width: '196px', height: '106px' }}>
            <svg viewBox="0 0 200 106" width="196" height="106" aria-hidden="true">
              <path
                d={arcAll}
                fill="none"
                stroke="var(--bg-raised)"
                strokeWidth="16"
                strokeLinecap="round"
              />
              {gaugePct > 0 && (
                <path
                  d={arcUsed}
                  fill="none"
                  stroke={arcStroke}
                  strokeWidth="16"
                  strokeLinecap="round"
                />
              )}
            </svg>
            <div
              className="absolute"
              style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
            >
              <div className={cn('w-10 h-10 rounded-[11px] grid place-items-center border-2 border-surface shadow-sm', iconBoxClass)}>
                <HardDrive size={18} style={{ color: iconColor }} />
              </div>
            </div>
          </div>
          <div className="text-center mt-1.5">
            <span className="block text-[21px] font-bold tracking-tight text-primary font-mono">
              {formatFileSize(usedBytes)}
            </span>
            <span className="block text-[11px] text-muted mt-0.5">
              {limitBytes > 0
                ? t('files.outOfUsed', { total: formatFileSize(limitBytes) })
                : t('files.fileCount', { count: fileCount })}
            </span>
          </div>
        </div>

        <div className="h-px bg-[var(--border-faint)]" />

        {/* Breakdown by file type */}
        <div className="space-y-2.5">
          {BREAKDOWN_ITEMS.map((b) => {
            const bytes = bytesCats[b.key] ?? 0;
            const pct = Math.min((bytes / ref) * 100, 100);
            return (
              <div key={b.key} className="flex items-center gap-2.5">
                <span className={cn('w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0', b.colorClass)}>
                  <b.Icon size={15} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-[5px]">
                    <span className="text-[13px] font-medium text-primary">{t(b.labelKey)}</span>
                    <span className="font-mono text-[11px] text-muted">{formatFileSize(bytes)}</span>
                  </div>
                  <div className="h-[4px] bg-raised rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full bg-gradient-to-r', b.barClass)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Trash rows — personal and company */}
          <div className="h-px bg-[var(--border-faint)]" />
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <Trash2 size={15} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-[5px]">
                <span className="text-[13px] font-medium text-primary">{t('files.bdTrashPersonal')}</span>
                <span className="font-mono text-[11px] text-muted">{formatFileSize(trashPersonalBytes)}</span>
              </div>
              <div className="h-[4px] bg-raised rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-slate-400 to-slate-500"
                  style={{ width: `${trashPersonalPct}%` }}
                />
              </div>
            </div>
          </div>
          {!isGuest && (
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <Trash2 size={15} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-[5px]">
                  <span className="text-[13px] font-medium text-primary">{t('files.bdTrashCompany')}</span>
                  <span className="font-mono text-[11px] text-muted">{formatFileSize(trashCompanyBytes)}</span>
                </div>
                <div className="h-[4px] bg-raised rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-slate-400 to-slate-500"
                    style={{ width: `${trashCompanyPct}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Cross-storage row: company bytes when on personal, personal bytes when on company */}
          {!isGuest && (
            <>
              <div className="h-px bg-[var(--border-faint)]" />
              <div className="flex items-center gap-2.5">
                <span className={cn('w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0', crossIconBoxClass)}>
                  <CrossIcon size={15} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-[5px]">
                    <span className="text-[13px] font-medium text-primary">{crossLabel}</span>
                    <span className="font-mono text-[11px] text-muted">{formatFileSize(crossBytes)}</span>
                  </div>
                  <div className="h-[4px] bg-raised rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full bg-gradient-to-r', crossBarClass)}
                      style={{ width: `${crossPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </aside>
  );
}
