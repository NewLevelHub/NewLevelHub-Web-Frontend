import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dateLocaleTag } from '@/shared/lib/localeFormat';
import { fmtTime } from '@/shared/lib/formatDate';
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Bookmark, Building2, ChevronLeft, ChevronRight } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  BOOKING_RESOURCE_CATALOG_STATUS,
  RESOURCE_EQUIPMENT_LABEL_KEYS,
  RESOURCE_TYPE_LABEL_KEYS,
  type ResourceEquipmentKey,
  type ResourceType,
} from '@/shared/config/constants';
import { resolveMediaUrl } from '@/shared/lib/mediaUrl';
import { cn } from '@/shared/lib/cn';
import type { BookingResourceDetail, ResourceScheduleSlot } from '@/shared/types';

import { ResourceDayTimeline } from '@/pages/bookings/components/ResourceDayTimeline';

const STATUS_BADGE_CLASS: Record<string, string> = {
  [BOOKING_RESOURCE_CATALOG_STATUS.FREE]: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  [BOOKING_RESOURCE_CATALOG_STATUS.OCCUPIED]: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  [BOOKING_RESOURCE_CATALOG_STATUS.BLOCKED]: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  [BOOKING_RESOURCE_CATALOG_STATUS.SOON_AVAILABLE]: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
};

function localIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const next = new Date(y, m - 1, d + delta);
  return localIsoDate(next);
}

export default function BookingResourceSchedulePage() {
  const { t, i18n } = useTranslation();
  const dateLocale = dateLocaleTag(i18n.language);
  const { id } = useParams<{ id: string }>();
  const resourceId = id ? Number(id) : NaN;
  const [selectedDay, setSelectedDay] = useState(() => localIsoDate(new Date()));
  const [photoIdx, setPhotoIdx] = useState(0);

  const weekAnchors = useMemo(() => {
    const [y, m, d] = selectedDay.split('-').map(Number);
    const mid = new Date(y, m - 1, d);
    const monday = new Date(mid);
    monday.setDate(mid.getDate() - ((mid.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const x = new Date(monday);
      x.setDate(monday.getDate() + i);
      return localIsoDate(x);
    });
  }, [selectedDay]);

  const { data: detail, isLoading: detailLoading, isError: detailError } = useQuery({
    queryKey: ['booking-resource', resourceId],
    enabled: Number.isFinite(resourceId),
    queryFn: async () => {
      const { data } = await apiClient.get<BookingResourceDetail>(
        API.bookings.resources.detail(String(resourceId)),
      );
      return data;
    },
  });

  const { data: daySlots = [], isLoading: scheduleLoading } = useQuery({
    queryKey: ['booking-resource-schedule', resourceId, selectedDay],
    enabled: Number.isFinite(resourceId),
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await apiClient.get<ResourceScheduleSlot[]>(
        API.bookings.resources.schedule(String(resourceId)),
        { params: { date: selectedDay } },
      );
      return data;
    },
  });

  if (!Number.isFinite(resourceId)) {
    return (
      <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8 max-w-3xl mx-auto">
        <p className="text-sm text-red-600">{t('resources.list.invalidId')}</p>
      </main>
    );
  }

  if (detailLoading) {
    return (
      <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8 max-w-3xl mx-auto">
        <p className="text-sm text-muted">{t('common.loading')}</p>
      </main>
    );
  }

  if (detailError || !detail) {
    return (
      <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8 max-w-3xl mx-auto space-y-3">
        <p className="text-sm text-red-600">{t('resources.list.notFound')}</p>
        <Link to="/bookings/catalog" className="text-sm text-blue-600 hover:underline">{t('common.goToCatalog')}</Link>
      </main>
    );
  }

  const photos = detail.photos ?? [];
  const legacySrc = detail.photo ? (resolveMediaUrl(detail.photo) ?? detail.photo) : null;
  const currentPhotoSrc =
    photos.length > 0
      ? (photos[photoIdx]?.image_url ?? resolveMediaUrl(photos[photoIdx]?.image) ?? photos[photoIdx]?.image)
      : legacySrc;

  const status = detail.status;
  const statusLabel = status ? t(`catalog.status.${status}`) : null;
  const statusClass = status ? (STATUS_BADGE_CLASS[status] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/30') : null;

  const isBookable =
    status !== BOOKING_RESOURCE_CATALOG_STATUS.OCCUPIED &&
    status !== BOOKING_RESOURCE_CATALOG_STATUS.BLOCKED &&
    detail.is_active;

  const activeEquipment = detail.equipment
    ? Object.entries(detail.equipment).filter(([, v]) => v).map(([k]) => k as ResourceEquipmentKey)
    : [];

  return (
    <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8 max-w-3xl mx-auto space-y-6">
      <Link
        to="/bookings/catalog"
        className="inline-flex items-center gap-2 text-sm font-medium text-secondary hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('catalog.title')}
      </Link>

      {/* Photo slider */}
      <div className="relative w-full overflow-hidden rounded-2xl bg-raised aspect-[16/9]">
        {currentPhotoSrc ? (
          <img key={photoIdx} src={currentPhotoSrc} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Bookmark className="h-14 w-14 text-muted" />
          </div>
        )}

        {/* gradient + badges */}
        {currentPhotoSrc && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
        )}
        <div className="absolute bottom-3 left-4 flex items-center gap-2">
          <span className="rounded-full border border-white/20 bg-black/50 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
            {t(RESOURCE_TYPE_LABEL_KEYS[detail.type as ResourceType])}
          </span>
          {statusLabel && (
            <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm', statusClass)}>
              {statusLabel}
            </span>
          )}
        </div>

        {/* arrows */}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white hover:bg-black/80 transition-colors"
              aria-label={t('resources.list.prevPhoto')}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white hover:bg-black/80 transition-colors"
              aria-label={t('resources.list.nextPhoto')}
            >
              <ChevronRight size={20} />
            </button>

            {/* dots */}
            <div className="absolute bottom-3 right-4 flex items-center gap-1">
              {photos.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPhotoIdx(i)}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === photoIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/75',
                  )}
                  aria-label={t('resources.list.photoN', { n: i + 1 })}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Name + meta */}
      <div>
        <h1 className="text-2xl font-bold text-primary">{detail.name}</h1>
        <p className="mt-1 text-sm text-secondary">
          {t('common.floor', { floor: detail.floor_number })}
          {detail.zone ? ` · ${detail.zone}` : ''}
          {detail.parking_type ? ` · ${t(`common.parkingType.${detail.parking_type}`)}` : ''}
          {detail.capsule_zone ? ` · ${t(`common.capsuleZone.${detail.capsule_zone}`)}` : ''}
        </p>
        {detail.assigned_company_name && (
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/15 px-2.5 py-0.5 text-xs font-medium text-indigo-300">
            <Building2 size={11} />
            {detail.assigned_company_name}
          </span>
        )}
      </div>

      {/* Description */}
      {detail.description && (
        <p className="text-sm text-secondary leading-relaxed">{detail.description}</p>
      )}

      {/* Key info grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-default bg-raised p-3">
          <p className="text-xs text-muted">{t('common.type')}</p>
          <p className="mt-0.5 text-sm font-semibold text-primary">
            {t(RESOURCE_TYPE_LABEL_KEYS[detail.type as ResourceType])}
          </p>
        </div>
        <div className="rounded-xl border border-default bg-raised p-3">
          <p className="text-xs text-muted">{t('catalog.capacityLabel')}</p>
          <p className="mt-0.5 text-sm font-semibold text-primary">{detail.capacity}</p>
        </div>
        {statusLabel && (
          <div className="rounded-xl border border-default bg-raised p-3">
            <p className="text-xs text-muted">{t('common.status')}</p>
            <p className={cn('mt-0.5 text-sm font-semibold', status === BOOKING_RESOURCE_CATALOG_STATUS.FREE ? 'text-emerald-400' : status === BOOKING_RESOURCE_CATALOG_STATUS.OCCUPIED ? 'text-rose-400' : status === BOOKING_RESOURCE_CATALOG_STATUS.BLOCKED ? 'text-slate-400' : 'text-amber-400')}>
              {statusLabel}
            </p>
          </div>
        )}
        {detail.is_hot_desk && (
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3">
            <p className="text-xs text-blue-400">{t('catalog.modeLabel')}</p>
            <p className="mt-0.5 text-sm font-semibold text-blue-300">Hot desk</p>
          </div>
        )}
      </div>

      {/* Soon available banner */}
      {status === BOOKING_RESOURCE_CATALOG_STATUS.SOON_AVAILABLE && detail.available_at && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-amber-400" aria-hidden="true" />
          <p className="text-sm text-amber-300">
            {t('resources.list.freeAt', {
              time: fmtTime(detail.available_at),
            })}
          </p>
        </div>
      )}

      {/* Equipment */}
      {activeEquipment.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{t('catalog.equipment')}</p>
          <ul className="flex flex-wrap gap-1.5">
            {activeEquipment.map((key) => (
              <li
                key={key}
                className="rounded-lg border border-default bg-raised px-2.5 py-1 text-xs font-medium text-secondary"
              >
                {t(RESOURCE_EQUIPMENT_LABEL_KEYS[key]) ?? key}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Schedule */}
      <div className="rounded-2xl border border-default bg-surface p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-primary">{t('resources.list.schedule')}</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSelectedDay((d) => addDays(d, -1))}
              className={cn(
                'p-2 rounded-lg border border-default bg-surface text-secondary shadow-sm',
                'hover:bg-raised hover:text-primary',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
              )}
              aria-label={t('resources.list.prevDay')}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <input
              type="date"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              lang={dateLocale}
              className={cn(
                'rounded-lg border border-default bg-surface px-2 py-1.5 text-sm text-primary',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
              )}
            />
            <button
              type="button"
              onClick={() => setSelectedDay((d) => addDays(d, 1))}
              className={cn(
                'p-2 rounded-lg border border-default bg-surface text-secondary shadow-sm',
                'hover:bg-raised hover:text-primary',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
              )}
              aria-label={t('resources.list.nextDay')}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {weekAnchors.map((iso) => {
            const active = iso === selectedDay;
            const [, mm, dd] = iso.split('-');
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelectedDay(iso)}
                className={cn(
                  'rounded-lg px-2 py-1 text-xs font-medium border',
                  active
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-surface text-secondary border-default hover:bg-raised',
                )}
              >
                {dd}.{mm}
              </button>
            );
          })}
        </div>

        {scheduleLoading ? (
          <div className="animate-pulse space-y-2" aria-hidden="true">
            <div className="h-14 rounded-lg bg-gray-200" />
            <div className="flex justify-between px-0.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-3 w-8 rounded bg-gray-200" />
              ))}
            </div>
          </div>
        ) : (
          <>
            <ResourceDayTimeline dayDate={selectedDay} slots={daySlots} />
            <p className="text-xs text-muted">{t('resources.list.timelineLegend')}</p>
          </>
        )}
      </div>

      {/* Book button */}
      <div>
        {isBookable ? (
          <Link
            to={`/bookings/new?resource=${detail.id}`}
            className="inline-flex justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >{t('catalog.book')}</Link>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex cursor-not-allowed justify-center rounded-xl bg-hover px-6 py-3 text-sm font-semibold text-secondary"
          >
            {status === BOOKING_RESOURCE_CATALOG_STATUS.BLOCKED ? t('catalog.status.blocked') : t('catalog.status.occupied')}
          </button>
        )}
      </div>
    </main>
  );
}
