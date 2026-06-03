import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { fmtDateTime } from '@/shared/lib/formatDate';
import type { PassValidationLog } from '@/shared/types';

interface PassValidationsListProps {
  total: number;
  results: PassValidationLog[];
  isLoading: boolean;
  isError: boolean;
}

function PassValidationsListInner({ total, results, isLoading, isError }: PassValidationsListProps) {
  const { t } = useTranslation();

  function getMethodLabel(method: string): string {
    if (method === 'qr') return t('passes.validationHistory.methodQr');
    if (method === 'manual') return t('passes.validationHistory.methodManual');
    return method;
  }

  return (
    <section className="rounded-xl border border-default bg-raised p-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-primary">
          <Clock size={18} className="text-secondary" />
          {t('passes.validationHistory.title')}
        </h2>
        <span className="rounded-md border border-default bg-hover/40 px-2 py-0.5 text-xs font-medium text-secondary">
          {t('passes.validationHistory.total', { count: total })}
        </span>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-10 animate-pulse rounded-lg bg-hover/40" />
          ))}
        </div>
      ) : isError ? (
        <div className="text-sm text-danger">{t('passes.validationHistory.loadError')}</div>
      ) : results.length === 0 ? (
        <div className="text-sm text-secondary">{t('passes.validationHistory.noHistory')}</div>
      ) : (
        <ul className="divide-y divide-default overflow-hidden rounded-lg border border-default">
          {results.map((log) => (
            <li
              key={log.id}
              className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="text-sm text-primary">
                {fmtDateTime(log.validated_at)}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-secondary">
                <span>
                  {t('passes.validationHistory.checkedBy')}: <span className="text-primary">{log.validated_by ?? '—'}</span>
                </span>
                {log.entry_point ? <span>{t('passes.validationHistory.entryPoint')}: {log.entry_point}</span> : null}
                <span
                  className={cn(
                    'inline-flex items-center rounded-md border border-default bg-hover/40 px-2 py-0.5 text-xs font-medium text-secondary',
                  )}
                >
                  {getMethodLabel(log.method)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export const PassValidationsList = memo(PassValidationsListInner);
