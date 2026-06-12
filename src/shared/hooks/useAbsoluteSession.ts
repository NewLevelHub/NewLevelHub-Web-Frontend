import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { env } from '@/shared/config/env';
import { useAuth } from '@/shared/hooks/useAuth';
import {
  getAbsoluteTimeoutMs,
  getSessionCreatedAtMs,
  handleSessionExpired,
  isLocalAbsoluteSessionExpired,
  isSessionExpired,
} from '@/shared/lib/sessionManager';

const CHECK_INTERVAL_MS = 15_000;
const WARNING_SUPPRESS_MS = 2 * 60 * 1000;

export function useAbsoluteSession() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logoutLocal } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const warningSuppressedUntilRef = useRef(0);

  const timeoutMs = getAbsoluteTimeoutMs(env.ABSOLUTE_SESSION_TIMEOUT_MINUTES);
  const warningMs = getAbsoluteTimeoutMs(
    Math.min(
      env.ABSOLUTE_SESSION_WARNING_MINUTES,
      env.ABSOLUTE_SESSION_TIMEOUT_MINUTES - 1,
    ),
  );

  const dismissWarning = useCallback(() => {
    setShowWarning(false);
    warningSuppressedUntilRef.current = Date.now() + WARNING_SUPPRESS_MS;
  }, []);

  const exitSession = useCallback(() => {
    setShowWarning(false);
    warningSuppressedUntilRef.current = 0;
    logoutLocal();
    navigate('/login', {
      replace: true,
      state: { noticeKey: 'session.absoluteExpired' },
    });
  }, [logoutLocal, navigate]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (isSessionExpired()) return;

      const sessionCreatedAt = getSessionCreatedAtMs();
      if (sessionCreatedAt === null) {
        setShowWarning(false);
        return;
      }

      const elapsedMs = Date.now() - sessionCreatedAt;

      if (elapsedMs >= timeoutMs || isLocalAbsoluteSessionExpired(env.ABSOLUTE_SESSION_TIMEOUT_MINUTES)) {
        handleSessionExpired({ noticeKey: 'session.absoluteExpired' });
        return;
      }

      if (elapsedMs >= timeoutMs - warningMs) {
        const suppressed = Date.now() < warningSuppressedUntilRef.current;
        setShowWarning(!suppressed);
      } else {
        setShowWarning(false);
        warningSuppressedUntilRef.current = 0;
      }
    }, CHECK_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [timeoutMs, warningMs]);

  return {
    showWarning,
    dismissWarning,
    exitSession,
    warningTitle: t('session.absoluteWarningTitle'),
    warningDescription: t('session.absoluteWarningDescription'),
    dismissLabel: t('session.absoluteDismiss'),
    exitLabel: t('session.absoluteExit'),
  };
}
