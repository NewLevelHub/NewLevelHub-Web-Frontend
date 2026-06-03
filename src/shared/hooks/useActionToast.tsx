import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

export function useActionToast(durationMs = 4000) {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const showToast = useCallback(
    (text: string) => {
      setMessage(text);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setMessage(null);
        timerRef.current = null;
      }, durationMs);
    },
    [durationMs],
  );

  const dismissToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setMessage(null);
  }, []);

  const Toast = message ? (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-none fixed bottom-6 left-1/2 z-[100] -translate-x-1/2',
        'flex max-w-md items-center gap-2 rounded-lg border border-emerald-800',
        'bg-emerald-950/95 px-4 py-3 text-sm text-emerald-200 shadow-lg',
      )}
    >
      <CheckCircle2 size={16} className="shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  ) : null;

  return { showToast, dismissToast, Toast, isToastVisible: message !== null };
}
