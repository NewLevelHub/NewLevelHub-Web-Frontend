import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Bookmark, Search, Settings2 } from 'lucide-react';

import { BookingModal } from '@/shared/ui/BookingModal';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  BOOKING_RESOURCE_CATALOG_STATUS,
  RESOURCE_TYPES,
  RESOURCE_TYPE_LABELS,
  RESOURCE_EQUIPMENT_KEYS,
  RESOURCE_EQUIPMENT_LABELS,
  USER_ROLES,
  type ResourceEquipmentKey,
  type ResourceType,
} from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { resolveMediaUrl } from '@/shared/lib/mediaUrl';
import { cn } from '@/shared/lib/cn';
import type { BookingResourceListItem, PaginatedResponse } from '@/shared/types';

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
  [BOOKING_RESOURCE_CATALOG_STATUS.SOON_AVAILABLE]: 'Скоро свободен',
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  [BOOKING_RESOURCE_CATALOG_STATUS.FREE]: 'bg-emerald-600/90',
  [BOOKING_RESOURCE_CATALOG_STATUS.OCCUPIED]: 'bg-rose-600/90',
  [BOOKING_RESOURCE_CATALOG_STATUS.SOON_AVAILABLE]: 'bg-amber-600/90',
};

function emptyEquipmentFilters(): Record<ResourceEquipmentKey, boolean> {
  return Object.fromEntries(
    RESOURCE_EQUIPMENT_KEYS.map((k) => [k, false]),
  ) as Record<ResourceEquipmentKey, boolean>;
}

/** Подписи и поля в сайдбаре — явный тёмный текст (в т.ч. при тёмной теме ОС). */
const sbLabel = 'text-sm font-medium text-gray-900';
const sbInput =
  'mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500';
const sbSelect =
  'mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 [&>option]:bg-white [&>option]:text-gray-900';

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
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [selectedResource, setSelectedResource] = useState<BookingResourceListItem | null>(null);
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
    const fromMs = new Date(availFromLocal).getTime();
    const toMs = new Date(availToLocal).getTime();
    if (!Number.isNaN(fromMs) && !Number.isNaN(toMs) && fromMs < toMs) {
      queryParams.available_from = new Date(availFromLocal).toISOString();
      queryParams.available_to = new Date(availToLocal).toISOString();
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
    <main className="px-4 py-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Каталог ресурсов</h1>
          <p className="mt-1 text-sm text-gray-500">
            Подбор площадок и мест для бронирования. Фильтры слева, карточки справа.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user?.role === USER_ROLES.SUPERADMIN && (
            <Link
              to="/resources"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              <Settings2 className="h-4 w-4" />
              Управление ресурсами
            </Link>
          )}
          <Link
            to="/bookings/my"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Мои бронирования
          </Link>
        </div>
      </div>

      {isError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          Не удалось загрузить каталог. Проверьте сеть и токен.
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside
          className={cn(
            'w-full shrink-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm text-gray-900',
            'lg:w-80 lg:sticky lg:top-4',
          )}
        >
          <h2 className="text-sm font-semibold text-gray-900">Фильтры</h2>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className={sbLabel}>Поиск по названию</span>
              <div className="relative mt-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Например, Байтерек"
                  className={cn(
                    'w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500',
                  )}
                />
              </div>
            </label>

            <label className="block">
              <span className={sbLabel}>Тип</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={cn(sbSelect, 'focus:ring-2 focus:ring-blue-500 focus:outline-none')}
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
                className={cn(sbInput, 'focus:ring-2 focus:ring-blue-500 focus:outline-none')}
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
                  className={cn(sbInput, 'px-2 focus:ring-2 focus:ring-blue-500 focus:outline-none')}
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
                  className={cn(sbInput, 'px-2 focus:ring-2 focus:ring-blue-500 focus:outline-none')}
                />
              </label>
            </div>

            <fieldset className="min-w-0">
              <legend className={sbLabel}>Оборудование в переговорке</legend>
              {equipmentFacetKeys.length === 0 ? (
                <p className="mt-3 text-sm text-gray-600">
                  Нет переговорок с оборудованием в этой выборке — смените фильтры или тип «Переговорка».
                </p>
              ) : (
                <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
                  {equipmentFacetKeys.map((key) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center gap-2 text-sm text-gray-900"
                    >
                      <input
                        type="checkbox"
                        checked={equipmentNeed[key]}
                        onChange={() =>
                          setEquipmentNeed((prev) => ({ ...prev, [key]: !prev[key] }))
                        }
                        className="size-4 shrink-0 rounded border-gray-400 text-blue-600 focus:ring-blue-500"
                      />
                      {RESOURCE_EQUIPMENT_LABELS[key]}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>

            <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
              <span className={sbLabel}>Свободен в интервале</span>
              <p className="text-xs text-gray-600">
                Укажите «с» и «до» (локальное время). Отфильтруются ресурсы без пересечений с
                бронированиями и блокировками.
              </p>
              <label className="block">
                <span className="text-xs text-gray-700">С</span>
                <input
                  type="datetime-local"
                  value={availFromLocal}
                  onChange={(e) => setAvailFromLocal(e.target.value)}
                  className={cn(sbInput, 'focus:ring-2 focus:ring-blue-500 focus:outline-none')}
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-700">До</span>
                <input
                  type="datetime-local"
                  value={availToLocal}
                  onChange={(e) => setAvailToLocal(e.target.value)}
                  className={cn(sbInput, 'focus:ring-2 focus:ring-blue-500 focus:outline-none')}
                />
              </label>
            </div>

            <label className="block">
              <span className={sbLabel}>Сортировка</span>
              <select
                value={ordering}
                onChange={(e) => setOrdering(e.target.value)}
                className={cn(sbSelect, 'focus:ring-2 focus:ring-blue-500 focus:outline-none')}
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
              className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
            >
              Сбросить
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          {isLoading ? (
            <div className="py-20 text-center text-sm text-gray-500">Загрузка каталога…</div>
          ) : results.length === 0 ? (
            <div className="py-20 text-center text-sm text-gray-500">Нет ресурсов по заданным условиям.</div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((r) => {
                const imgSrc = resolveMediaUrl(r.photo_url ?? r.photo ?? '') ?? r.photo_url ?? r.photo ?? '';
                const statusLabel = STATUS_LABELS[r.status] ?? r.status;
                const badgeClass = STATUS_BADGE_CLASS[r.status] ?? 'bg-black/60';
                const whenFree = formatAvailableAt(r.available_at);
                return (
                  <li key={r.id}>
                    <article
                      className={cn(
                        'h-full flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden',
                        !r.is_active && 'opacity-60',
                      )}
                    >
                      <div className="aspect-[16/10] bg-gray-100 relative">
                        {imgSrc ? (
                          <img src={imgSrc} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Bookmark className="h-10 w-10 text-gray-300" />
                          </div>
                        )}
                        <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
                          {RESOURCE_TYPE_LABELS[r.type]}
                        </span>
                        <span
                          className={cn(
                            'absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium text-white',
                            badgeClass,
                          )}
                        >
                          {statusLabel}
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col p-4 gap-2">
                        <h2 className="font-semibold text-gray-900">{r.name}</h2>
                        <p className="text-xs text-gray-500">
                          Этаж {r.floor}
                          {r.zone ? ` · ${r.zone}` : ''}
                          {r.parking_type ? ` · ${r.parking_type === 'vip' ? 'VIP' : 'Обычная'}` : ''}
                          {r.capsule_zone ? ` · ${r.capsule_zone === 'quiet' ? 'тихая зона' : 'обычная'}` : ''}
                        </p>
                        <p className="text-xs text-gray-500">Вместимость: {r.capacity}</p>
                        {r.equipment && r.type === RESOURCE_TYPES.MEETING_ROOM && (
                          <ul className="flex flex-wrap gap-1">
                            {Object.entries(r.equipment)
                              .filter(([, v]) => v)
                              .map(([key]) => (
                                <li
                                  key={key}
                                  className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700"
                                >
                                  {RESOURCE_EQUIPMENT_LABELS[key as keyof typeof RESOURCE_EQUIPMENT_LABELS] ?? key}
                                </li>
                              ))}
                          </ul>
                        )}
                        {whenFree && r.status === BOOKING_RESOURCE_CATALOG_STATUS.SOON_AVAILABLE && (
                          <p className="text-xs text-amber-800">Освободится: {whenFree}</p>
                        )}
                        {r.is_hot_desk && r.type === RESOURCE_TYPES.DESK && (
                          <span className="text-xs font-medium text-blue-700">Hot desk</span>
                        )}
                        <div className="mt-auto pt-2">
                          {r.status === BOOKING_RESOURCE_CATALOG_STATUS.OCCUPIED ? (
                            <button
                              type="button"
                              disabled
                              className="inline-flex w-full justify-center rounded-lg bg-gray-200 px-3 py-2 text-sm font-medium text-gray-500 cursor-not-allowed"
                            >
                              Занят
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedResource(r)}
                              className="inline-flex w-full justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:opacity-40"
              >
                Назад
              </button>
              <span className="self-center text-sm text-gray-600">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:opacity-40"
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
          onClose={() => setSelectedResource(null)}
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
