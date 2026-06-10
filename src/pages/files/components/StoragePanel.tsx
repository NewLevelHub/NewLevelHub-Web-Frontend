import { useTranslation } from 'react-i18next';
import { HardDrive } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { BREAKDOWN_ITEMS, formatFileSize } from '../utils/fileBrowserUtils';

interface StoragePanelProps {
  usedBytes: number;
  limitBytes: number;
  fileCount: number;
  arcUsed: string;
  arcAll: string;
  gaugePct: number;
  bytesCats: Record<string, number>;
  bytesTotal: number;
}

export function StoragePanel({
  usedBytes,
  limitBytes,
  fileCount,
  arcUsed,
  arcAll,
  gaugePct,
  bytesCats,
  bytesTotal,
}: StoragePanelProps) {
  const { t } = useTranslation();

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
                  stroke="var(--brand)"
                  strokeWidth="16"
                  strokeLinecap="round"
                  style={{ filter: 'drop-shadow(0 3px 10px color-mix(in srgb, var(--brand) 50%, transparent))' }}
                />
              )}
            </svg>
            <div
              className="absolute"
              style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
            >
              <div className="w-10 h-10 rounded-[11px] bg-brand-subtle grid place-items-center border-2 border-surface shadow-sm">
                <HardDrive size={18} style={{ color: 'var(--brand-text)' }} />
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
            const pct = bytesTotal > 0 ? (bytes / bytesTotal) * 100 : 0;
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
        </div>

      </div>
    </aside>
  );
}
