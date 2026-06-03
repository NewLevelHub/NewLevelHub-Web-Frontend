import { useCallback, useEffect, useRef, useState } from 'react';

export function useTimedMessage(durationMs = 1200) {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const showMessage = useCallback(
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

  const clearMessage = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setMessage(null);
  }, []);

  return { message, showMessage, clearMessage, isMessageVisible: message !== null };
}
