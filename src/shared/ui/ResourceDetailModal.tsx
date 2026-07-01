import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bookmark, Building2, ChevronLeft, ChevronRight, Clock, Users, X } from 'lucide-react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  BOOKING_RESOURCE_CATALOG_STATUS,
  RESOURCE_EQUIPMENT_LABEL_KEYS,
  RESOURCE_TYPE_LABEL_KEYS,
  RESOURCE_TYPES,
  type ResourceEquipmentKey,
} from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { resolveMediaUrl } from '@/shared/lib/mediaUrl';
import type { BookingResourceDetail, BookingResourceListItem } from '@/shared/types';

const statusDotClass: Record<string, string> = {
  [BOOKING_RESOURCE_CATALOG_STATUS.FREE]: 'bg-emerald-400',
  [BOOKING_RESOURCE_CATALOG_STATUS.OCCUPIED]: 'bg-rose-400',
  [BOOKING_RESOURCE_CATALOG_STATUS.BLOCKED]: 'bg-slate-400',
  [BOOKING_RESOURCE_CATALOG_STATUS.SOON_AVAILABLE]: 'bg-amber-400',
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  [BOOKING_RESOURCE_CATALOG_STATUS.FREE]: 'bg-emerald-600/90',
  [BOOKING_RESOURCE_CATALOG_STATUS.OCCUPIED]: 'bg-rose-600/90',
  [BOOKING_RESOURCE_CATALOG_STATUS.BLOCKED]: 'bg-slate-700/90',
  [BOOKING_RESOURCE_CATALOG_STATUS.SOON_AVAILABLE]: 'bg-amber-600/90',
};

export interface ResourceDetailModalProps {
  resource: BookingResourceListItem | null;
  open: boolean;
  onClose: () => void;
  onBook: (resource: BookingResourceListItem) => void;
}

export function ResourceDetailModal({ resource, open, onClose, onBook }: ResourceDetailModalProps) {
  const { t } = useTranslation();
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    setPhotoIdx(0);
  }, [resource?.id]);

  const { data: panelDetail } = useQuery({
    queryKey: ['booking-resource-panel-detail', resource?.id],
    enabled: open && resource != null,
    staleTime: 60_000,
    queryFn: () =>
      apiClient
        .get<BookingResourceDetail>(API.bookings.resources.detail(String(resource!.id)))
        .then((r) => r.data),
  });

  if (!open || !resource) return null;

  const photos = resource.photos;
  const legacySrc =
    resource.photo_url ??
    (resource.photo ? resolveMediaUrl(resource.photo) ?? resource.photo : null);
  const hasSrc = photos.length > 0 || legacySrc;

  const currentSrc =
    photos.length > 0
      ? (photos[photoIdx]?.image_url ?? resolveMediaUrl(photos[photoIdx]?.image) ?? photos[photoIdx]?.image)
      : legacySrc;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative z-10 flex w-full max-w-xl max-h-[88vh] flex-col overflow-hidden rounded-3xl bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 rounded-full bg-black/50 p-1.5 text-white backdrop-blur-sm hover:bg-black/75 transition-colors"
          aria-label={t('common.close')}
        >
          <X size={18} />
        </button>

        {!hasSrc ? (
          <div className="flex shrink-0 aspect-[16/9] items-center justify-center bg-raised">
            <Bookmark className="h-12 w-12 text-muted" />
          </div>
        ) : (
          <div className="relative shrink-0 aspect-[16/9] bg-black overflow-hidden">
            <img key={photoIdx} src={currentSrc ?? ''} alt="" className="h-full w-full object-cover" />

            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

            <div className="absolute bottom-3 left-4 flex items-center gap-2">
              <span className="rounded-full border border-white/20 bg-black/50 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                {t(RESOURCE_TYPE_LABEL_KEYS[resource.type])}
              </span>
              <span
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white',
                  STATUS_BADGE_CLASS[resource.status] ?? 'bg-black/60',
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', statusDotClass[resource.status] ?? 'bg-slate-400')} />
                {t(`catalog.status.${resource.status}`, { defaultValue: resource.status })}
              </span>
            </div>

            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white hover:bg-black/80 transition-colors"
                  aria-label={t('catalog.photoPrev')}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white hover:bg-black/80 transition-colors"
                  aria-label={t('catalog.photoNext')}
                >
                  <ChevronRight size={18} />
                </button>

                <div className="absolute bottom-3 right-4 flex items-center gap-1">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPhotoIdx(i)}
                      aria-label={t('catalog.photoGoTo', { n: i + 1 })}
                      className={cn(
                        'h-1.5 rounded-full transition-all',
                        i === photoIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/75',
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
          <div>
            <h2 className="text-xl font-bold text-primary">{resource.name}</h2>
            <p className="mt-0.5 text-sm text-secondary">
              {t('catalog.floor')} {resource.floor_number}
              {resource.zone ? ` · ${resource.zone}` : ''}
              {resource.parking_type ? ` · ${resource.parking_type === 'vip' ? 'VIP' : 'Regular'}` : ''}
              {resource.capsule_zone ? ` · ${resource.capsule_zone === 'quiet' ? 'Quiet' : 'Regular'}` : ''}
            </p>
          </div>

          {panelDetail === undefined ? (
            <p className="text-sm text-muted italic">{t('catalog.detailLoading')}</p>
          ) : panelDetail.description ? (
            <p className="text-sm text-secondary leading-relaxed">{panelDetail.description}</p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <div className="rounded-xl border border-default bg-raised px-4 py-2.5 text-center">
              <p className="text-xs text-muted">{t('catalog.capacityLabel')}</p>
              <p className="mt-0.5 text-lg font-semibold text-primary">{resource.capacity}</p>
            </div>
            {resource.is_hot_desk && resource.type === RESOURCE_TYPES.DESK && (
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-center">
                <p className="text-xs text-blue-400">{t('catalog.modeLabel')}</p>
                <p className="mt-0.5 text-sm font-semibold text-blue-300">{t('catalog.hotDesk')}</p>
              </div>
            )}
          </div>

          {resource.equipment && resource.type === RESOURCE_TYPES.MEETING_ROOM && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted uppercase tracking-wide">
                {t('catalog.equipment')}
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {Object.entries(resource.equipment)
                  .filter(([, v]) => v)
                  .map(([key]) => (
                    <li
                      key={key}
                      className="rounded-lg border border-default bg-hover px-2.5 py-1 text-xs font-medium text-secondary"
                    >
                      {t(RESOURCE_EQUIPMENT_LABEL_KEYS[key as ResourceEquipmentKey]) ?? key}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-default px-5 py-4">
          {resource.status === BOOKING_RESOURCE_CATALOG_STATUS.OCCUPIED ? (
            <button
              type="button"
              disabled
              className="inline-flex w-full cursor-not-allowed justify-center rounded-xl bg-raised px-4 py-3 text-sm font-semibold text-muted"
            >
              {t('catalog.occupied')}
            </button>
          ) : resource.status === BOOKING_RESOURCE_CATALOG_STATUS.BLOCKED ? (
            <button
              type="button"
              disabled
              className="inline-flex w-full cursor-not-allowed justify-center rounded-xl bg-raised px-4 py-3 text-sm font-semibold text-muted"
            >
              {t('catalog.blocked')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onBook(resource);
                onClose();
              }}
              className="inline-flex w-full justify-center rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/30 transition-colors"
            >
              {t('catalog.book')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── CompanyResourceDetailModal ────────────────────────────────────────────────
// Follows CLAUDE.md modal standard. Used in the company hub Resources tab.

interface CompanyResourceDetailModalProps {
  /** null = modal closed */
  resource: BookingResourceListItem | null;
  onClose: () => void;
  /** If provided, show brand Book button; else render Link to /bookings/new?resource={id} */
  onBook?: () => void;
}

const infoRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 13,
  color: 'var(--text-secondary)',
};

export function CompanyResourceDetailModal({
  resource,
  onClose,
  onBook,
}: CompanyResourceDetailModalProps) {
  const { t } = useTranslation();

  const { data: detail, isLoading } = useQuery({
    queryKey: ['resource-detail-modal', resource?.id],
    queryFn: () =>
      apiClient
        .get<BookingResourceDetail>(API.bookings.resources.detail(String(resource!.id)))
        .then((r) => r.data),
    enabled: resource != null,
    staleTime: 60_000,
  });

  if (resource == null) return null;

  // Resolve photo: prefer full detail photos, then list-item photos/photo field
  const photoSrc =
    detail?.photos?.[0]?.image_url ??
    detail?.photos?.[0]?.image ??
    resource.photos?.[0]?.image_url ??
    resource.photos?.[0]?.image ??
    (resource.photo ? resolveMediaUrl(resource.photo) ?? resource.photo : null);

  // Equipment entries where value is true
  const equipmentSource = detail?.equipment ?? resource.equipment;
  const equipmentEntries =
    equipmentSource != null
      ? (Object.entries(equipmentSource) as [string, boolean][]).filter(([, v]) => v)
      : [];
  const showEquipment = resource.type === RESOURCE_TYPES.MEETING_ROOM && equipmentEntries.length > 0;

  // Format available_at time
  const availableAt = resource.available_at ?? detail?.available_at;
  const formattedAvailableAt = availableAt
    ? new Date(availableAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="company-resource-detail-title"
    >
      <div className="relative w-full max-w-[560px] rounded-2xl border border-default bg-surface shadow-xl overflow-y-auto max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start justify-between px-[22px] pt-[18px] pb-[14px]">
          <div className="min-w-0 pr-4">
            <h2
              id="company-resource-detail-title"
              className="text-base font-semibold text-primary tracking-[-0.015em]"
            >
              {resource.name}
            </h2>
            <div className="mt-1">
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 9px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 600,
                  background:
                    resource.status === BOOKING_RESOURCE_CATALOG_STATUS.FREE
                      ? 'var(--status-free-bg, rgba(52,211,153,0.12))'
                      : resource.status === BOOKING_RESOURCE_CATALOG_STATUS.OCCUPIED
                        ? 'var(--status-busy-bg, rgba(239,68,68,0.12))'
                        : resource.status === BOOKING_RESOURCE_CATALOG_STATUS.SOON_AVAILABLE
                          ? 'var(--status-soon-bg, rgba(245,158,11,0.12))'
                          : 'var(--bg-raised)',
                  color:
                    resource.status === BOOKING_RESOURCE_CATALOG_STATUS.FREE
                      ? 'var(--status-free-text, var(--success))'
                      : resource.status === BOOKING_RESOURCE_CATALOG_STATUS.OCCUPIED
                        ? 'var(--status-busy-text, var(--danger))'
                        : resource.status === BOOKING_RESOURCE_CATALOG_STATUS.SOON_AVAILABLE
                          ? 'var(--status-soon-text, #f59e0b)'
                          : 'var(--text-muted)',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background:
                      resource.status === BOOKING_RESOURCE_CATALOG_STATUS.FREE
                        ? 'var(--success)'
                        : resource.status === BOOKING_RESOURCE_CATALOG_STATUS.OCCUPIED
                          ? 'var(--danger)'
                          : resource.status === BOOKING_RESOURCE_CATALOG_STATUS.SOON_AVAILABLE
                            ? '#f59e0b'
                            : 'var(--text-muted)',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                {t(
                  resource.status === BOOKING_RESOURCE_CATALOG_STATUS.FREE
                    ? 'companyHub.resourceStatusFree'
                    : resource.status === BOOKING_RESOURCE_CATALOG_STATUS.OCCUPIED
                      ? 'companyHub.resourceStatusOccupied'
                      : resource.status === BOOKING_RESOURCE_CATALOG_STATUS.SOON_AVAILABLE
                        ? 'companyHub.resourceStatusSoon'
                        : 'companyHub.resourceStatusInactive',
                )}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-secondary hover:bg-raised hover:text-primary focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
            aria-label={t('common.close')}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-[22px] pb-0 flex flex-col gap-4">

          {/* Photo */}
          <div
            style={{
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              height: 200,
              background: 'var(--bg-raised)',
              flexShrink: 0,
            }}
          >
            {photoSrc ? (
              <img
                src={photoSrc}
                alt={resource.name}
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
          </div>

          {/* Description */}
          {isLoading ? (
            <div
              style={{
                height: 13,
                width: '80%',
                borderRadius: 4,
                background: 'var(--bg-raised)',
              }}
            />
          ) : detail?.description ? (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              {detail.description}
            </p>
          ) : null}

          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {/* Type chip */}
            <div style={infoRow}>
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
                {t(RESOURCE_TYPE_LABEL_KEYS[resource.type] ?? resource.type)}
              </span>
            </div>

            {/* Capacity */}
            {resource.capacity > 0 && (
              <div style={infoRow}>
                <Users size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span>
                  {resource.capacity} {t('common.peopleShort')}
                </span>
              </div>
            )}

            {/* Floor + zone */}
            {(resource.floor_number != null || resource.zone) && (
              <div style={infoRow}>
                <Building2 size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span>
                  {resource.floor_number != null
                    ? `${t('companyHub.resourceDetailFloor')} ${resource.floor_number}`
                    : ''}
                  {resource.floor_number != null && resource.zone ? ' · ' : ''}
                  {resource.zone ?? ''}
                </span>
              </div>
            )}

            {/* Soon available time */}
            {resource.status === BOOKING_RESOURCE_CATALOG_STATUS.SOON_AVAILABLE &&
              formattedAvailableAt && (
                <div style={infoRow}>
                  <Clock size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span>{formattedAvailableAt}</span>
                </div>
              )}
          </div>

          {/* Equipment */}
          {showEquipment && (
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'var(--text-muted)',
                  marginBottom: 6,
                }}
              >
                {t('catalog.equipment')}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {equipmentEntries.map(([key]) => (
                  <span
                    key={key}
                    style={{
                      fontSize: 11,
                      padding: '3px 8px',
                      borderRadius: 20,
                      border: '1px solid var(--border)',
                      background: 'var(--bg-raised)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {t(RESOURCE_EQUIPMENT_LABEL_KEYS[key as ResourceEquipmentKey])}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-2 border-t border-[color:var(--border-faint)] px-[22px] pt-[14px] pb-[18px] mt-3">
          <Link
            to={`/bookings/resources/${resource.id}`}
            style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}
          >
            {t('companyHub.resourceSchedule')} →
          </Link>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-4 text-sm font-medium text-secondary hover:bg-raised rounded-[var(--radius-sm)] transition-colors"
            >
              {t('common.close')}
            </button>

            {onBook ? (
              <button
                type="button"
                onClick={onBook}
                className="inline-flex items-center gap-1.5 h-8 px-4 text-sm font-medium rounded-[var(--radius-sm)] text-white bg-[color:var(--brand)] hover:opacity-90 transition-opacity"
              >
                {t('companyHub.resourceBook')}
              </button>
            ) : (
              <Link
                to={`/bookings/new?resource=${resource.id}`}
                className="inline-flex items-center gap-1.5 h-8 px-4 text-sm font-medium rounded-[var(--radius-sm)] text-white bg-[color:var(--brand)] hover:opacity-90 transition-opacity"
                style={{ textDecoration: 'none' }}
              >
                {t('companyHub.resourceBook')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
