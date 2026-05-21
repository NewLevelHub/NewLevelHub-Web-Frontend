import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser';
import { Check, X } from 'lucide-react';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES } from '@/shared/config/constants';
import { useUser } from '@/shared/hooks/useAuth';
import { cn } from '@/shared/lib/cn';
import type { PassValidationResponse } from '@/shared/types';
import { getApiErrorMessage } from '@/shared/lib/apiError';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const REASON_LABELS: Record<import('@/shared/types').PassValidationFailure['reason'], string> = {
  expired: 'Срок действия истёк',
  revoked: 'Пропуск отозван',
  already_used: 'Пропуск уже использован',
  not_found: 'Пропуск не найден',
};

const REASON_SUBTITLES: Record<import('@/shared/types').PassValidationFailure['reason'], string> = {
  expired: 'Истёк срок действия — попросите гостя оформить новый',
  revoked: 'Пропуск был отозван администратором',
  already_used: 'Пропуск уже был использован ранее',
  not_found: 'Пропуск не найден в системе',
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `${d.getDate()} ${MONTHS[d.getMonth()]} в ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function formatPeriod(from: string, until: string): string {
  const df = new Date(from);
  const dt = new Date(until);
  const fromTime = `${String(df.getHours()).padStart(2, '0')}:${String(df.getMinutes()).padStart(2, '0')}`;
  const untilTime = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
  return `${fmtDate(from)}, ${fromTime} — ${fmtDate(until)}, ${untilTime}`;
}

const CAMERA_CONSTRAINTS_CHAIN: MediaStreamConstraints[] = [
  { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
  { video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
  { video: true, audio: false },
];

export default function PassValidatePage() {
  const user = useUser();
  const isCameraOnly =
    user?.role === USER_ROLES.RECEPTION || user?.role === USER_ROLES.SUPERADMIN;

  const [qrCode, setQrCode] = useState('');
  const [result, setResult] = useState<PassValidationResponse | null>(null);
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

  const submitValidation = useCallback(async (code: string) => {
    setIsSubmitting(true);
    setError('');
    try {
      const response = await apiClient.post<PassValidationResponse>(API.passes.validate, { qr_code: code });
      setResult(response.data);
    } catch (validationError) {
      setResult(null);
      setError(getApiErrorMessage(validationError, 'Не удалось выполнить проверку QR.'));
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedCode = qrCode.trim();
    if (!UUID_RE.test(normalizedCode)) {
      setResult(null);
      setError('Введите корректный UUID QR-кода.');
      return;
    }
    await submitValidation(normalizedCode);
  };

  const startCamera = useCallback(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('В этом браузере недоступен доступ к камере. Проверьте разрешения браузера.');
      return;
    }
    setCameraError('');
    setError('');
    setResult(null);
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
            void submitValidation(text);
          });
          if (cancelled) { controls.stop(); return; }
          controlsRef.current = controls;
          return;
        } catch { /* try next constraint */ }
      }
      if (!cancelled) {
        setCameraError('Не удалось получить доступ к камере. Проверьте разрешения браузера.');
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
  }, [isCameraActive, submitValidation]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const handleScanAgain = () => {
    setResult(null);
    setQrCode('');
    startCamera();
  };

  // ── Camera-only layout (reception / superadmin) ──────────────────────────
  if (isCameraOnly) {
    return (
      <main className="mx-auto max-w-5xl space-y-4 sm:space-y-5 p-3 sm:p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">Проверка QR-кода</h1>
          <p className="mt-1 text-sm text-secondary">Поднесите QR-код гостя к камере</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          {/* Camera panel */}
          <div className="rounded-2xl border border-default bg-surface p-4 sm:p-5 flex flex-col gap-4">
            <p className="text-sm text-center text-secondary">Поднесите QR-код гостя к камере</p>

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
                  <p className="text-sm font-medium text-white">Проверяем пропуск...</p>
                </div>
              )}
            </div>

            {cameraError ? <p className="text-sm text-warning text-center">{cameraError}</p> : null}
            {error ? <p className="text-sm text-danger text-center">{error}</p> : null}

            <div className="flex justify-center">
              {isCameraActive ? (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="rounded-lg border border-amber-700 bg-warning-subtle px-4 py-2 text-sm font-medium text-warning-badge hover:bg-warning-subtle"
                >
                  Остановить камеру
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startCamera}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
                >
                  Запустить камеру
                </button>
              )}
            </div>
          </div>

          {/* Result panel */}
          {result ? (
            result.valid ? (
              <div className="rounded-2xl bg-green-700 p-6 flex flex-col gap-5 text-white">
                <div className="flex flex-col items-center gap-3 pt-1">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
                    <Check className="h-8 w-8" strokeWidth={2.5} />
                  </div>
                  <p className="text-xl font-bold">Пропуск действителен</p>
                </div>

                <div className="rounded-xl bg-white/10 divide-y divide-white/15 text-sm">
                  <div className="flex justify-between gap-4 px-4 py-2.5">
                    <span className="uppercase text-[11px] tracking-wide text-white/55 shrink-0">Гость</span>
                    <span className="font-medium text-right">{result.guest_name}</span>
                  </div>
                  {result.purpose ? (
                    <div className="flex justify-between gap-4 px-4 py-2.5">
                      <span className="uppercase text-[11px] tracking-wide text-white/55 shrink-0">Цель</span>
                      <span className="font-medium text-right">{result.purpose}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-4 px-4 py-2.5">
                    <span className="uppercase text-[11px] tracking-wide text-white/55 shrink-0">Пригласил</span>
                    <span className="font-medium text-right">{result.invited_by}</span>
                  </div>
                  <div className="flex justify-between gap-4 px-4 py-2.5">
                    <span className="uppercase text-[11px] tracking-wide text-white/55 shrink-0">Период</span>
                    <span className="font-medium text-right">{formatPeriod(result.valid_from, result.valid_until)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleScanAgain}
                  className="mt-auto rounded-xl bg-white px-4 py-3 text-sm font-semibold text-green-800 hover:bg-green-50 transition-colors"
                >
                  Проверить следующий
                </button>
              </div>
            ) : (
              <div className="rounded-2xl bg-red-800 p-6 flex flex-col gap-5 text-white">
                <div className="flex flex-col items-center gap-3 pt-1">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
                    <X className="h-8 w-8" strokeWidth={2.5} />
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold">Пропуск недействителен</p>
                    <p className="mt-1 text-sm text-white/65">
                      {result.reason === 'not_yet_active'
                        ? `Будет доступен с ${formatDateTime(result.available_from)}`
                        : REASON_SUBTITLES[result.reason]}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-white/10 divide-y divide-white/15 text-sm">
                  <div className="flex justify-between gap-4 px-4 py-2.5">
                    <span className="uppercase text-[11px] tracking-wide text-white/55 shrink-0">Причина</span>
                    <span className="font-medium text-right">
                      {result.reason === 'not_yet_active' ? 'Ещё не активен' : REASON_LABELS[result.reason]}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleScanAgain}
                  className="mt-auto rounded-xl bg-white px-4 py-3 text-sm font-semibold text-red-800 hover:bg-red-50 transition-colors"
                >
                  Проверить следующий
                </button>
              </div>
            )
          ) : (
            <div className={cn(
              'rounded-2xl border border-default bg-surface p-6',
              'flex items-center justify-center min-h-56 lg:min-h-0',
            )}>
              <p className="text-sm text-secondary text-center">
                {isSubmitting ? 'Проверяем пропуск...' : 'Результат проверки появится здесь'}
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
      <div>
        <h1 className="text-2xl font-bold text-primary">Проверка QR-пропуска</h1>
        <p className="mt-1 text-sm text-secondary">Введите QR-код вручную или отсканируйте его камерой.</p>
      </div>

      <section className="rounded-xl border border-default bg-raised p-4 sm:p-5">
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3">
          <label className="block text-sm text-secondary">
            QR-код (UUID)
            <input
              type="text"
              value={qrCode}
              onChange={(event) => setQrCode(event.target.value)}
              placeholder="например, 64fdbf4f-465e-40e6-8ef4-3f3c96d34ac6"
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {isSubmitting ? 'Проверка...' : 'Проверить'}
            </button>
            {isCameraActive ? (
              <button
                type="button"
                onClick={stopCamera}
                className="rounded-lg border border-amber-700 bg-warning-subtle px-4 py-2 text-sm font-medium text-warning-badge"
              >
                Остановить камеру
              </button>
            ) : (
              <button
                type="button"
                onClick={startCamera}
                className="rounded-lg border border-default px-4 py-2 text-sm font-medium text-primary hover:bg-hover"
              >
                Сканировать камерой
              </button>
            )}
          </div>
        </form>
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        {cameraError ? <p className="mt-3 text-sm text-warning">{cameraError}</p> : null}
      </section>

      {isCameraActive ? (
        <section className="rounded-xl border border-default bg-raised p-4 sm:p-5">
          <p className="mb-3 text-sm text-secondary">Наведите камеру на QR-код пропуска.</p>
          <video
            ref={videoRef}
            className="aspect-video w-full rounded-lg border border-default bg-black object-cover"
            autoPlay
            playsInline
            muted
          />
        </section>
      ) : null}

      {result ? (
        <section className="rounded-xl border border-default bg-raised p-4 sm:p-5">
          {result.valid ? (
            <div className="space-y-2 text-sm text-secondary">
              <p className="font-semibold text-success">Пропуск валиден</p>
              <p><span className="text-secondary">Гость:</span> {result.guest_name}</p>
              <p><span className="text-secondary">Цель:</span> {result.purpose || '—'}</p>
              <p><span className="text-secondary">Пригласил:</span> {result.invited_by}</p>
              <p>
                <span className="text-secondary">Период:</span>{' '}
                {fmtDate(result.valid_from)} — {fmtDate(result.valid_until)}
              </p>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-rose-300">Пропуск невалиден</p>
              <p className="text-secondary">
                {result.reason === 'not_yet_active'
                  ? `Пропуск будет доступен с ${formatDateTime(result.available_from)}`
                  : REASON_LABELS[result.reason]}
              </p>
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}
