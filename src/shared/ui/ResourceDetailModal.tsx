import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bookmark, ChevronLeft, ChevronRight, X } from 'lucide-react';
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
              {t('catalog.floor')} {resource.floor}
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
