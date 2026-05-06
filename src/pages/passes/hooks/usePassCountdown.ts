import { useEffect, useState } from 'react';

export function usePassCountdown(validFrom: string | undefined) {
  const [countdownDisplay, setCountdownDisplay] = useState('');
  const [isNowActive, setIsNowActive] = useState(false);

  useEffect(() => {
    if (!validFrom) return;
    const activatesAt = new Date(validFrom);
    if (activatesAt <= new Date()) {
      setIsNowActive(true);
      return;
    }
    const tick = () => {
      const diff = activatesAt.getTime() - Date.now();
      if (diff <= 0) {
        setIsNowActive(true);
        clearInterval(timer);
        return;
      }
      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const hh = String(hours).padStart(2, '0');
      const mm = String(minutes).padStart(2, '0');
      const ss = String(seconds).padStart(2, '0');
      setCountdownDisplay(`${hh}:${mm}:${ss}`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [validFrom]);

  return { countdownDisplay, isNowActive };
}
