import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { BOOKING_RESOURCE_CATALOG_STATUS, RESOURCE_TYPE_LABELS, type ResourceType } from '@/shared/config/constants';
import { resolveMediaUrl } from '@/shared/lib/mediaUrl';
import { cn } from '@/shared/lib/cn';
import type { BookingResourceDetail, ResourceScheduleSlot } from '@/shared/types';

import { ResourceDayTimeline } from '@/pages/bookings/components/ResourceDayTimeline';

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
  const { id } = useParams<{ id: string }>();
  const resourceId = id ? Number(id) : NaN;
  const [selectedDay, setSelectedDay] = useState(() => localIsoDate(new Date()));

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
        <p className="text-sm text-red-600">Некорректный идентификатор ресурса.</p>
      </main>
    );
  }

  if (detailLoading) {
    return (
      <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8 max-w-3xl mx-auto">
        <p className="text-sm text-gray-500">Загрузка…</p>
      </main>
    );
  }

  if (detailError || !detail) {
    return (
      <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8 max-w-3xl mx-auto space-y-3">
        <p className="text-sm text-red-600">Ресурс не найден или нет доступа.</p>
        <Link to="/bookings/catalog" className="text-sm text-blue-600 hover:underline">
          В каталог
        </Link>
      </main>
    );
  }

  const imgSrc = resolveMediaUrl(detail.photo ?? '') ?? detail.photo ?? '';

  return (
    <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8 max-w-3xl mx-auto space-y-6">
      <Link
        to="/bookings/catalog"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Каталог
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt=""
            className="w-full sm:w-48 rounded-xl object-cover aspect-[4/3] border border-gray-100"
          />
        ) : null}
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">{detail.name}</h1>
          <p className="text-sm text-gray-600">
            {RESOURCE_TYPE_LABELS[detail.type as ResourceType]} · этаж {detail.floor}
            {detail.zone ? ` · ${detail.zone}` : ''}
          </p>
          {detail.description ? (
            <p className="text-sm text-gray-600 pt-1">{detail.description}</p>
          ) : null}
        </div>
      </div>

      {detail.status === BOOKING_RESOURCE_CATALOG_STATUS.SOON_AVAILABLE && (
        <div className="bg-amber-500/15 border border-amber-500/30 rounded-lg px-4 py-2 flex items-center">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-2 shrink-0" aria-hidden="true" />
          <span className="text-amber-400 text-sm">
            Скоро освободится
            {detail.available_at
              ? ` · ${new Date(detail.available_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}`
              : ''}
          </span>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Расписание</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSelectedDay((d) => addDays(d, -1))}
              className={cn(
                'p-2 rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm',
                'hover:bg-gray-50 hover:text-gray-900',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
              )}
              aria-label="Предыдущий день"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <input
              type="date"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className={cn(
                'rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
              )}
            />
            <button
              type="button"
              onClick={() => setSelectedDay((d) => addDays(d, 1))}
              className={cn(
                'p-2 rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm',
                'hover:bg-gray-50 hover:text-gray-900',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
              )}
              aria-label="Следующий день"
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
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
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
            <p className="text-xs text-gray-500">
              Красным — бронирования, янтарным — блокировки. Свободное время — светлая полоса.
            </p>
          </>
        )}
      </div>

      <div>
        <Link
          to={`/bookings/new?resource=${detail.id}`}
          className="inline-flex justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Забронировать
        </Link>
      </div>
    </main>
  );
}
