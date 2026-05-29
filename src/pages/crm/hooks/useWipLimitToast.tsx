import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

/** Same copy as inline CRM errors — use for every client-side WIP block + toasts. */
export const WIP_LIMIT_VIOLATION_MESSAGE_KEY = 'crm.wipLimitExceeded';

export function useWipLimitToast(durationMs = 4000) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const showWipLimitToast = useCallback(() => {
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setVisible(false);
      timerRef.current = null;
    }, durationMs);
  }, [durationMs]);

  const WipLimitToast = visible ? (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'pointer-events-none fixed bottom-6 left-1/2 z-[100] -translate-x-1/2',
        'flex max-w-md items-center gap-2 rounded-lg border border-orange-800',
        'bg-orange-950/95 px-4 py-3 text-sm text-orange-200 shadow-lg',
      )}
    >
      <AlertCircle size={16} className="shrink-0" aria-hidden="true" />
      <span>{t(WIP_LIMIT_VIOLATION_MESSAGE_KEY)}</span>
    </div>
  ) : null;

  return { showWipLimitToast, WipLimitToast };
}
