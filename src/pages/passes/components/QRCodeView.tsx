import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { usePassCountdown } from '@/pages/passes/hooks/usePassCountdown';

interface QRCodeViewProps {
  qrImage: string | null | undefined;
  validFrom: string;
}

export function QRCodeView({ qrImage, validFrom }: QRCodeViewProps) {
  const { t } = useTranslation();
  const { countdownDisplay, isNowActive } = usePassCountdown(validFrom);
  const activatesAt = new Date(validFrom);
  const isNotYetActive = !isNowActive && activatesAt > new Date();

  return (
    <section className="rounded-xl border border-default bg-raised p-5">
      <h2 className="mb-3 text-lg font-semibold text-primary">QR-код</h2>
      {qrImage ? (
        <div className="relative inline-block">
          <img src={qrImage} alt="QR guest pass" className="max-h-80 rounded-lg border border-default bg-surface p-3" />
          {isNotYetActive ? (
            <div className={cn(
              'absolute inset-0 flex flex-col items-center justify-center gap-1',
              'bg-black/60 backdrop-blur-sm rounded-lg'
            )}>
              <span className="text-sm text-secondary">Будет активен в</span>
              <span className="font-semibold text-primary">
                {activatesAt.toLocaleString('ru-RU')}
              </span>
              <span className="font-mono text-xs text-blue-400">
                Активен через {countdownDisplay}
              </span>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="text-sm text-secondary">QR изображение недоступно.</div>
      )}
    </section>
  );
}
