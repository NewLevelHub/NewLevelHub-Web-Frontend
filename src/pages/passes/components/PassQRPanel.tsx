import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { QrCode, Download, Send, Clock, Loader2 } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { fmtDate, fmtTime } from '@/shared/lib/formatDate';
import { API } from '@/shared/api/endpoints';
import { PASS_STATUSES } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import type { GuestPass } from '@/shared/types';
import { usePassCountdown } from '@/pages/passes/hooks/usePassCountdown';

interface PassQRPanelProps {
  passId: number | null;
  onClose?: () => void;
}

function PanelSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 w-full animate-pulse">
      <div className="w-full space-y-1.5">
        <div className="h-4 w-2/3 rounded bg-[color:var(--bg-raised)]" />
        <div className="h-3 w-1/2 rounded bg-[color:var(--bg-raised)]" />
      </div>
      <div className="h-[180px] w-[180px] rounded-lg bg-[color:var(--bg-raised)]" />
      <div className="h-7 w-full rounded bg-[color:var(--bg-raised)]" />
      <div className="flex gap-2 w-full">
        <div className="h-8 flex-1 rounded bg-[color:var(--bg-raised)]" />
        <div className="h-8 flex-1 rounded bg-[color:var(--bg-raised)]" />
      </div>
      <div className="h-8 w-full rounded bg-[color:var(--bg-raised)]" />
    </div>
  );
}

function CountdownBanner({ pass }: { pass: GuestPass }) {
  const { t } = useTranslation();
  const { isNowActive, countdownDisplay } = usePassCountdown(pass.valid_from);
  const activatesAt = new Date(pass.valid_from);
  const isNotYetActive = !isNowActive && activatesAt > new Date();

  if (pass.status === PASS_STATUSES.USED) {
    return (
      <div className="w-full rounded-[var(--radius-sm)] bg-[color:var(--bg-raised)] px-3 py-2 text-[12px] font-medium text-[color:var(--text-muted)] text-center">
        {t('passes.qrPanel.countdownUsed')}
      </div>
    );
  }

  if (pass.status === PASS_STATUSES.EXPIRED || pass.status === PASS_STATUSES.REVOKED) {
    return (
      <div className="w-full rounded-[var(--radius-sm)] bg-[color:var(--bg-raised)] px-3 py-2 text-[12px] font-medium text-[color:var(--text-muted)] text-center">
        {t('passes.qrPanel.countdownExpired')}
      </div>
    );
  }

  if (isNowActive && pass.status === PASS_STATUSES.ACTIVE) {
    return (
      <div className="w-full flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-[color:var(--status-free-bg)] px-3 py-2 text-[12px] font-medium text-[color:var(--status-free-text)]">
        <Clock size={13} />
        {t('passes.qrPanel.countdownActive')}
      </div>
    );
  }

  if (isNotYetActive) {
    const parts = countdownDisplay.split(':');
    const hours = parts[0] ? parseInt(parts[0], 10) : 0;
    const minutes = parts[1] ? parseInt(parts[1], 10) : 0;
    return (
      <div className="w-full flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-[color:var(--status-free-bg)] px-3 py-2 text-[12px] font-medium text-[color:var(--status-free-text)]">
        <Clock size={13} />
        {t('passes.qrPanel.countdownPending', { hours, minutes })}
      </div>
    );
  }

  return null;
}

function PassQRContent({ pass }: { pass: GuestPass }) {
  const { t } = useTranslation();
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const visitDate = fmtDate(pass.valid_from);
  const visitTimeFrom = fmtTime(pass.valid_from);
  const visitTimeTo = fmtTime(pass.valid_until);

  function handleDownload() {
    if (!pass.qr_image) return;
    const link = document.createElement('a');
    link.href = pass.qr_image;
    link.download = `pass-qr-${pass.id}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function handleSendEmail() {
    setSendState('sending');
    try {
      await apiClient.post(API.passes.resend(String(pass.id)));
      setSendState('sent');
      setTimeout(() => setSendState('idle'), 3000);
    } catch {
      setSendState('error');
      setTimeout(() => setSendState('idle'), 3000);
    }
  }

  return (
    <>
      {/* Header */}
      <div className="w-full">
        <p className="text-[15px] font-semibold leading-tight text-[color:var(--text-primary)]">
          {pass.guest_name}
        </p>
        <p className="mt-0.5 text-[12px] text-[color:var(--text-muted)]">
          {visitDate} · {visitTimeFrom} — {visitTimeTo}
        </p>
      </div>

      {/* QR image */}
      <div className="flex justify-center">
        {pass.qr_image ? (
          <img
            src={pass.qr_image}
            alt={t('passes.qrPanel.guestQR')}
            className="h-[180px] w-[180px] rounded-lg border border-[color:var(--border)] bg-white p-2"
          />
        ) : (
          <div className="flex h-[180px] w-[180px] items-center justify-center rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-raised)] text-[12px] text-[color:var(--text-muted)]">
            —
          </div>
        )}
      </div>

      {/* Pass code */}
      <div className="font-mono text-[11px] text-[color:var(--text-muted)] tracking-[0.05em] bg-[color:var(--bg-raised)] px-2.5 py-1.5 rounded-[var(--radius-sm)] select-all text-center w-full">
        {pass.qr_code}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 w-full">
        <button
          type="button"
          onClick={handleDownload}
          disabled={!pass.qr_image}
          className={cn(
            'h-[32px] px-3 text-[12px] font-medium rounded-[var(--radius-sm)]',
            'inline-flex items-center justify-center gap-1.5 transition-colors flex-1',
            'border border-[color:var(--border)] text-[color:var(--text-secondary)]',
            'hover:bg-[color:var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          <Download size={13} />
          {t('passes.qrPanel.download')}
        </button>
        <button
          type="button"
          onClick={handleSendEmail}
          disabled={sendState === 'sending' || sendState === 'sent'}
          className={cn(
            'h-[32px] px-3 text-[12px] font-medium rounded-[var(--radius-sm)]',
            'inline-flex items-center justify-center gap-1.5 transition-colors flex-1',
            sendState === 'sent'
              ? 'bg-[color:var(--success)] text-white opacity-90'
              : 'bg-[color:var(--brand)] text-white hover:opacity-90',
            (sendState === 'sending' || sendState === 'sent') && 'cursor-not-allowed',
          )}
        >
          {sendState === 'sending' ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              {t('passes.qrPanel.sending')}
            </>
          ) : sendState === 'sent' ? (
            t('passes.qrPanel.sent')
          ) : (
            <>
              <Send size={13} />
              {t('passes.qrPanel.sendEmail')}
            </>
          )}
        </button>
      </div>

      {/* Countdown banner */}
      <CountdownBanner pass={pass} />
    </>
  );
}

export function PassQRPanel({ passId }: PassQRPanelProps) {
  const { t } = useTranslation();

  const { data: pass, isLoading, isError } = useQuery({
    queryKey: ['guest-pass-detail', String(passId)],
    enabled: passId !== null,
    queryFn: async () => {
      const response = await apiClient.get<GuestPass>(API.passes.detail(String(passId)));
      return response.data;
    },
  });

  return (
    <div
      role="complementary"
      aria-label={t('passes.qrPanel.guestQR')}
      className={cn(
        'bg-[color:var(--bg-surface)] border border-[color:var(--border)]',
        'rounded-[var(--radius-lg)] shadow-[var(--shadow-card)]',
        'p-4 flex flex-col items-center gap-4 sticky top-4',
        'self-start',
      )}
    >
      {passId === null ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-[color:var(--text-muted)] w-full">
          <QrCode className="w-10 h-10 opacity-30" />
          <p className="text-[13px] text-center">{t('passes.qrPanel.selectHint')}</p>
        </div>
      ) : isLoading ? (
        <PanelSkeleton />
      ) : isError || !pass ? (
        <div className="py-6 text-[13px] text-danger text-center w-full">
          {t('passes.loadError')}
        </div>
      ) : (
        <PassQRContent pass={pass} />
      )}
    </div>
  );
}
