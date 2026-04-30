import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import type { PassValidationResponse } from '@/shared/types';
import { getApiErrorMessage } from '@/shared/lib/apiError';

type DetectedBarcode = { rawValue?: string };
type BarcodeDetectorLike = {
  detect: (image: ImageBitmapSource | ImageData) => Promise<DetectedBarcode[]>;
};
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;
type CameraConstraints = MediaStreamConstraints;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const REASON_LABELS: Record<Exclude<PassValidationResponse, { valid: true }>['reason'], string> = {
  expired: 'Срок действия пропуска истек',
  revoked: 'Пропуск отозван',
  already_used: 'Пропуск уже использован',
  not_found: 'Пропуск не найден',
};

export default function PassValidatePage() {
  const [qrCode, setQrCode] = useState('');
  const [result, setResult] = useState<PassValidationResponse | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const scanInProgressRef = useRef(false);

  const hasBarcodeDetector = useMemo(
    () => typeof window !== 'undefined' && 'BarcodeDetector' in window,
    [],
  );

  const stopCamera = useCallback(() => {
    if (scanTimerRef.current) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  async function submitValidation(code: string) {
    setIsSubmitting(true);
    setError('');

    try {
      const response = await apiClient.post<PassValidationResponse>(API.passes.validate, {
        qr_code: code,
      });
      setResult(response.data);
    } catch (validationError) {
      setResult(null);
      setError(getApiErrorMessage(validationError, 'Не удалось выполнить проверку QR.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  const startScanLoop = useCallback(() => {
    if (scanTimerRef.current) {
      window.clearInterval(scanTimerRef.current);
    }
    scanTimerRef.current = window.setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || !detectorRef.current || scanInProgressRef.current) {
        return;
      }
      scanInProgressRef.current = true;

      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context || video.videoWidth === 0 || video.videoHeight === 0) {
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = context.getImageData(0, 0, canvas.width, canvas.height);
        const barcodes = await detectorRef.current.detect(image);
        const value = barcodes[0]?.rawValue?.trim();

        if (value && UUID_RE.test(value)) {
          setQrCode(value);
          stopCamera();
          await submitValidation(value);
        }
      } catch {
        // Ignore frame-level scanning errors and continue scanning.
      } finally {
        scanInProgressRef.current = false;
      }
    }, 700);
  }, [stopCamera]);

  const attachStreamToVideo = useCallback(async () => {
    if (!videoRef.current || !streamRef.current) {
      return;
    }
    const video = videoRef.current;
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = streamRef.current;

    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error('Failed to load camera stream into video'));
      };
      const timer = window.setTimeout(() => {
        cleanup();
        reject(new Error('Camera stream metadata loading timeout'));
      }, 3000);
      const cleanup = () => {
        window.clearTimeout(timer);
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onError);
      };
      video.addEventListener('loadedmetadata', onLoaded);
      video.addEventListener('error', onError);
    });

    await video.play();
    startScanLoop();
  }, [startScanLoop]);

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

  const getCameraStream = useCallback(async () => {
    const constraintsChain: CameraConstraints[] = [
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

    let lastError: unknown = null;
    for (const constraints of constraintsChain) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError ?? new Error('No camera stream available');
  }, []);

  const startCamera = useCallback(async () => {
    if (!hasBarcodeDetector) {
      setCameraError('Ваш браузер не поддерживает сканирование QR. Используйте ручной ввод.');
      return;
    }

    setCameraError('');
    setError('');
    setResult(null);
    stopCamera();

    try {
      if (!detectorRef.current) {
        const BarcodeDetectorImpl = (window as Window & { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
        if (!BarcodeDetectorImpl) {
          setCameraError('Ваш браузер не поддерживает сканирование QR. Используйте ручной ввод.');
          return;
        }
        detectorRef.current = new BarcodeDetectorImpl({ formats: ['qr_code'] });
      }

      const stream = await getCameraStream();
      streamRef.current = stream;
      setIsCameraActive(true);
    } catch {
      stopCamera();
      setCameraError('Не удалось получить доступ к камере. Проверьте разрешения браузера.');
    }
  }, [getCameraStream, hasBarcodeDetector, stopCamera]);

  useEffect(() => {
    if (!isCameraActive || !streamRef.current || !videoRef.current) {
      return;
    }
    void attachStreamToVideo().catch(() => {
      stopCamera();
      setCameraError('Не удалось отобразить видео с камеры.');
    });
  }, [attachStreamToVideo, isCameraActive, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  return (
    <main className="mx-auto max-w-3xl space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Проверка QR-пропуска</h1>
        <p className="mt-1 text-sm text-gray-400">Введите QR-код вручную или отсканируйте его камерой.</p>
      </div>

      <section className="rounded-xl border border-gray-700 bg-gray-800 p-4 sm:p-5">
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3">
          <label className="block text-sm text-gray-300">
            QR-код (UUID)
            <input
              type="text"
              value={qrCode}
              onChange={(event) => setQrCode(event.target.value)}
              placeholder="например, 64fdbf4f-465e-40e6-8ef4-3f3c96d34ac6"
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {isSubmitting ? 'Проверка...' : 'Проверить'}
            </button>
            {isCameraActive ? (
              <button
                type="button"
                onClick={stopCamera}
                className="rounded-lg border border-amber-700 bg-amber-900/30 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-900/50"
              >
                Остановить камеру
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void startCamera()}
                className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
              >
                Сканировать камерой
              </button>
            )}
          </div>
        </form>
        {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
        {cameraError ? <p className="mt-3 text-sm text-amber-300">{cameraError}</p> : null}
      </section>

      {isCameraActive ? (
        <section className="rounded-xl border border-gray-700 bg-gray-800 p-4 sm:p-5">
          <p className="mb-3 text-sm text-gray-300">Наведите камеру на QR-код пропуска.</p>
          <video
            ref={videoRef}
            className="aspect-video w-full rounded-lg border border-gray-700 bg-black object-cover"
            autoPlay
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />
        </section>
      ) : null}

      {result ? (
        <section className="rounded-xl border border-gray-700 bg-gray-800 p-4 sm:p-5">
          {result.valid ? (
            <div className="space-y-2 text-sm text-gray-200">
              <p className="font-semibold text-emerald-300">Пропуск валиден</p>
              <p>
                <span className="text-gray-400">Гость:</span> {result.guest_name}
              </p>
              <p>
                <span className="text-gray-400">Цель:</span> {result.purpose || '—'}
              </p>
              <p>
                <span className="text-gray-400">Пригласил:</span> {result.invited_by}
              </p>
              <p>
                <span className="text-gray-400">Период:</span>{' '}
                {new Date(result.valid_from).toLocaleString()} - {new Date(result.valid_until).toLocaleString()}
              </p>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-rose-300">Пропуск невалиден</p>
              <p className="text-gray-300">{REASON_LABELS[result.reason]}</p>
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}
