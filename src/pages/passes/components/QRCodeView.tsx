import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { fmtDateTime } from '@/shared/lib/formatDate';
import { usePassCountdown } from '@/pages/passes/hooks/usePassCountdown';

interface QRCodeViewProps {
  qrImage: string | null | undefined;
  validFrom: string;
}

export function QRCodeView({ qrImage, validFrom }: QRCodeViewProps) {
  const { t, i18n } = useTranslation();
  void i18n.language; // triggers re-render on locale change
  const { countdownDisplay, isNowActive } = usePassCountdown(validFrom);
  const activatesAt = new Date(validFrom);
  const isNotYetActive = !isNowActive && activatesAt > new Date();

  return (
    <section className="rounded-xl border border-default bg-raised p-5">
      <h2 className="mb-3 text-lg font-semibold text-primary">{t('passes.qrCodeSection')}</h2>
      {qrImage ? (
        <div className="relative inline-block">
          <img src={qrImage} alt="QR guest pass" className="max-h-80 rounded-lg border border-default bg-surface p-3" />
          {isNotYetActive ? (
            <div className={cn(
              'absolute inset-0 flex flex-col items-center justify-center gap-1',
              'bg-black/60 backdrop-blur-sm rounded-lg'
            )}>
              <span className="text-sm text-secondary">{t('passes.qrWillBeActiveFrom')}</span>
              <span className="font-semibold text-primary">
                {fmtDateTime(activatesAt)}
              </span>
              <span className="font-mono text-xs text-blue-400">
                {t('passes.qrActiveIn', { countdown: countdownDisplay })}
              </span>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="text-sm text-secondary">{t('passes.qrImageUnavailable')}</div>
      )}
    </section>
  );
}
