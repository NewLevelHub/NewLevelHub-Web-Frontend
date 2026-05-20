import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import type { PassValidationResponse } from '@/shared/types';
import { getApiError } from '@/shared/lib/getApiError';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const REASON_LABELS: Record<import('@/shared/types').PassValidationFailure['reason'], string> = {
  expired: 'Срок действия пропуска истек',
  revoked: 'Пропуск отозван',
  already_used: 'Пропуск уже использован',
  not_found: 'Пропуск не найден',
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

const CAMERA_CONSTRAINTS_CHAIN: MediaStreamConstraints[] = [
  {
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  },
  {
    video: {
      facingMode: { ideal: 'user' },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  },
  { video: true, audio: false },
];

export default function PassValidatePage() {
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
      const response = await apiClient.post<PassValidationResponse>(API.passes.validate, {
        qr_code: code,
      });
      setResult(response.data);
    } catch (validationError) {
      setResult(null);
      setError(getApiError(validationError).message);
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
      setCameraError('В этом браузере недоступен доступ к камере. Используйте ручной ввод.');
      return;
    }

    setCameraError('');
    setError('');
    setResult(null);
    stopCamera();
    setIsCameraActive(true);
  }, [stopCamera]);

  useEffect(() => {
    if (!isCameraActive || !videoRef.current) {
      return;
    }

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
          if (cancelled) {
            controls.stop();
            return;
          }
          controlsRef.current = controls;
          return;
        } catch {
          /* try next constraint */
        }
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
                className="rounded-lg border border-amber-700 bg-warning-subtle px-4 py-2 text-sm font-medium text-warning-badge hover:bg-warning-subtle"
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
              <p>
                <span className="text-secondary">Гость:</span> {result.guest_name}
              </p>
              <p>
                <span className="text-secondary">Цель:</span> {result.purpose || '—'}
              </p>
              <p>
                <span className="text-secondary">Пригласил:</span> {result.invited_by}
              </p>
              <p>
                <span className="text-secondary">Период:</span>{' '}
                {new Date(result.valid_from).toLocaleString()} - {new Date(result.valid_until).toLocaleString()}
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
