import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Download, Loader2, QrCode } from 'lucide-react';

import { API } from '@/shared/api/endpoints';
import {
  BOOKING_STATUSES,
  CAPSULE_ZONE_LABEL_KEYS,
  RESOURCE_TYPES,
  type CapsuleZone,
} from '@/shared/config/constants';
import { fmtDateTime } from '@/shared/lib/formatDate';
import { cn } from '@/shared/lib/cn';
import type { Booking } from '@/shared/types';
import { usePassCountdown } from '@/pages/passes/hooks/usePassCountdown';

interface BookingQRPanelProps {
  booking: Booking;
  className?: string;
}

export function shouldShowBookingQrPanel(booking: Booking): boolean {
  return (
    booking.resource_type === RESOURCE_TYPES.CAPSULE
    && booking.status === BOOKING_STATUSES.CONFIRMED
    && Boolean(booking.qr_code)
  );
}

function CountdownBanner({ booking }: { booking: Booking }) {
  const { t } = useTranslation();
  const { isNowActive, countdownDisplay } = usePassCountdown(booking.start_time);
  const now = Date.now();
  const startMs = new Date(booking.start_time).getTime();
  const endMs = new Date(booking.end_time).getTime();
  const isNotYetActive = !isNowActive && startMs > now;
  const isExpired = now > endMs;

  if (isExpired) {
    return (
      <div className="w-full rounded-[var(--radius-sm)] bg-[color:var(--bg-raised)] px-3 py-2 text-[12px] font-medium text-[color:var(--text-muted)] text-center">
        {t('booking.qrPanel.countdownExpired')}
      </div>
    );
  }

  if (isNowActive) {
    return (
      <div className="w-full flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-[color:var(--status-free-bg)] px-3 py-2 text-[12px] font-medium text-[color:var(--status-free-text)]">
        <Clock size={13} />
        {t('booking.qrPanel.countdownActive')}
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
        {t('booking.qrPanel.countdownPending', { hours, minutes })}
      </div>
    );
  }

  return null;
}

export function BookingQRPanel({ booking, className }: BookingQRPanelProps) {
  const { t } = useTranslation();
  const [isDownloading, setIsDownloading] = useState(false);

  if (!shouldShowBookingQrPanel(booking)) {
    return null;
  }

  const qrImageUrl = booking.qr_image
    ?? (booking.qr_code ? API.bookings.reservations.qrImage(booking.qr_code) : null);

  const zoneKey = booking.capsule_zone
    ? CAPSULE_ZONE_LABEL_KEYS[booking.capsule_zone as CapsuleZone]
    : null;

  async function handleDownload() {
    if (!qrImageUrl) return;
    setIsDownloading(true);
    try {
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `booking-qr-${booking.id}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(qrImageUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <section
      aria-label={t('booking.qrPanel.title')}
      className={cn(
        'rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-5 shadow-sm',
        'flex flex-col items-center gap-4',
        className,
      )}
    >
      <div className="w-full text-center">
        <div className="inline-flex items-center gap-2 text-[color:var(--text-primary)]">
          <QrCode size={18} />
          <h2 className="text-base font-semibold">{t('booking.qrPanel.title')}</h2>
        </div>
        <p className="mt-1 text-[12px] text-[color:var(--text-muted)]">
          {booking.resource_name}
          {zoneKey ? ` · ${t(zoneKey)}` : null}
        </p>
        <p className="mt-0.5 text-[12px] text-[color:var(--text-muted)]">
          {fmtDateTime(booking.start_time)} — {fmtDateTime(booking.end_time)}
        </p>
      </div>

      <div className="flex justify-center">
        {qrImageUrl ? (
          <img
            src={qrImageUrl}
            alt={t('booking.qrPanel.imageAlt')}
            className="h-[180px] w-[180px] rounded-lg border border-[color:var(--border)] bg-white p-2"
          />
        ) : (
          <div className="flex h-[180px] w-[180px] items-center justify-center rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-raised)] text-[12px] text-[color:var(--text-muted)]">
            —
          </div>
        )}
      </div>

      <div className="font-mono text-[11px] text-[color:var(--text-muted)] tracking-[0.05em] bg-[color:var(--bg-raised)] px-2.5 py-1.5 rounded-[var(--radius-sm)] select-all text-center w-full">
        {booking.qr_code}
      </div>

      <button
        type="button"
        onClick={() => void handleDownload()}
        disabled={!qrImageUrl || isDownloading}
        className={cn(
          'h-[32px] px-3 text-[12px] font-medium rounded-[var(--radius-sm)]',
          'inline-flex items-center justify-center gap-1.5 transition-colors w-full',
          'border border-[color:var(--border)] text-[color:var(--text-secondary)]',
          'hover:bg-[color:var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        {isDownloading ? (
          <>
            <Loader2 size={13} className="animate-spin" />
            {t('booking.qrPanel.downloading')}
          </>
        ) : (
          <>
            <Download size={13} />
            {t('booking.qrPanel.download')}
          </>
        )}
      </button>

      <CountdownBanner booking={booking} />
    </section>
  );
}
