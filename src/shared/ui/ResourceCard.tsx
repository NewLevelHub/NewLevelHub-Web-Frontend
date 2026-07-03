import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

import {
  RESOURCE_TYPE_LABEL_KEYS,
  RESOURCE_TYPES,
  BOOKING_RESOURCE_CATALOG_STATUS,
  RESOURCE_EQUIPMENT_LABEL_KEYS,
  RESOURCE_EQUIPMENT_KEYS,
  type ResourceType,
  type BookingResourceCatalogStatus,
  type ResourceEquipmentKey,
} from '@/shared/config/constants';
import { resolveMediaUrl } from '@/shared/lib/mediaUrl';
import type { BookingResourceListItem } from '@/shared/types';

// ── Status badge helpers ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  BookingResourceCatalogStatus,
  { dotColor: string; bg: string; textColor: string; labelKey: string }
> = {
  [BOOKING_RESOURCE_CATALOG_STATUS.FREE]: {
    dotColor: 'var(--success)',
    bg: 'var(--status-free-bg, rgba(52,211,153,0.12))',
    textColor: 'var(--status-free-text, var(--success))',
    labelKey: 'companyHub.resourceStatusFree',
  },
  [BOOKING_RESOURCE_CATALOG_STATUS.OCCUPIED]: {
    dotColor: 'var(--danger)',
    bg: 'var(--status-busy-bg, rgba(239,68,68,0.12))',
    textColor: 'var(--status-busy-text, var(--danger))',
    labelKey: 'companyHub.resourceStatusOccupied',
  },
  [BOOKING_RESOURCE_CATALOG_STATUS.SOON_AVAILABLE]: {
    dotColor: '#f59e0b',
    bg: 'var(--status-soon-bg, rgba(245,158,11,0.12))',
    textColor: 'var(--status-soon-text, #f59e0b)',
    labelKey: 'companyHub.resourceStatusSoon',
  },
  [BOOKING_RESOURCE_CATALOG_STATUS.BLOCKED]: {
    dotColor: 'var(--text-muted)',
    bg: 'var(--bg-raised)',
    textColor: 'var(--text-muted)',
    labelKey: 'companyHub.resourceStatusInactive',
  },
};

export function ResourceStatusBadge({ status }: { status: BookingResourceCatalogStatus | undefined }) {
  const { t } = useTranslation();
  const resolvedStatus = status ?? BOOKING_RESOURCE_CATALOG_STATUS.FREE;
  const cfg = STATUS_CONFIG[resolvedStatus] ?? STATUS_CONFIG[BOOKING_RESOURCE_CATALOG_STATUS.FREE];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 9px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        background: cfg.bg,
        color: cfg.textColor,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: cfg.dotColor,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      {t(cfg.labelKey)}
    </span>
  );
}

// ── Resource card ─────────────────────────────────────────────────────────────

export interface ResourceCardProps {
  resource: BookingResourceListItem;
  /** Called when the image/card header is clicked — used by catalog to open detail panel */
  onCardClick?: () => void;
  /** Called when "Забронировать" is clicked — used by catalog to open BookingModal.
   *  If not provided, "Забронировать" renders as a Link to /bookings/new?resource={id} */
  onBook?: () => void;
  /** Called when "Подробнее" is clicked — opens a detail modal.
   *  If not provided, "Подробнее" renders as a Link to /bookings/resources/{id} */
  onDetails?: () => void;
  /** Highlight card with a subtle brand border — used by catalog for "my company" resources */
  isMyCompany?: boolean;
  /** Show equipment chips in the card body (meeting rooms only) — catalog only */
  showEquipment?: boolean;
  /** If true, the "Забронировать" button is shown as disabled with "Недоступно" text */
  isOccupied?: boolean;
}

export function ResourceCard({
  resource: r,
  onCardClick,
  onBook,
  onDetails,
  isMyCompany = false,
  showEquipment = false,
  isOccupied = false,
}: ResourceCardProps) {
  const { t } = useTranslation();

  const photoSrc =
    r.photos?.[0]?.image_url ??
    r.photos?.[0]?.image ??
    (r.photo ? resolveMediaUrl(r.photo) ?? r.photo : null);

  const metaParts: string[] = [];
  if (r.floor_number != null) metaParts.push(`${t('catalog.floor')} ${r.floor_number}`);
  if (r.zone) metaParts.push(r.zone);
  if (r.capacity) metaParts.push(`${r.capacity} ${t('catalog.people')}`);

  const cardBorder = isMyCompany ? '1px solid var(--brand)' : '1px solid var(--border)';

  const photoArea = (
    <div
      style={{
        position: 'relative',
        height: 140,
        background: 'var(--bg-raised)',
        flexShrink: 0,
        overflow: 'hidden',
        cursor: onCardClick ? 'pointer' : undefined,
      }}
      onClick={onCardClick}
    >
      {photoSrc ? (
        <img
          src={photoSrc}
          alt={r.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage:
              'repeating-linear-gradient(45deg, var(--border-faint) 0, var(--border-faint) 1px, transparent 0, transparent 50%)',
            backgroundSize: '12px 12px',
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
            {t('companyHub.resourceNoPhoto')}
          </span>
        </div>
      )}

      {/* Status badge top-right */}
      <div style={{ position: 'absolute', top: 8, right: 8 }}>
        <ResourceStatusBadge status={r.status} />
      </div>
    </div>
  );

  const bookButton = isOccupied ? (
    <button
      type="button"
      disabled
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        height: 30,
        borderRadius: 'var(--radius-sm)',
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--text-muted)',
        background: 'var(--bg-raised)',
        border: 'none',
        cursor: 'not-allowed',
        opacity: 0.7,
      }}
    >
      {t('catalog.statusOccupied', { defaultValue: 'Недоступно' })}
    </button>
  ) : onBook ? (
    <button
      type="button"
      onClick={onBook}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        height: 30,
        borderRadius: 'var(--radius-sm)',
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--text-on-brand, #fff)',
        background: 'var(--brand)',
        border: 'none',
        cursor: 'pointer',
        transition: 'opacity 0.15s',
      }}
    >
      {t('companyHub.resourceBook')}
    </button>
  ) : (
    <Link
      to={`/bookings/new?resource=${r.id}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        height: 30,
        borderRadius: 'var(--radius-sm)',
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--text-on-brand, #fff)',
        background: 'var(--brand)',
        textDecoration: 'none',
        transition: 'opacity 0.15s',
      }}
    >
      {t('companyHub.resourceBook')}
    </Link>
  );

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: cardBorder,
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {photoArea}

      {/* Card body */}
      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
          {r.name}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              padding: '2px 7px',
              borderRadius: 20,
              background: 'var(--bg-raised)',
              color: 'var(--text-secondary)',
            }}
          >
            {t(RESOURCE_TYPE_LABEL_KEYS[r.type as ResourceType] ?? r.type)}
          </span>
          {metaParts.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {metaParts.join(' · ')}
            </span>
          )}
        </div>

        {/* Equipment chips — only for meeting rooms when showEquipment is true */}
        {showEquipment &&
          r.type === RESOURCE_TYPES.MEETING_ROOM &&
          r.equipment != null && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
              {(Object.entries(r.equipment) as [string, boolean][])
                .filter(([, v]) => v)
                .slice(0, 3)
                .map(([key]) => (
                  <span
                    key={key}
                    style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      borderRadius: 4,
                      border: '1px solid var(--border)',
                      background: 'var(--bg-raised)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {t(
                      RESOURCE_EQUIPMENT_LABEL_KEYS[key as ResourceEquipmentKey] ??
                        RESOURCE_EQUIPMENT_LABEL_KEYS[RESOURCE_EQUIPMENT_KEYS[0]],
                    )}
                  </span>
                ))}
            </div>
          )}
      </div>

      {/* Card footer with actions */}
      <div
        style={{
          borderTop: '1px solid var(--border-faint)',
          padding: '10px 14px',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
      >
        {bookButton}
        {onDetails ? (
          <button
            type="button"
            onClick={onDetails}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 30,
              padding: '0 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              background: 'var(--bg-raised)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {t('companyHub.resourceDetails')}
          </button>
        ) : (
          <Link
            to={`/bookings/resources/${r.id}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 30,
              padding: '0 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              background: 'var(--bg-raised)',
              border: '1px solid var(--border)',
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            {t('companyHub.resourceDetails')}
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Resource card skeleton ────────────────────────────────────────────────────

export function ResourceCardSkeleton() {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ height: 140, background: 'var(--bg-raised)' }} />
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ height: 14, width: '70%', borderRadius: 4, background: 'var(--bg-raised)' }} />
        <div style={{ height: 20, width: '45%', borderRadius: 10, background: 'var(--bg-raised)' }} />
      </div>
      <div style={{ borderTop: '1px solid var(--border-faint)', padding: '10px 14px', display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, height: 30, borderRadius: 'var(--radius-sm)', background: 'var(--bg-raised)' }} />
        <div style={{ width: 64, height: 30, borderRadius: 'var(--radius-sm)', background: 'var(--bg-raised)' }} />
      </div>
    </div>
  );
}
