import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser';
import { Check, X } from 'lucide-react';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES } from '@/shared/config/constants';
import { useUser } from '@/shared/hooks/useAuth';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/Button';
import type { BookingValidationResponse, PassValidationResponse } from '@/shared/types';
import {
  CAPSULE_ZONE_LABEL_KEYS,
  type CapsuleZone,
} from '@/shared/config/constants';
import { getApiError } from '@/shared/lib/getApiError';
import { fmtDate, fmtDateTime } from '@/shared/lib/formatDate';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const REASON_LABEL_KEYS: Record<import('@/shared/types').PassValidationFailure['reason'], string> = {
  expired: 'passes.reason.expired',
  revoked: 'passes.reason.revoked',
  already_used: 'passes.reason.already_used',
  not_found: 'passes.reason.not_found',
};

const REASON_SUBTITLE_KEYS: Record<import('@/shared/types').PassValidationFailure['reason'], string> = {
  expired: 'passes.reasonHint.expired',
  revoked: 'passes.reasonHint.revoked',
  already_used: 'passes.reasonHint.already_used',
  not_found: 'passes.reasonHint.not_found',
};

const BOOKING_REASON_LABEL_KEYS: Record<
  Exclude<import('@/shared/types').BookingValidationFailure['reason'], never>,
  string
> = {
  expired: 'booking.validate.reason.expired',
  cancelled: 'booking.validate.reason.cancelled',
  completed: 'booking.validate.reason.completed',
  no_show: 'booking.validate.reason.no_show',
  not_found: 'booking.validate.reason.not_found',
};

type ValidateMode = 'pass' | 'booking';

function formatDateTime(iso: string): string {
  return fmtDateTime(iso, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatPeriod(from: string, until: string): string {
  return `${fmtDateTime(from, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} — ${fmtDateTime(until, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
}

const CAMERA_CONSTRAINTS_CHAIN: MediaStreamConstraints[] = [
  { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
  { video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
  { video: true, audio: false },
];

export default function PassValidatePage() {
  const { t } = useTranslation();
  const user = useUser();
  const isCameraOnly =
    user?.role === USER_ROLES.RECEPTION || user?.role === USER_ROLES.SUPERADMIN;

  const [validateMode, setValidateMode] = useState<ValidateMode>('pass');
  const [qrCode, setQrCode] = useState('');
  const [passResult, setPassResult] = useState<PassValidationResponse | null>(null);
  const [bookingResult, setBookingResult] = useState<BookingValidationResponse | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const scanHandledRef = useRef(false);

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    scanHandledRef.current = false;
    if (videoRef.current) {
      BrowserQRCodeReader.cleanVideoSource(videoRef.current);
    }
    setIsCameraActive(false);
  }, []);

  const submitValidation = useCallback(async (code: string, mode: ValidateMode = validateMode) => {
    setIsSubmitting(true);
    setError('');
    try {
      if (mode === 'booking') {
        const response = await apiClient.post<BookingValidationResponse>(
          API.bookings.reservations.validateQr,
          { qr_code: code },
        );
        setBookingResult(response.data);
        setPassResult(null);
      } else {
        const response = await apiClient.post<PassValidationResponse>(API.passes.validate, { qr_code: code });
        setPassResult(response.data);
        setBookingResult(null);
      }
    } catch (validationError) {
      setPassResult(null);
      setBookingResult(null);
      setError(getApiError(validationError).message);
    } finally {
      setIsSubmitting(false);
    }
  }, [validateMode]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedCode = qrCode.trim();
    if (!UUID_RE.test(normalizedCode)) {
      setPassResult(null);
      setBookingResult(null);
      setError(t('passes.invalidUuid'));
      return;
    }
    await submitValidation(normalizedCode);
  };

  const startCamera = useCallback(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(t('passes.cameraUnavailable'));
      return;
    }
    setCameraError('');
    setError('');
    setPassResult(null);
    setBookingResult(null);
    stopCamera();
    setIsCameraActive(true);
  }, [stopCamera]);

  // Auto-start camera for camera-only roles on mount
  useEffect(() => {
    if (isCameraOnly) startCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isCameraActive || !videoRef.current) return;

    const video = videoRef.current;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');

    const reader = readerRef.current ?? new BrowserQRCodeReader();
    readerRef.current = reader;
    let cancelled = false;

    const tryDecode = async () => {
      for (const constraints of CAMERA_CONSTRAINTS_CHAIN) {
        if (cancelled) return;
        BrowserQRCodeReader.cleanVideoSource(video);
        try {
          const controls = await reader.decodeFromConstraints(constraints, video, (scanResult, _err, ctrls) => {
            if (cancelled || scanHandledRef.current) return;
            const text = scanResult?.getText()?.trim();
            if (!text || !UUID_RE.test(text)) return;
            scanHandledRef.current = true;
            ctrls.stop();
            controlsRef.current = null;
            setIsCameraActive(false);
            setQrCode(text);
            void submitValidation(text, validateMode);
          });
          if (cancelled) { controls.stop(); return; }
          controlsRef.current = controls;
          return;
        } catch { /* try next constraint */ }
      }
      if (!cancelled) {
        setCameraError(t('passes.cameraDenied'));
        setIsCameraActive(false);
      }
    };

    void tryDecode();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
      BrowserQRCodeReader.cleanVideoSource(video);
    };
  }, [isCameraActive, submitValidation, validateMode]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const handleScanAgain = () => {
    setPassResult(null);
    setBookingResult(null);
    setQrCode('');
    startCamera();
  };

  const handleModeChange = (mode: ValidateMode) => {
    setValidateMode(mode);
    setPassResult(null);
    setBookingResult(null);
    setQrCode('');
    setError('');
  };

  function ModeTabs({ className }: { className?: string }) {
    return (
      <div className={cn('flex gap-2', className)} role="tablist" aria-label={t('passes.validateModeLabel')}>
        <button
          type="button"
          role="tab"
          aria-selected={validateMode === 'pass'}
          onClick={() => handleModeChange('pass')}
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            validateMode === 'pass'
              ? 'bg-brand text-white'
              : 'border border-default text-secondary hover:bg-hover',
          )}
        >
          {t('passes.validateTabGuest')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={validateMode === 'booking'}
          onClick={() => handleModeChange('booking')}
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            validateMode === 'booking'
              ? 'bg-brand text-white'
              : 'border border-default text-secondary hover:bg-hover',
          )}
        >
          {t('passes.validateTabBooking')}
        </button>
      </div>
    );
  }

  function BookingSuccessPanel({ result }: { result: Extract<BookingValidationResponse, { valid: true }> }) {
    const zoneKey = result.capsule_zone
      ? CAPSULE_ZONE_LABEL_KEYS[result.capsule_zone as CapsuleZone]
      : null;

    return (
      <div className="rounded-2xl bg-green-700 p-6 flex flex-col gap-5 text-white">
        <div className="flex flex-col items-center gap-3 pt-1">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
            <Check className="h-8 w-8" strokeWidth={2.5} />
          </div>
          <p className="text-xl font-bold">{t('booking.validate.successTitle')}</p>
        </div>

        <div className="rounded-xl bg-white/10 divide-y divide-white/15 text-sm">
          <div className="flex justify-between gap-4 px-4 py-2.5">
            <span className="uppercase text-[11px] tracking-wide text-white/55 shrink-0">{t('dashboard.table.user')}</span>
            <span className="font-medium text-right">{result.user_name}</span>
          </div>
          <div className="flex justify-between gap-4 px-4 py-2.5">
            <span className="uppercase text-[11px] tracking-wide text-white/55 shrink-0">{t('dashboard.table.resource')}</span>
            <span className="font-medium text-right">{result.resource_name}</span>
          </div>
          {zoneKey ? (
            <div className="flex justify-between gap-4 px-4 py-2.5">
              <span className="uppercase text-[11px] tracking-wide text-white/55 shrink-0">{t('booking.validate.zoneLabel')}</span>
              <span className="font-medium text-right">{t(zoneKey)}</span>
            </div>
          ) : null}
          <div className="flex justify-between gap-4 px-4 py-2.5">
            <span className="uppercase text-[11px] tracking-wide text-white/55 shrink-0">{t('passes.columnPeriod')}</span>
            <span className="font-medium text-right">{formatPeriod(result.start_time, result.end_time)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleScanAgain}
          className="mt-auto rounded-xl bg-white px-4 py-3 text-sm font-semibold text-green-800 hover:bg-green-50 transition-colors"
        >
          {t('passes.checkNext')}
        </button>
      </div>
    );
  }

  function BookingFailurePanel({ result }: { result: Extract<BookingValidationResponse, { valid: false }> }) {
    return (
      <div className="rounded-2xl bg-red-800 p-6 flex flex-col gap-5 text-white">
        <div className="flex flex-col items-center gap-3 pt-1">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
            <X className="h-8 w-8" strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{t('booking.validate.failureTitle')}</p>
            <p className="mt-1 text-sm text-white/65">
              {result.reason === 'not_yet_active'
                ? t('passes.availableFrom', { date: formatDateTime(result.available_from) })
                : t(BOOKING_REASON_LABEL_KEYS[result.reason])}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleScanAgain}
          className="mt-auto rounded-xl bg-white px-4 py-3 text-sm font-semibold text-red-800 hover:bg-red-50 transition-colors"
        >
          {t('passes.checkNext')}
        </button>
      </div>
    );
  }

  // ── Camera-only layout (reception / superadmin) ──────────────────────────
  if (isCameraOnly) {
    return (
      <main className="mx-auto max-w-5xl space-y-4 sm:space-y-5 p-3 sm:p-4 md:p-6">
        <div className="space-y-3">
          <div>
            <h1 className="text-2xl font-bold text-primary">{t('passes.qrPageTitle')}</h1>
            <p className="mt-1 text-sm text-secondary">{t('passes.qrPageSubtitle')}</p>
          </div>
          <ModeTabs />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          {/* Camera panel */}
          <div className="rounded-2xl border border-default bg-surface p-4 sm:p-5 flex flex-col gap-4">
            <p className="text-sm text-center text-secondary">{t('passes.qrCameraHint')}</p>

            <div className="relative aspect-video rounded-xl overflow-hidden bg-neutral-900">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />

              {isCameraActive && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 bg-black/25" />
                  {/* Scanning frame with corner brackets */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative w-48 h-48">
                      <span className="absolute top-0 left-0 w-7 h-7 border-t-2 border-l-2 border-green-400 rounded-tl" />
                      <span className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 border-green-400 rounded-tr" />
                      <span className="absolute bottom-0 left-0 w-7 h-7 border-b-2 border-l-2 border-green-400 rounded-bl" />
                      <span className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 border-green-400 rounded-br" />
                      <div className="absolute left-1 right-1 h-0.5 bg-green-400/80 animate-scan-line" />
                    </div>
                  </div>
                  {/* LIVE badge */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                    CAM-01 · LIVE
                  </div>
                </div>
              )}

              {isSubmitting && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <p className="text-sm font-medium text-white">{t('passes.checking')}</p>
                </div>
              )}
            </div>

            {cameraError ? <p className="text-sm text-warning text-center">{cameraError}</p> : null}
            {error ? <p className="text-sm text-danger text-center">{error}</p> : null}

            <div className="flex justify-center">
              {isCameraActive ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={stopCamera}
                >
                  {t('passes.stopCamera')}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={startCamera}
                >
                  {t('passes.startCamera')}
                </Button>
              )}
            </div>
          </div>

          {/* Result panel */}
          {validateMode === 'booking' && bookingResult ? (
            bookingResult.valid ? (
              <BookingSuccessPanel result={bookingResult} />
            ) : (
              <BookingFailurePanel result={bookingResult} />
            )
          ) : validateMode === 'pass' && passResult ? (
            passResult.valid ? (
              <div className="rounded-2xl bg-green-700 p-6 flex flex-col gap-5 text-white">
                <div className="flex flex-col items-center gap-3 pt-1">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
                    <Check className="h-8 w-8" strokeWidth={2.5} />
                  </div>
                  <p className="text-xl font-bold">{t('passes.passValid')}</p>
                </div>

                <div className="rounded-xl bg-white/10 divide-y divide-white/15 text-sm">
                  <div className="flex justify-between gap-4 px-4 py-2.5">
                    <span className="uppercase text-[11px] tracking-wide text-white/55 shrink-0">{t('team.roleGuest')}</span>
                    <span className="font-medium text-right">{passResult.guest_name}</span>
                  </div>
                  {passResult.purpose ? (
                    <div className="flex justify-between gap-4 px-4 py-2.5">
                      <span className="uppercase text-[11px] tracking-wide text-white/55 shrink-0">{t('passes.purpose')}</span>
                      <span className="font-medium text-right">{passResult.purpose}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-4 px-4 py-2.5">
                    <span className="uppercase text-[11px] tracking-wide text-white/55 shrink-0">{t('passes.invitedBy')}</span>
                    <span className="font-medium text-right">{passResult.invited_by}</span>
                  </div>
                  <div className="flex justify-between gap-4 px-4 py-2.5">
                    <span className="uppercase text-[11px] tracking-wide text-white/55 shrink-0">{t('passes.columnPeriod')}</span>
                    <span className="font-medium text-right">{formatPeriod(passResult.valid_from, passResult.valid_until)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleScanAgain}
                  className="mt-auto rounded-xl bg-white px-4 py-3 text-sm font-semibold text-green-800 hover:bg-green-50 transition-colors"
                >
                  {t('passes.checkNext')}
                </button>
              </div>
            ) : (
              <div className="rounded-2xl bg-red-800 p-6 flex flex-col gap-5 text-white">
                <div className="flex flex-col items-center gap-3 pt-1">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
                    <X className="h-8 w-8" strokeWidth={2.5} />
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold">{t('passes.passInvalid')}</p>
                    <p className="mt-1 text-sm text-white/65">
                      {passResult.reason === 'not_yet_active'
                        ? t('passes.availableFrom', { date: formatDateTime(passResult.available_from) })
                        : t(REASON_SUBTITLE_KEYS[passResult.reason])}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-white/10 divide-y divide-white/15 text-sm">
                  <div className="flex justify-between gap-4 px-4 py-2.5">
                    <span className="uppercase text-[11px] tracking-wide text-white/55 shrink-0">{t('passes.reasonLabel')}</span>
                    <span className="font-medium text-right">
                      {passResult.reason === 'not_yet_active' ? t('passes.notYetActive') : t(REASON_LABEL_KEYS[passResult.reason])}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleScanAgain}
                  className="mt-auto rounded-xl bg-white px-4 py-3 text-sm font-semibold text-red-800 hover:bg-red-50 transition-colors"
                >
                  {t('passes.checkNext')}
                </button>
              </div>
            )
          ) : (
            <div className={cn(
              'rounded-2xl border border-default bg-surface p-6',
              'flex items-center justify-center min-h-56 lg:min-h-0',
            )}>
              <p className="text-sm text-secondary text-center">
                {isSubmitting ? t('passes.checking') : t('passes.resultPlaceholder')}
              </p>
            </div>
          )}
        </div>
      </main>
    );
  }

  // ── Standard layout (other roles) ────────────────────────────────────────
  return (
    <main className="mx-auto max-w-3xl space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">{t('passes.validatePageTitle')}</h1>
          <p className="mt-1 text-sm text-secondary">{t('passes.validatePageSubtitle')}</p>
        </div>
        <ModeTabs />
      </div>

      <section className="rounded-xl border border-default bg-raised p-4 sm:p-5">
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3">
          <label className="block text-sm text-secondary">
            {t('passes.uuidLabel')}
            <input
              type="text"
              value={qrCode}
              onChange={(event) => setQrCode(event.target.value)}
              placeholder={t('passes.uuidPlaceholder')}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting}
            >
              {isSubmitting ? t('passes.checking') : t('passes.validate')}
            </Button>
            {isCameraActive ? (
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={stopCamera}
              >
                {t('passes.stopCamera')}
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={startCamera}
              >
                {t('passes.scanCamera')}
              </Button>
            )}
          </div>
        </form>
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        {cameraError ? <p className="mt-3 text-sm text-warning">{cameraError}</p> : null}
      </section>

      {isCameraActive ? (
        <section className="rounded-xl border border-default bg-raised p-4 sm:p-5">
          <p className="mb-3 text-sm text-secondary">{t('passes.qrAimHint')}</p>
          <video
            ref={videoRef}
            className="aspect-video w-full rounded-lg border border-default bg-black object-cover"
            autoPlay
            playsInline
            muted
          />
        </section>
      ) : null}

      {validateMode === 'booking' && bookingResult ? (
        <section className="rounded-xl border border-default bg-raised p-4 sm:p-5">
          {bookingResult.valid ? (
            <div className="space-y-2 text-sm text-secondary">
              <p className="font-semibold text-success">{t('booking.validate.successTitle')}</p>
              <p><span className="text-secondary">{t('dashboard.table.user')}:</span> {bookingResult.user_name}</p>
              <p><span className="text-secondary">{t('dashboard.table.resource')}:</span> {bookingResult.resource_name}</p>
              {bookingResult.capsule_zone ? (
                <p>
                  <span className="text-secondary">{t('booking.validate.zoneLabel')}:</span>{' '}
                  {t(CAPSULE_ZONE_LABEL_KEYS[bookingResult.capsule_zone as CapsuleZone])}
                </p>
              ) : null}
              <p>
                <span className="text-secondary">{t('passes.columnPeriod')}:</span>{' '}
                {fmtDate(bookingResult.start_time)} — {fmtDate(bookingResult.end_time)}
              </p>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-rose-300">{t('booking.validate.failureTitle')}</p>
              <p className="text-secondary">
                {bookingResult.reason === 'not_yet_active'
                  ? t('passes.notYetActiveDetail', { date: formatDateTime(bookingResult.available_from) })
                  : t(BOOKING_REASON_LABEL_KEYS[bookingResult.reason])}
              </p>
            </div>
          )}
        </section>
      ) : validateMode === 'pass' && passResult ? (
        <section className="rounded-xl border border-default bg-raised p-4 sm:p-5">
          {passResult.valid ? (
            <div className="space-y-2 text-sm text-secondary">
              <p className="font-semibold text-success">{t('passes.passValidSimple')}</p>
              <p><span className="text-secondary">{t('team.roleGuest')}:</span> {passResult.guest_name}</p>
              <p><span className="text-secondary">{t('passes.purpose')}:</span> {passResult.purpose || '—'}</p>
              <p><span className="text-secondary">{t('passes.invitedBy')}:</span> {passResult.invited_by}</p>
              <p>
                <span className="text-secondary">{t('passes.columnPeriod')}:</span>{' '}
                {fmtDate(passResult.valid_from)} — {fmtDate(passResult.valid_until)}
              </p>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-rose-300">{t('passes.passInvalidSimple')}</p>
              <p className="text-secondary">
                {passResult.reason === 'not_yet_active'
                  ? t('passes.notYetActiveDetail', { date: formatDateTime(passResult.available_from) })
                  : t(REASON_LABEL_KEYS[passResult.reason])}
              </p>
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}
