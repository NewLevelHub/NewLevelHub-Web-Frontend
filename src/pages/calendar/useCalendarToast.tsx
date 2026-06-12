import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';

import { cn } from '@/shared/lib/cn';

export function useCalendarToast(durationMs = 3000) {
  const { t } = useTranslation();
  const [messageKey, setMessageKey] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const showToast = useCallback(
    (key: string) => {
      setMessageKey(key);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setMessageKey(null);
        timerRef.current = null;
      }, durationMs);
    },
    [durationMs],
  );

  const CalendarToast = messageKey ? (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-none fixed bottom-6 left-1/2 z-[100] -translate-x-1/2',
        'flex max-w-md items-center gap-2 rounded-lg border border-[#bce3d2]',
        'bg-[#e3f4ec] px-4 py-3 text-sm font-medium text-[#0a7553] shadow-lg',
      )}
    >
      <CheckCircle2 size={16} className="shrink-0" aria-hidden="true" />
      <span>{t(messageKey)}</span>
    </div>
  ) : null;

  return { showToast, CalendarToast };
}
