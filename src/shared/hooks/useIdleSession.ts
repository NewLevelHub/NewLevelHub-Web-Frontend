import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { env } from '@/shared/config/env';
import { useAuth } from '@/shared/hooks/useAuth';
import {
  getIdleTimeoutMs,
  getLastUserActivityTimestamp,
  handleSessionExpired,
  isSessionExpired,
  markUserActivity,
} from '@/shared/lib/sessionManager';

const CHECK_INTERVAL_MS = 15_000;

export function useIdleSession() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { logoutLocal } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [isExtending, setIsExtending] = useState(false);

  const lastUserActivityRef = useRef(Date.now());

  const timeoutMs = getIdleTimeoutMs(env.IDLE_SESSION_TIMEOUT_MINUTES);
  const warningMs = getIdleTimeoutMs(
    Math.min(env.IDLE_SESSION_WARNING_MINUTES, env.IDLE_SESSION_TIMEOUT_MINUTES - 1),
  );

  const touchUserActivity = useCallback(() => {
    if (isSessionExpired()) return;
    const now = Date.now();
    lastUserActivityRef.current = now;
    markUserActivity();
    setShowWarning(false);
  }, []);

  const extendSession = useCallback(async () => {
    setIsExtending(true);
    try {
      await apiClient.get(API.auth.me);
      touchUserActivity();
      setShowWarning(false);
    } catch {
      /* Interceptor handles session expiry. */
    } finally {
      setIsExtending(false);
    }
  }, [touchUserActivity]);

  const exitSession = useCallback(() => {
    setShowWarning(false);
    logoutLocal();
    navigate('/login', {
      replace: true,
      state: { noticeKey: 'session.expired' },
    });
  }, [logoutLocal, navigate]);

  useEffect(() => {
    touchUserActivity();
  }, [location.pathname, touchUserActivity]);

  useEffect(() => {
    const events: Array<keyof WindowEventMap> = ['click', 'keydown', 'scroll'];

    function onActivity() {
      touchUserActivity();
    }

    events.forEach((event) => window.addEventListener(event, onActivity, { passive: true }));
    return () => {
      events.forEach((event) => window.removeEventListener(event, onActivity));
    };
  }, [touchUserActivity]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (isSessionExpired()) return;

      const lastActivity = Math.max(
        lastUserActivityRef.current,
        getLastUserActivityTimestamp(),
      );
      const idleMs = Date.now() - lastActivity;

      if (idleMs >= timeoutMs) {
        handleSessionExpired({ noticeKey: 'session.expired' });
        return;
      }

      if (idleMs >= timeoutMs - warningMs) {
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    }, CHECK_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [timeoutMs, warningMs]);

  return {
    showWarning,
    isExtending,
    extendSession,
    exitSession,
    warningTitle: t('session.warningTitle'),
    warningDescription: t('session.warningDescription', {
      minutes: env.IDLE_SESSION_WARNING_MINUTES,
    }),
    extendLabel: t('session.extend'),
    exitLabel: t('session.exit'),
  };
}
