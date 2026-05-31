import { memo } from 'react';
import { Clock } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import type { PassValidationLog } from '@/shared/types';

interface PassValidationsListProps {
  total: number;
  results: PassValidationLog[];
  isLoading: boolean;
  isError: boolean;
}

const METHOD_LABELS: Record<string, string> = {
  qr: 'QR',
  manual: 'Вручную',
};

function MethodBadge({ method }: { method: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border border-default bg-hover/40 px-2 py-0.5 text-xs font-medium text-secondary',
      )}
    >
      {METHOD_LABELS[method] ?? method}
    </span>
  );
}

function PassValidationsListInner({ total, results, isLoading, isError }: PassValidationsListProps) {
  return (
    <section className="rounded-xl border border-default bg-raised p-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-primary">
          <Clock size={18} className="text-secondary" />
          История валидаций
        </h2>
        <span className="rounded-md border border-default bg-hover/40 px-2 py-0.5 text-xs font-medium text-secondary">
          Всего: {total}
        </span>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-10 animate-pulse rounded-lg bg-hover/40" />
          ))}
        </div>
      ) : isError ? (
        <div className="text-sm text-danger">Не удалось загрузить историю валидаций.</div>
      ) : results.length === 0 ? (
        <div className="text-sm text-secondary">Гость ещё ни разу не валидировался по этому пропуску.</div>
      ) : (
        <ul className="divide-y divide-default overflow-hidden rounded-lg border border-default">
          {results.map((log) => (
            <li
              key={log.id}
              className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="text-sm text-primary">
                {new Date(log.validated_at).toLocaleString('ru-RU')}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-secondary">
                <span>
                  Проверил: <span className="text-primary">{log.validated_by ?? '—'}</span>
                </span>
                {log.entry_point ? <span>Точка: {log.entry_point}</span> : null}
                <MethodBadge method={log.method} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export const PassValidationsList = memo(PassValidationsListInner);
