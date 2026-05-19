import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Bookmark, Building2, CalendarDays, ChevronDown, ChevronUp, Search, Settings2 } from 'lucide-react';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

import { BookingModal } from '@/shared/ui/BookingModal';

dayjs.extend(utc);
dayjs.extend(timezone);

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  BOOKING_RESOURCE_CATALOG_STATUS,
  RESOURCE_TYPES,
  RESOURCE_TYPE_LABELS,
  RESOURCE_EQUIPMENT_KEYS,
  RESOURCE_EQUIPMENT_LABELS,
  STAFF_UI_PREFIX,
  USER_ROLES,
  type ResourceEquipmentKey,
  type ResourceType,
} from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { resolveMediaUrl } from '@/shared/lib/mediaUrl';
import { cn } from '@/shared/lib/cn';
import type { BookingResourceDetail, BookingResourceListItem, PaginatedResponse } from '@/shared/types';
import { ResourceWeekMiniTimeline } from '@/pages/bookings/components/ResourceWeekMiniTimeline';

const PAGE_SIZE = 24;

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Все типы' },
  ...Object.values(RESOURCE_TYPES).map((t) => ({
    value: t,
    label: RESOURCE_TYPE_LABELS[t as ResourceType],
  })),
];

const ORDERING_OPTIONS: { value: string; label: string }[] = [
  { value: 'name', label: 'Название (А–Я)' },
  { value: '-name', label: 'Название (Я–А)' },
  { value: 'floor', label: 'Этаж ↑' },
  { value: '-floor', label: 'Этаж ↓' },
  { value: 'capacity', label: 'Вместимость ↑' },
  { value: '-capacity', label: 'Вместимость ↓' },
];

const STATUS_LABELS: Record<string, string> = {
  [BOOKING_RESOURCE_CATALOG_STATUS.FREE]: 'Свободен',
  [BOOKING_RESOURCE_CATALOG_STATUS.OCCUPIED]: 'Занят',
  [BOOKING_RESOURCE_CATALOG_STATUS.BLOCKED]: 'Заблокирован',
  [BOOKING_RESOURCE_CATALOG_STATUS.SOON_AVAILABLE]: 'Скоро свободен',
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  [BOOKING_RESOURCE_CATALOG_STATUS.FREE]: 'bg-emerald-600/90',
  [BOOKING_RESOURCE_CATALOG_STATUS.OCCUPIED]: 'bg-rose-600/90',
  [BOOKING_RESOURCE_CATALOG_STATUS.BLOCKED]: 'bg-slate-700/90',
  [BOOKING_RESOURCE_CATALOG_STATUS.SOON_AVAILABLE]: 'bg-amber-600/90',
};

function emptyEquipmentFilters(): Record<ResourceEquipmentKey, boolean> {
  return Object.fromEntries(
    RESOURCE_EQUIPMENT_KEYS.map((k) => [k, false]),
  ) as Record<ResourceEquipmentKey, boolean>;
}

/** Подписи и поля в сайдбаре в тёмной теме. */
const sbLabel = 'text-sm font-medium text-secondary';
const sbInput =
  'mt-1 w-full px-3 py-2 text-sm rounded-lg border border-default bg-surface text-primary placeholder:text-muted [color-scheme:dark]';
const sbSelect =
  'mt-1 w-full px-3 py-2 text-sm rounded-lg border border-default bg-surface text-primary [&>option]:bg-surface [&>option]:text-white';

function formatAvailableAt(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return null;
  }
}

export default function BookingCatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const preselectResourceId = Number(searchParams.get('resource'));
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [selectedResource, setSelectedResource] = useState<BookingResourceListItem | null>(null);
  const [expandedScheduleId, setExpandedScheduleId] = useState<number | null>(null);
  const autoOpenedForRef = useRef<number | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [floorFilter, setFloorFilter] = useState('');
  const [capacityMin, setCapacityMin] = useState('');
  const [capacityMax, setCapacityMax] = useState('');
  const [equipmentNeed, setEquipmentNeed] = useState(emptyEquipmentFilters);
  const [ordering, setOrdering] = useState('name');
  const [searchInput, setSearchInput] = useState('');
  const [availFromLocal, setAvailFromLocal] = useState('');
  const [availToLocal, setAvailToLocal] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const queryParams: Record<string, string | number> = { page, page_size: PAGE_SIZE, ordering };
  if (typeFilter) queryParams.type = typeFilter;
  if (floorFilter !== '' && !Number.isNaN(Number(floorFilter))) {
    queryParams.floor = Number(floorFilter);
  }
  if (debouncedSearch.trim()) queryParams.search = debouncedSearch.trim();
  const capMinN = Number(capacityMin);
  if (capacityMin !== '' && !Number.isNaN(capMinN)) queryParams.capacity_min = capMinN;
  const capMaxN = Number(capacityMax);
  if (capacityMax !== '' && !Number.isNaN(capMaxN)) queryParams.capacity_max = capMaxN;
  const equipTokens = RESOURCE_EQUIPMENT_KEYS.filter((k) => equipmentNeed[k]);
  if (equipTokens.length) queryParams.equipment = equipTokens.join(',');
  if (availFromLocal && availToLocal) {
    const fromDayjs = dayjs.tz(availFromLocal, 'Asia/Almaty');
    const toDayjs = dayjs.tz(availToLocal, 'Asia/Almaty');
    if (fromDayjs.isValid() && toDayjs.isValid() && fromDayjs.isBefore(toDayjs)) {
      queryParams.available_from = fromDayjs.format();
      queryParams.available_to = toDayjs.format();
    }
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['booking-resources', 'catalog', queryParams],
    queryFn: async () => {
      const { data: res } = await apiClient.get<PaginatedResponse<BookingResourceListItem>>(
        API.bookings.resources.list,
        { params: queryParams },
      );
      return res;
    },
    placeholderData: keepPreviousData,
  });

  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const results = data?.results ?? [];

  const myCompanyId =
    user?.role === USER_ROLES.COMPANY_ADMIN || user?.role === USER_ROLES.EMPLOYEE
      ? (user?.company_id ?? null)
      : null;

  const sortedResults = useMemo(() => {
    if (!myCompanyId) return results;
    return [
      ...results.filter((r) => r.assigned_company === myCompanyId),
      ...results.filter((r) => r.assigned_company !== myCompanyId),
    ];
  }, [results, myCompanyId]);

  const { data: preselectedResource } = useQuery({
    queryKey: ['booking-resource-detail-for-modal', preselectResourceId],
    queryFn: () =>
      apiClient
        .get<BookingResourceDetail>(API.bookings.resources.detail(String(preselectResourceId)))
        .then((r) => r.data),
    enabled: Number.isFinite(preselectResourceId) && preselectResourceId > 0,
  });

  useEffect(() => {
    if (!Number.isFinite(preselectResourceId) || preselectResourceId <= 0) {
      autoOpenedForRef.current = null;
      return;
    }
    if (autoOpenedForRef.current === preselectResourceId) return;
    const fromList = results.find((item) => item.id === preselectResourceId);
    if (fromList) {
      autoOpenedForRef.current = preselectResourceId;
      setSelectedResource(fromList);
      return;
    }
    if (preselectedResource) {
      autoOpenedForRef.current = preselectResourceId;
      setSelectedResource({
        id: preselectedResource.id,
        type: preselectedResource.type,
        name: preselectedResource.name,
        floor: preselectedResource.floor,
        zone: preselectedResource.zone,
        photo: preselectedResource.photo,
        photo_url: null,
        capacity: preselectedResource.capacity,
        equipment: preselectedResource.equipment,
        is_active: preselectedResource.is_active,
        is_hot_desk: preselectedResource.is_hot_desk,
        availability_days: preselectedResource.availability_days,
        parking_type: preselectedResource.parking_type,
        capsule_zone: preselectedResource.capsule_zone,
        assigned_company: preselectedResource.assigned_company,
        assigned_company_name: null,
        status: BOOKING_RESOURCE_CATALOG_STATUS.FREE,
        reason: null,
        available_at: null,
      });
    }
  }, [preselectResourceId, preselectedResource, results]);

  const equipmentFacetKeys = useMemo((): ResourceEquipmentKey[] => {
    const raw = data?.meeting_room_equipment_keys;
    if (!raw?.length) return [];
    const allowed = new Set<ResourceEquipmentKey>(RESOURCE_EQUIPMENT_KEYS);
    return raw.filter((k): k is ResourceEquipmentKey => allowed.has(k as ResourceEquipmentKey));
  }, [(data?.meeting_room_equipment_keys ?? []).slice().sort().join('|')]);

  useEffect(() => {
    // Пока нет ответа (смена страницы / новый queryKey), не трогаем чекбоксы — иначе [] фасетов сбрасывает всё.
    if (data === undefined) return;

    if (equipmentFacetKeys.length === 0) {
      setEquipmentNeed(emptyEquipmentFilters());
      return;
    }
    const allowed = new Set(equipmentFacetKeys);
    setEquipmentNeed((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const k of RESOURCE_EQUIPMENT_KEYS) {
        if (next[k] && !allowed.has(k)) {
          next[k] = false;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [equipmentFacetKeys, data]);

  useEffect(() => {
    setPage(1);
  }, [
    typeFilter,
    floorFilter,
    debouncedSearch,
    capacityMin,
    capacityMax,
    equipmentNeed,
    ordering,
    availFromLocal,
    availToLocal,
  ]);

  const resetFilters = () => {
    setTypeFilter('');
    setFloorFilter('');
    setCapacityMin('');
    setCapacityMax('');
    setEquipmentNeed(emptyEquipmentFilters());
    setOrdering('name');
    setSearchInput('');
    setAvailFromLocal('');
    setAvailToLocal('');
  };

  return (
    <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Каталог ресурсов</h1>
          <p className="mt-1 text-sm text-secondary">
            Подбор площадок и мест для бронирования. Фильтры слева, карточки справа.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {(user?.role === USER_ROLES.SUPERADMIN || user?.role === USER_ROLES.COMPANY_ADMIN) && (
            <Link
              to={`${STAFF_UI_PREFIX}/bookings`}
              className="inline-flex items-center gap-2 rounded-lg border border-default bg-raised px-3 py-2 text-sm font-medium text-secondary hover:bg-hover"
            >
              <ArrowLeft className="h-4 w-4" />
              Назад в бронирования (админ)
            </Link>
          )}
          {user?.role === USER_ROLES.SUPERADMIN && (
            <Link
              to="/resources"
              className="inline-flex items-center gap-2 rounded-lg border border-default bg-raised px-3 py-2 text-sm font-medium text-secondary hover:bg-hover"
            >
              <Settings2 className="h-4 w-4" />
              Управление ресурсами
            </Link>
          )}
          <Link
            to="/bookings/my"
            className="inline-flex items-center gap-2 rounded-lg border border-default bg-raised px-3 py-2 text-sm font-medium text-secondary hover:bg-hover"
          >
            Мои бронирования
          </Link>
          {(user?.role === USER_ROLES.SUPERADMIN
            || user?.role === USER_ROLES.COMPANY_ADMIN
            || user?.role === USER_ROLES.EMPLOYEE) && (
            <Link
              to="/bookings/recurring"
              className="inline-flex items-center gap-2 rounded-lg border border-default bg-raised px-3 py-2 text-sm font-medium text-secondary hover:bg-hover"
            >
              Рекуррентные брони
            </Link>
          )}
        </div>
      </div>

      {isError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 dark:border-red-800 bg-danger-subtle px-4 py-3 text-sm text-danger"
        >
          Не удалось загрузить каталог. Проверьте сеть и токен.
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside
          className={cn(
            'w-full shrink-0 rounded-2xl border border-default bg-raised p-4 text-secondary',
            'lg:w-80 lg:sticky lg:top-4',
          )}
        >
          <h2 className="text-sm font-semibold text-primary">Фильтры</h2>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className={sbLabel}>Поиск по названию</span>
              <div className="relative mt-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
                />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Например, Байтерек"
                  className={cn(
                    'w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-default bg-surface text-primary placeholder:text-muted',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500/20',
                  )}
                />
              </div>
            </label>

            <label className="block">
              <span className={sbLabel}>Тип</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={cn(sbSelect, 'focus:ring-2 focus:ring-blue-500/20 focus:outline-none')}
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className={sbLabel}>Этаж</span>
              <input
                type="number"
                value={floorFilter}
                onChange={(e) => setFloorFilter(e.target.value)}
                placeholder="Любой"
                className={cn(sbInput, 'focus:ring-2 focus:ring-blue-500/20 focus:outline-none')}
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="block min-w-0">
                <span className={sbLabel}>Вместимость от</span>
                <input
                  type="number"
                  min={1}
                  value={capacityMin}
                  onChange={(e) => setCapacityMin(e.target.value)}
                  placeholder="—"
                  className={cn(sbInput, 'px-2 focus:ring-2 focus:ring-blue-500/20 focus:outline-none')}
                />
              </label>
              <label className="block min-w-0">
                <span className={sbLabel}>до</span>
                <input
                  type="number"
                  min={1}
                  value={capacityMax}
                  onChange={(e) => setCapacityMax(e.target.value)}
                  placeholder="—"
                  className={cn(sbInput, 'px-2 focus:ring-2 focus:ring-blue-500/20 focus:outline-none')}
                />
              </label>
            </div>

            <fieldset className="min-w-0">
              <legend className={sbLabel}>Оборудование в переговорке</legend>
              {equipmentFacetKeys.length === 0 ? (
                <p className="mt-3 text-sm text-secondary">
                  Нет переговорок с оборудованием в этой выборке — смените фильтры или тип «Переговорка».
                </p>
              ) : (
                <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
                  {equipmentFacetKeys.map((key) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center gap-2 text-sm text-secondary"
                    >
                      <input
                        type="checkbox"
                        checked={equipmentNeed[key]}
                        onChange={() =>
                          setEquipmentNeed((prev) => ({ ...prev, [key]: !prev[key] }))
                        }
                        className="size-4 shrink-0 rounded border-default bg-surface text-brand focus:ring-blue-500/20"
                      />
                      {RESOURCE_EQUIPMENT_LABELS[key]}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>

            <div className="space-y-2 rounded-lg border border-default bg-surface/60 p-3">
              <span className={sbLabel}>Свободен в интервале</span>
              <p className="text-xs text-secondary">
                Укажите «с» и «до» (локальное время). Отфильтруются ресурсы без пересечений с
                бронированиями и блокировками.
              </p>
              <label className="block">
                <span className="text-xs text-secondary">С</span>
                <input
                  type="datetime-local"
                  value={availFromLocal}
                  onChange={(e) => setAvailFromLocal(e.target.value)}
                  className={cn(sbInput, 'focus:ring-2 focus:ring-blue-500/20 focus:outline-none')}
                />
              </label>
              <label className="block">
                <span className="text-xs text-secondary">До</span>
                <input
                  type="datetime-local"
                  value={availToLocal}
                  onChange={(e) => setAvailToLocal(e.target.value)}
                  className={cn(sbInput, 'focus:ring-2 focus:ring-blue-500/20 focus:outline-none')}
                />
              </label>
            </div>

            <label className="block">
              <span className={sbLabel}>Сортировка</span>
              <select
                value={ordering}
                onChange={(e) => setOrdering(e.target.value)}
                className={cn(sbSelect, 'focus:ring-2 focus:ring-blue-500/20 focus:outline-none')}
              >
                {ORDERING_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={resetFilters}
              className="w-full rounded-lg border border-default bg-surface py-2 text-sm font-medium text-secondary hover:bg-hover"
            >
              Сбросить
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          {isLoading ? (
            <div className="py-20 text-center text-sm text-secondary">Загрузка каталога…</div>
          ) : sortedResults.length === 0 ? (
            <div className="py-20 text-center text-sm text-secondary">Нет ресурсов по заданным условиям.</div>
          ) : (
            <ul className="grid gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {sortedResults.map((r) => {
                const imgSrc = resolveMediaUrl(r.photo_url ?? r.photo ?? '') ?? r.photo_url ?? r.photo ?? '';
                const statusLabel = STATUS_LABELS[r.status] ?? r.status;
                const badgeClass = STATUS_BADGE_CLASS[r.status] ?? 'bg-black/60';
                const whenFree = formatAvailableAt(r.available_at);
                const isMyCompany = myCompanyId !== null && r.assigned_company === myCompanyId;
                return (
                  <li key={r.id}>
                    <article
                      className={cn(
                        'h-full flex flex-col overflow-hidden rounded-2xl border bg-raised shadow-sm transition-all',
                        isMyCompany
                          ? 'border-indigo-500/40 hover:border-indigo-400/70 hover:shadow-indigo-900/30'
                          : 'border-default hover:border-blue-500/50 hover:shadow-indigo-900/20',
                        'hover:-translate-y-0.5',
                        !r.is_active && 'opacity-60',
                      )}
                    >
                      <div className="relative aspect-[16/10] bg-surface">
                        {imgSrc ? (
                          <img src={imgSrc} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Bookmark className="h-10 w-10 text-muted" />
                          </div>
                        )}
                        <span className="absolute left-2 top-2 rounded-full border border-white/15 bg-black/60 px-2 py-0.5 text-xs font-medium text-primary">
                          {RESOURCE_TYPE_LABELS[r.type]}
                        </span>
                        <span
                          className={cn(
                            'absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium text-primary',
                            badgeClass,
                          )}
                        >
                          {statusLabel}
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col gap-2 p-4">
                        <h2 className="font-semibold text-primary">{r.name}</h2>
                        {isMyCompany && (
                          <span className="inline-flex w-fit items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-500/15 px-2 py-0.5 text-xs font-medium text-indigo-300">
                            <Building2 size={10} />
                            Закреплён за вашей компанией
                          </span>
                        )}
                        <p className="text-xs text-secondary">
                          Этаж {r.floor}
                          {r.zone ? ` · ${r.zone}` : ''}
                          {r.parking_type ? ` · ${r.parking_type === 'vip' ? 'VIP' : 'Обычная'}` : ''}
                          {r.capsule_zone ? ` · ${r.capsule_zone === 'quiet' ? 'тихая зона' : 'обычная'}` : ''}
                        </p>
                        <p className="text-xs text-secondary">Вместимость: {r.capacity}</p>
                        {r.equipment && r.type === RESOURCE_TYPES.MEETING_ROOM && (
                          <ul className="flex flex-wrap gap-1">
                            {Object.entries(r.equipment)
                              .filter(([, v]) => v)
                              .map(([key]) => (
                                <li
                                  key={key}
                                  className="rounded border border-default bg-hover px-2 py-0.5 text-[10px] font-medium text-secondary"
                                >
                                  {RESOURCE_EQUIPMENT_LABELS[key as keyof typeof RESOURCE_EQUIPMENT_LABELS] ?? key}
                                </li>
                              ))}
                          </ul>
                        )}
                        {whenFree && r.status === BOOKING_RESOURCE_CATALOG_STATUS.SOON_AVAILABLE && (
                          <p className="text-xs text-warning">Освободится: {whenFree}</p>
                        )}
                        {r.status === BOOKING_RESOURCE_CATALOG_STATUS.BLOCKED && r.reason && (
                          <p className="text-xs text-slate-300">Причина блокировки: {r.reason}</p>
                        )}
                        {r.is_hot_desk && r.type === RESOURCE_TYPES.DESK && (
                          <span className="text-xs font-medium text-blue-300">Hot desk</span>
                        )}

                        {/* ── Weekly schedule toggle ── */}
                        <div className="border-t border-default/60 pt-2">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedScheduleId((prev) => (prev === r.id ? null : r.id))
                            }
                            className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1 text-xs font-medium text-secondary hover:bg-hover/50 hover:text-secondary transition-colors"
                          >
                            <span className="flex items-center gap-1.5">
                              <CalendarDays size={13} />
                              Расписание на неделю
                            </span>
                            {expandedScheduleId === r.id ? (
                              <ChevronUp size={13} />
                            ) : (
                              <ChevronDown size={13} />
                            )}
                          </button>

                          {expandedScheduleId === r.id && (
                            <div className="mt-2 rounded-lg border border-default/60 bg-surface/50 px-2 py-2">
                              <ResourceWeekMiniTimeline resourceId={r.id} />
                            </div>
                          )}
                        </div>

                        <div className="pt-1">
                          {r.status === BOOKING_RESOURCE_CATALOG_STATUS.OCCUPIED ? (
                            <button
                              type="button"
                              disabled
                              className="inline-flex w-full cursor-not-allowed justify-center rounded-lg bg-hover px-3 py-2 text-sm font-medium text-secondary"
                            >
                              Занят
                            </button>
                          ) : r.status === BOOKING_RESOURCE_CATALOG_STATUS.BLOCKED ? (
                            <button
                              type="button"
                              disabled
                              className="inline-flex w-full cursor-not-allowed justify-center rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-slate-300"
                            >
                              Заблокирован
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedResource(r)}
                              className="inline-flex w-full justify-center rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                              Забронировать
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}

          {totalPages > 1 && (
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-default px-4 py-2 text-sm text-secondary disabled:opacity-40"
              >
                Назад
              </button>
              <span className="self-center text-sm text-secondary">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-default px-4 py-2 text-sm text-secondary disabled:opacity-40"
              >
                Вперёд
              </button>
            </div>
          )}
        </div>
      </div>

      {selectedResource !== null && (
        <BookingModal
          resource={selectedResource}
          open={selectedResource !== null}
          onClose={() => {
            setSelectedResource(null);
            if (searchParams.has('resource')) {
              const next = new URLSearchParams(searchParams);
              next.delete('resource');
              setSearchParams(next, { replace: true });
            }
          }}
        />
      )}
    </main>
  );
}

function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    setDebounced(value);
  }, [value]);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(flush, ms);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value, ms, flush]);

  return debounced;
}
