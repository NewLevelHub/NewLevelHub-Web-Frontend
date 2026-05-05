import { cn } from '@/shared/lib/cn';
import { usePassCountdown } from '@/pages/passes/hooks/usePassCountdown';

interface QRCodeViewProps {
  qrImage: string | null | undefined;
  validFrom: string;
}

export function QRCodeView({ qrImage, validFrom }: QRCodeViewProps) {
  const { countdownDisplay, isNowActive } = usePassCountdown(validFrom);
  const activatesAt = new Date(validFrom);
  const isNotYetActive = !isNowActive && activatesAt > new Date();

  return (
    <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
      <h2 className="mb-3 text-lg font-semibold text-white">QR-код</h2>
      {qrImage ? (
        <div className="relative inline-block">
          <img src={qrImage} alt="QR guest pass" className="max-h-80 rounded-lg border border-gray-700 bg-white p-3" />
          {isNotYetActive ? (
            <div className={cn(
              'absolute inset-0 flex flex-col items-center justify-center gap-1',
              'bg-black/60 backdrop-blur-sm rounded-lg'
            )}>
              <span className="text-sm text-gray-300">Будет активен в</span>
              <span className="font-semibold text-white">
                {activatesAt.toLocaleString('ru-RU')}
              </span>
              <span className="font-mono text-xs text-blue-400">
                Активен через {countdownDisplay}
              </span>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="text-sm text-gray-400">QR изображение недоступно.</div>
      )}
    </section>
  );
}
