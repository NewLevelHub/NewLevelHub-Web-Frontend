import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  BOOKING_RESOURCE_CATALOG_STATUS,
  RESOURCE_TYPES,
  RESOURCE_TYPE_LABELS,
  type ResourceType,
} from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { resolveMediaUrl } from '@/shared/lib/mediaUrl';
import {
  resBadgeOff,
  resBadgeOn,
  resEmptyState,
  resErrorBanner,
  resInput,
  resLink,
  resPageBtn,
  resPaginationBar,
  resPaginationMeta,
  resPanel,
  resPhotoThumb,
  resPlaceholderIconBox,
  resSelect,
  resSubtitle,
  resTableShell,
  resTableBody,
  resTd,
  resTr,
  resTdMuted,
  resTdStrong,
  resThead,
  resourcePageWide,
  resTitle,
} from '@/shared/ui/resourcePageStyles';
import type { BookingResourceListItem, PaginatedResponse } from '@/shared/types';

const PAGE_SIZE = 20;

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Все типы' },
  ...Object.values(RESOURCE_TYPES).map((t) => ({
    value: t,
    label: RESOURCE_TYPE_LABELS[t as ResourceType],
  })),
];

const STATUS_FILTER = [
  { value: '', label: 'Все статусы' },
  { value: 'true', label: 'Только активные' },
  { value: 'false', label: 'Только неактивные' },
] as const;

export default function ResourceListPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const successMessage =
    typeof location.state === 'object' && location.state && 'successMessage' in location.state
      ? String((location.state as { successMessage?: string }).successMessage ?? '')
      : null;
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [floorFilter, setFloorFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const queryParams: Record<string, string | number> = { page, page_size: PAGE_SIZE };
  if (typeFilter) queryParams.resource_type = typeFilter;
  if (floorFilter !== '' && !Number.isNaN(Number(floorFilter))) {
    queryParams.floor = Number(floorFilter);
  }
  if (activeFilter !== '') queryParams.is_active = activeFilter;
  if (debouncedSearch.trim()) queryParams.search = debouncedSearch.trim();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['booking-resources', queryParams],
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

  const getOperationalStatus = (resource: BookingResourceListItem) => {
    if (resource.status === BOOKING_RESOURCE_CATALOG_STATUS.BLOCKED) {
      return {
        label: 'Заблокирован',
        className: 'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800',
      };
    }
    return {
      label: resource.is_active ? 'Активен' : 'Выключен',
      className: resource.is_active ? resBadgeOn : resBadgeOff,
    };
  };

  useEffect(() => {
    setPage(1);
  }, [typeFilter, floorFilter, activeFilter, debouncedSearch]);

  useEffect(() => {
    if (!successMessage) return;
    // Clear navigation state so alert doesn't reappear on page refresh/back-forward.
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, navigate, successMessage]);

  return (
    <main className={resourcePageWide}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={resTitle}>Ресурсы для бронирования</h1>
          <p className={resSubtitle}>
            Столы, переговорки, парковка, капсулы. Видны все записи (включая неактивные).
          </p>
        </div>
        {user?.role === 'superadmin' && (
          <Link
            to="/resources/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Добавить ресурс
          </Link>
        )}
      </div>

      {isError && (
        <div role="alert" className={resErrorBanner}>
          Не удалось загрузить ресурсы. Проверьте API и авторизацию.
        </div>
      )}
      {successMessage && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {successMessage}
        </div>
      )}

      <section className={resPanel} aria-label="Фильтры ресурсов">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-52 flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Поиск по названию или зоне..."
              className={`${resInput} pl-9`}
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className={`${resSelect} min-w-[10rem]`}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={-5}
            max={99}
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value)}
            placeholder="Этаж"
            className={`${resInput} w-28`}
          />
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className={`${resSelect} min-w-[11rem]`}
          >
            {STATUS_FILTER.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div className={resTableShell}>
        {isLoading ? (
          <div className={resEmptyState}>Загрузка…</div>
        ) : results.length === 0 ? (
          <div className={resEmptyState}>Нет ресурсов по фильтрам.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className={resThead}>
                <tr>
                  <th className="px-4 py-3 font-medium">Фото</th>
                  <th className="px-4 py-3 font-medium">Название</th>
                  <th className="px-4 py-3 font-medium">Тип</th>
                  <th className="px-4 py-3 font-medium">Этаж</th>
                  <th className="px-4 py-3 font-medium">Зона</th>
                  <th className="px-4 py-3 font-medium">Вместимость</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                  <th className="w-28 px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className={resTableBody}>
                {results.map((r) => {
                  const operationalStatus = getOperationalStatus(r);
                  return (
                    <tr key={r.id} className={resTr}>
                      <td className="px-4 py-2">
                        {r.photo ? (
                          <img
                            src={resolveMediaUrl(r.photo) ?? r.photo}
                            alt=""
                            className={resPhotoThumb}
                          />
                        ) : (
                          <div className={resPlaceholderIconBox}>
                            <Bookmark className="h-4 w-4 text-gray-500" />
                          </div>
                        )}
                      </td>
                      <td className={resTdStrong}>{r.name}</td>
                      <td className={resTd}>{RESOURCE_TYPE_LABELS[r.type] ?? r.type}</td>
                      <td className={resTdMuted}>{r.floor}</td>
                      <td className={resTdMuted}>{r.zone || '—'}</td>
                      <td className={resTdMuted}>{r.capacity}</td>
                      <td className="px-4 py-2">
                        <div className="space-y-1">
                          <span className={operationalStatus.className}>{operationalStatus.label}</span>
                          {r.status === BOOKING_RESOURCE_CATALOG_STATUS.BLOCKED && r.reason && (
                            <p className="max-w-xs text-xs text-slate-600">{r.reason}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <Link to={`/resources/${r.id}`} className={resLink}>
                          Открыть
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className={resPaginationBar}>
            <p className={resPaginationMeta}>
              Стр. {page} из {totalPages} · всего {totalCount}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={resPageBtn}
              >
                <ChevronLeft className="h-4 w-4" />
                Назад
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={resPageBtn}
              >
                Вперёд
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
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
