import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Bookmark, Search, Settings2 } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  RESOURCE_TYPES,
  RESOURCE_TYPE_LABELS,
  USER_ROLES,
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

export default function BookingCatalogPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [floorFilter, setFloorFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const queryParams: Record<string, string | number> = { page, page_size: PAGE_SIZE };
  if (typeFilter) queryParams.resource_type = typeFilter;
  if (floorFilter !== '' && !Number.isNaN(Number(floorFilter))) {
    queryParams.floor = Number(floorFilter);
  }
  if (debouncedSearch.trim()) queryParams.search = debouncedSearch.trim();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['booking-resources', 'catalog', queryParams],
    queryFn: async () => {
      const { data: res } = await apiClient.get<PaginatedResponse<BookingResourceListItem>>(
        API.bookings.resources.list,
        { params: queryParams },
      );
      return res;
    },
  });

  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const results = data?.results ?? [];

  useEffect(() => {
    setPage(1);
  }, [typeFilter, floorFilter, debouncedSearch]);

  return (
    <main className="px-4 py-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Бронирование</h1>
          <p className="mt-1 text-sm text-gray-500">
            Каталог ресурсов бизнес-центра. Доступен всем авторизованным пользователям.
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

      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-52">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Поиск по названию или зоне..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500"
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value)}
            placeholder="Этаж"
            className="w-28 px-3 py-2 text-sm rounded-lg border border-gray-300"
          />
        </div>
      </section>

      {isLoading ? (
        <div className="py-20 text-center text-sm text-gray-500">Загрузка каталога…</div>
      ) : results.length === 0 ? (
        <div className="py-20 text-center text-sm text-gray-500">Нет доступных ресурсов.</div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((r) => (
            <li key={r.id}>
              <article
                className={cn(
                  'h-full flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden',
                  !r.is_active && 'opacity-60',
                )}
              >
                <div className="aspect-[16/10] bg-gray-100 relative">
                  {r.photo ? (
                    <img
                      src={resolveMediaUrl(r.photo) ?? r.photo}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Bookmark className="h-10 w-10 text-gray-300" />
                    </div>
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
                    {RESOURCE_TYPE_LABELS[r.type]}
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
                  {r.is_hot_desk && r.type === RESOURCE_TYPES.DESK && (
                    <span className="text-xs font-medium text-blue-700">Hot desk</span>
                  )}
                  <div className="mt-auto pt-2">
                    <Link
                      to={`/bookings/new?resource=${r.id}`}
                      className="inline-flex w-full justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Забронировать
                    </Link>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
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
