import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  Bookmark,
  Building2,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  Filter,
  Search,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { dateLocaleTag } from '@/shared/lib/localeFormat';
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
  RESOURCE_TYPE_LABEL_KEYS,
  RESOURCE_EQUIPMENT_KEYS,
  RESOURCE_EQUIPMENT_LABEL_KEYS,
  STAFF_UI_PREFIX,
  USER_ROLES,
  type ResourceEquipmentKey,
  type ResourceType,
} from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { resolveMediaUrl } from '@/shared/lib/mediaUrl';
import { cn } from '@/shared/lib/cn';
import type { BookingResourceDetail, BookingResourceListItem, PaginatedResponse } from '@/shared/types';

const PAGE_SIZE = 24;

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

function emptyEquipmentFilters(): Record<ResourceEquipmentKey, boolean> {
  return Object.fromEntries(
    RESOURCE_EQUIPMENT_KEYS.map((k) => [k, false]),
  ) as Record<ResourceEquipmentKey, boolean>;
}

function formatAvailableAt(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return null;
  }
}

export default function BookingCatalogPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = dateLocaleTag(i18n.language);
  const [searchParams, setSearchParams] = useSearchParams();
  const preselectResourceId = Number(searchParams.get('resource'));
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [selectedResource, setSelectedResource] = useState<BookingResourceListItem | null>(null);
  const [panelResource, setPanelResource] = useState<BookingResourceListItem | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);
  const autoOpenedForRef = useRef<number | null>(null);

  // Filter state — all kept, sidebar removed
  const [typeFilter, setTypeFilter] = useState('');
  const [floorFilter, setFloorFilter] = useState('');
  const [capacityMin, setCapacityMin] = useState('');
  const [capacityMax, setCapacityMax] = useState('');
  const [equipmentNeed, setEquipmentNeed] = useState(emptyEquipmentFilters);
  const [ordering, setOrdering] = useState('name');
  const [searchInput, setSearchInput] = useState('');
  const [availFromDate, setAvailFromDate] = useState('');
  const [availFromTime, setAvailFromTime] = useState('');
  const [availToDate, setAvailToDate] = useState('');
  const [availToTime, setAvailToTime] = useState('');
  const availFromLocal = availFromDate && availFromTime ? `${availFromDate}T${availFromTime}` : '';
  const availToLocal = availToDate && availToTime ? `${availToDate}T${availToTime}` : '';
  const [showOnlyFree, setShowOnlyFree] = useState(false);
  const [showAvailFilter, setShowAvailFilter] = useState(false);

  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const TYPE_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: t('catalog.typeAll') },
    ...Object.values(RESOURCE_TYPES).map((rt) => ({
      value: rt,
      label: t(RESOURCE_TYPE_LABEL_KEYS[rt as ResourceType]),
    })),
  ];

  const ORDERING_OPTIONS: { value: string; label: string }[] = [
    { value: 'name', label: 'A → Z' },
    { value: '-name', label: 'Z → A' },
    { value: 'floor', label: `${t('catalog.floor')} ↑` },
    { value: '-floor', label: `${t('catalog.floor')} ↓` },
    { value: 'capacity', label: `${t('catalog.capacity')} ↑` },
    { value: '-capacity', label: `${t('catalog.capacity')} ↓` },
  ];

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

  const freeCount = useMemo(() => results.filter((r) => r.status === BOOKING_RESOURCE_CATALOG_STATUS.FREE).length, [results]);

  const myCompanyId =
    user?.role === USER_ROLES.COMPANY_ADMIN || user?.role === USER_ROLES.EMPLOYEE
      ? (user?.company_id ?? null)
      : null;

  const sortedResults = useMemo(() => {
    const base = myCompanyId
      ? [
          ...results.filter((r) => r.assigned_company === myCompanyId),
          ...results.filter((r) => r.assigned_company !== myCompanyId),
        ]
      : results;
    if (showOnlyFree) return base.filter((r) => r.status === BOOKING_RESOURCE_CATALOG_STATUS.FREE);
    return base;
  }, [results, myCompanyId, showOnlyFree]);

  const { data: panelDetail } = useQuery({
    queryKey: ['booking-resource-panel-detail', panelResource?.id],
    enabled: panelResource != null,
    staleTime: 60_000,
    queryFn: () =>
      apiClient
        .get<BookingResourceDetail>(API.bookings.resources.detail(String(panelResource!.id)))
        .then((r) => r.data),
  });

  useEffect(() => {
    setPhotoIdx(0);
  }, [panelResource?.id]);

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
        photos: preselectedResource.photos ?? [],
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
    availFromDate,
    availFromTime,
    availToDate,
    availToTime,
  ]);

  const resetFilters = () => {
    setTypeFilter('');
    setFloorFilter('');
    setCapacityMin('');
    setCapacityMax('');
    setEquipmentNeed(emptyEquipmentFilters());
    setOrdering('name');
    setSearchInput('');
    setAvailFromDate('');
    setAvailFromTime('');
    setAvailToDate('');
    setAvailToTime('');
    setShowOnlyFree(false);
    setShowAvailFilter(false);
  };

  const hasAvailFilter = availFromLocal !== '' || availToLocal !== '';

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-primary">{t('catalog.title')}</h1>
        <p className="mt-0.5 text-sm text-muted">
          {t('catalog.subtitle', { total: totalCount, free: freeCount })}
        </p>
        {user?.role === USER_ROLES.SUPERADMIN || user?.role === USER_ROLES.COMPANY_ADMIN ? (
          <Link
            to={`${STAFF_UI_PREFIX}/bookings`}
            className="inline-flex items-center gap-1 text-[13px] text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] transition-colors mt-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            {t('catalog.back')}
          </Link>
        ) : (
          <Link
            to="/bookings/my"
            className="inline-flex items-center gap-1 text-[13px] text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] transition-colors mt-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            {t('common.myBookings')}
          </Link>
        )}
      </div>

      {isError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 dark:border-red-800 bg-danger-subtle px-4 py-3 text-sm text-danger"
        >
          {t('catalog.errorLoad')}
        </div>
      )}

      {/* ── Inline filter bar ── */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Type chips */}
          <div className="flex flex-wrap gap-1.5">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value || 'all'}
                type="button"
                onClick={() => setTypeFilter(opt.value)}
                className={cn(
                  'rounded-full border px-3 py-1 text-sm font-medium transition-colors',
                  typeFilter === opt.value
                    ? 'border-brand bg-brand/10 text-brand'
                    : 'border-default text-secondary hover:bg-hover hover:text-primary',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Separator */}
          <span className="hidden sm:block h-4 w-px bg-border" />

          {/* Floor button */}
          <button
            type="button"
            onClick={() => {
              const val = window.prompt(t('catalog.floor'), floorFilter || '');
              if (val === null) return;
              setFloorFilter(val.trim());
            }}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
              floorFilter
                ? 'border-brand bg-brand/10 text-brand'
                : 'border-default text-secondary hover:bg-hover',
            )}
          >
            <Filter size={13} />
            {floorFilter ? `${t('catalog.floor')}: ${floorFilter}` : t('catalog.floorAll')}
          </button>

          {/* Availability window toggle */}
          <button
            type="button"
            onClick={() => setShowAvailFilter((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
              hasAvailFilter
                ? 'border-brand bg-brand/10 text-brand'
                : 'border-default text-secondary hover:bg-hover',
            )}
          >
            {hasAvailFilter
              ? `${t('catalog.availFrom')} ${availFromLocal.slice(11, 16)} ${t('catalog.availTo')} ${availToLocal.slice(11, 16)}`
              : t('catalog.availWindow')}
          </button>

          {/* Only free chip */}
          <button
            type="button"
            onClick={() => setShowOnlyFree((v) => !v)}
            className={cn(
              'rounded-full border px-3 py-1 text-sm font-medium transition-colors',
              showOnlyFree
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                : 'border-default text-secondary hover:bg-hover hover:text-primary',
            )}
          >
            {t('catalog.onlyFree')}
          </button>

          {/* Right-side controls */}
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:ml-auto">
            {/* Search */}
            <div className="relative flex-1 sm:flex-none">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('catalog.searchPlaceholder')}
                className="h-8 w-full min-w-0 rounded-lg border border-default bg-surface pl-8 pr-3 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 sm:w-44"
              />
            </div>

            {/* Ordering */}
            <select
              value={ordering}
              onChange={(e) => setOrdering(e.target.value)}
              className="h-8 rounded-lg border border-default bg-surface px-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-brand/20 [&>option]:bg-surface [&>option]:text-primary"
            >
              {ORDERING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* Reset */}
            <button
              type="button"
              onClick={resetFilters}
              className="h-8 px-3 rounded-lg border border-default text-xs text-secondary hover:bg-hover transition-colors"
            >
              {t('catalog.reset')}
            </button>
          </div>
        </div>

        {/* Availability date inputs — shown when toggled or has values */}
        {showAvailFilter && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-default bg-raised px-3 py-2">
            <span className="text-xs font-medium text-secondary shrink-0">{t('catalog.availFrom')}</span>
            <input
              type="date"
              value={availFromDate}
              onChange={(e) => setAvailFromDate(e.target.value)}
              lang={dateLocale}
              className="h-8 rounded-lg border border-default bg-surface px-2 text-xs text-primary focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            <input
              type="time"
              value={availFromTime}
              onChange={(e) => setAvailFromTime(e.target.value)}
              lang={dateLocale}
              className="h-8 rounded-lg border border-default bg-surface px-2 text-xs text-primary focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            <span className="text-xs font-medium text-secondary shrink-0">{t('catalog.availTo')}</span>
            <input
              type="date"
              value={availToDate}
              onChange={(e) => setAvailToDate(e.target.value)}
              lang={dateLocale}
              className="h-8 rounded-lg border border-default bg-surface px-2 text-xs text-primary focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            <input
              type="time"
              value={availToTime}
              onChange={(e) => setAvailToTime(e.target.value)}
              lang={dateLocale}
              className="h-8 rounded-lg border border-default bg-surface px-2 text-xs text-primary focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            {hasAvailFilter && (
              <button
                type="button"
                onClick={() => { setAvailFromDate(''); setAvailFromTime(''); setAvailToDate(''); setAvailToTime(''); }}
                className="ml-auto rounded-full p-0.5 text-muted hover:text-secondary"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* Equipment facets — only shown when meeting_room type selected and facets available */}
        {typeFilter === RESOURCE_TYPES.MEETING_ROOM && equipmentFacetKeys.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-default bg-raised px-3 py-2">
            <span className="text-xs font-medium text-muted">{t('catalog.equipment')}:</span>
            {equipmentFacetKeys.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setEquipmentNeed((prev) => ({ ...prev, [key]: !prev[key] }))}
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
                  equipmentNeed[key]
                    ? 'border-brand bg-brand/10 text-brand'
                    : 'border-default text-secondary hover:bg-hover',
                )}
              >
                {t(RESOURCE_EQUIPMENT_LABEL_KEYS[key])}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Resource grid ── */}
      {isLoading ? (
        <div className="py-20 text-center text-sm text-secondary">{t('catalog.loading')}</div>
      ) : sortedResults.length === 0 ? (
        <div className="py-20 text-center text-sm text-secondary">{t('catalog.noResults')}</div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedResults.map((r) => {
            const firstPhotoSrc = r.photos?.[0]?.image_url ?? r.photos?.[0]?.image ?? null;
            const imgSrc =
              firstPhotoSrc ??
              resolveMediaUrl(r.photo_url ?? r.photo ?? '') ??
              r.photo_url ??
              r.photo ??
              '';
            const isMyCompany = myCompanyId !== null && r.assigned_company === myCompanyId;
            const whenFree = formatAvailableAt(r.available_at);

            return (
              <li key={r.id}>
                <article
                  className={cn(
                    'flex flex-col overflow-hidden rounded-2xl border bg-surface shadow-sm transition-all cursor-pointer',
                    'hover:-translate-y-0.5 hover:shadow-md',
                    isMyCompany ? 'border-indigo-500/40' : 'border-default',
                    !r.is_active && 'opacity-60',
                  )}
                >
                  {/* Image area */}
                  <div
                    className="relative aspect-[16/10] overflow-hidden bg-raised"
                    onClick={() => setPanelResource(r)}
                  >
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={r.name}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <DoorOpen size={32} className="text-muted" />
                      </div>
                    )}

                    {/* Resource type badge — top left */}
                    <span className="absolute left-2 top-2 rounded-full border border-white/15 bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white">
                      {t(RESOURCE_TYPE_LABEL_KEYS[r.type])}
                    </span>

                    {/* Status badge — top right */}
                    <span
                      className="absolute right-2 top-2 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
                      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
                    >
                      <span className={cn('h-2 w-2 rounded-full', statusDotClass[r.status] ?? 'bg-slate-400')} />
                      {t(`catalog.status.${r.status}`, { defaultValue: r.status })}
                    </span>
                  </div>

                  {/* Card body */}
                  <div
                    className="flex flex-1 flex-col gap-2 p-4"
                    onClick={() => setPanelResource(r)}
                  >
                    <h2 className="text-sm font-semibold text-primary leading-snug">{r.name}</h2>

                    {isMyCompany && (
                      <span className="inline-flex w-fit items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-500/15 px-2 py-0.5 text-xs font-medium text-indigo-300">
                        <Building2 size={10} />
                        {t('catalog.assignedToCompany')}
                      </span>
                    )}

                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-1.5 text-xs text-muted">
                        <DoorOpen size={12} />
                        {t(RESOURCE_TYPE_LABEL_KEYS[r.type])}
                        {r.capacity ? ` · ${r.capacity} ${t('catalog.people')}` : ''}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-muted">
                        <Building2 size={12} />
                        {t('catalog.floor')} {r.floor}
                        {r.zone ? ` · ${r.zone}` : ''}
                        {r.parking_type ? ` · ${r.parking_type === 'vip' ? 'VIP' : 'Regular'}` : ''}
                        {r.capsule_zone ? ` · ${r.capsule_zone === 'quiet' ? 'Quiet' : 'Regular'}` : ''}
                      </span>
                    </div>

                    {r.is_hot_desk && r.type === RESOURCE_TYPES.DESK && (
                      <span className="text-xs font-medium text-blue-400">{t('catalog.hotDesk')}</span>
                    )}

                    {whenFree && r.status === BOOKING_RESOURCE_CATALOG_STATUS.SOON_AVAILABLE && (
                      <p className="text-xs text-warning">{t('catalog.freeAt', { time: whenFree })}</p>
                    )}

                    {r.status === BOOKING_RESOURCE_CATALOG_STATUS.BLOCKED && r.reason && (
                      <p className="text-xs text-muted">{t('catalog.blockReason', { reason: r.reason })}</p>
                    )}

                    {/* Equipment chips — meeting rooms only, max 3 */}
                    {r.type === RESOURCE_TYPES.MEETING_ROOM && r.equipment && (
                      <div className="flex flex-wrap gap-1 mt-auto">
                        {Object.entries(r.equipment)
                          .filter(([, v]) => v)
                          .slice(0, 3)
                          .map(([key]) => (
                            <span
                              key={key}
                              className="rounded border border-default bg-raised px-1.5 py-0.5 text-[10px] text-muted"
                            >
                              {t(RESOURCE_EQUIPMENT_LABEL_KEYS[key as ResourceEquipmentKey]) ?? key}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div
                    className="flex flex-col gap-2 px-4 pb-4 pt-0 sm:flex-row"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {r.status === BOOKING_RESOURCE_CATALOG_STATUS.OCCUPIED ? (
                      <button
                        type="button"
                        disabled
                        className="w-full sm:flex-1 rounded-lg bg-raised px-3 py-2 text-sm font-medium text-muted cursor-not-allowed"
                      >
                        {t('catalog.occupied')}
                      </button>
                    ) : r.status === BOOKING_RESOURCE_CATALOG_STATUS.BLOCKED ? (
                      <button
                        type="button"
                        disabled
                        className="w-full sm:flex-1 rounded-lg bg-raised px-3 py-2 text-sm font-medium text-muted cursor-not-allowed"
                      >
                        {t('catalog.blocked')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedResource(r)}
                        className="w-full sm:flex-1 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover transition-colors"
                      >
                        {t('catalog.book')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setPanelResource(r)}
                      className="w-full sm:w-auto rounded-lg border border-default px-3 py-2 text-sm font-medium text-secondary hover:bg-hover transition-colors"
                    >
                      {t('catalog.details')}
                    </button>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-default px-4 py-2 text-sm text-secondary disabled:opacity-40"
          >
            {t('catalog.prev')}
          </button>
          <span className="self-center text-sm text-secondary">
            {t('catalog.pageOf', { page, total: totalPages })}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-lg border border-default px-4 py-2 text-sm text-secondary disabled:opacity-40"
          >
            {t('catalog.next')}
          </button>
        </div>
      )}

      {/* ── Detail panel modal ── */}
      {panelResource && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setPanelResource(null)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          <div
            className="relative z-10 flex w-full max-w-xl mx-2 sm:mx-auto max-h-[88vh] flex-col overflow-hidden rounded-3xl bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              type="button"
              onClick={() => setPanelResource(null)}
              className="absolute right-3 top-3 z-20 rounded-full bg-black/50 p-1.5 text-white backdrop-blur-sm hover:bg-black/75 transition-colors"
            >
              <X size={18} />
            </button>

            {/* Photo slider */}
            {(() => {
              const photos = panelResource.photos;
              const legacySrc =
                panelResource.photo_url ??
                (panelResource.photo ? resolveMediaUrl(panelResource.photo) ?? panelResource.photo : null);
              const hasSrc = photos.length > 0 || legacySrc;

              if (!hasSrc) {
                return (
                  <div className="flex shrink-0 aspect-[16/9] items-center justify-center bg-raised">
                    <Bookmark className="h-12 w-12 text-muted" />
                  </div>
                );
              }

              const currentSrc =
                photos.length > 0
                  ? (photos[photoIdx]?.image_url ?? resolveMediaUrl(photos[photoIdx]?.image) ?? photos[photoIdx]?.image)
                  : legacySrc;

              return (
                <div className="relative shrink-0 aspect-[16/9] bg-black overflow-hidden">
                  <img key={photoIdx} src={currentSrc ?? ''} alt="" className="h-full w-full object-cover" />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                  <div className="absolute bottom-3 left-4 flex items-center gap-2">
                    <span className="rounded-full border border-white/20 bg-black/50 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                      {t(RESOURCE_TYPE_LABEL_KEYS[panelResource.type])}
                    </span>
                    <span
                      className={cn(
                        'flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white',
                        STATUS_BADGE_CLASS[panelResource.status] ?? 'bg-black/60',
                      )}
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full', statusDotClass[panelResource.status] ?? 'bg-slate-400')} />
                      {t(`catalog.status.${panelResource.status}`, { defaultValue: panelResource.status })}
                    </span>
                  </div>

                  {photos.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white hover:bg-black/80 transition-colors"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white hover:bg-black/80 transition-colors"
                      >
                        <ChevronRight size={18} />
                      </button>

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
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            {/* Scrollable body */}
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-primary">{panelResource.name}</h2>
                <p className="mt-0.5 text-sm text-secondary">
                  {t('catalog.floor')} {panelResource.floor}
                  {panelResource.zone ? ` · ${panelResource.zone}` : ''}
                  {panelResource.parking_type ? ` · ${panelResource.parking_type === 'vip' ? 'VIP' : 'Regular'}` : ''}
                  {panelResource.capsule_zone ? ` · ${panelResource.capsule_zone === 'quiet' ? 'Quiet' : 'Regular'}` : ''}
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
                  <p className="mt-0.5 text-lg font-semibold text-primary">{panelResource.capacity}</p>
                </div>
                {panelResource.is_hot_desk && panelResource.type === RESOURCE_TYPES.DESK && (
                  <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-center">
                    <p className="text-xs text-blue-400">{t('catalog.modeLabel')}</p>
                    <p className="mt-0.5 text-sm font-semibold text-blue-300">{t('catalog.hotDesk')}</p>
                  </div>
                )}
              </div>

              {panelResource.equipment && panelResource.type === RESOURCE_TYPES.MEETING_ROOM && (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted uppercase tracking-wide">
                    {t('catalog.equipment')}
                  </p>
                  <ul className="flex flex-wrap gap-1.5">
                    {Object.entries(panelResource.equipment)
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

            {/* Footer */}
            <div className="shrink-0 border-t border-default px-5 py-4">
              {panelResource.status === BOOKING_RESOURCE_CATALOG_STATUS.OCCUPIED ? (
                <button
                  type="button"
                  disabled
                  className="inline-flex w-full cursor-not-allowed justify-center rounded-xl bg-raised px-4 py-3 text-sm font-semibold text-muted"
                >
                  {t('catalog.occupied')}
                </button>
              ) : panelResource.status === BOOKING_RESOURCE_CATALOG_STATUS.BLOCKED ? (
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
                    setSelectedResource(panelResource);
                    setPanelResource(null);
                  }}
                  className="inline-flex w-full justify-center rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/30 transition-colors"
                >
                  {t('catalog.book')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Booking modal ── */}
      {selectedResource !== null && (selectedResource as Partial<BookingResourceListItem>).id !== undefined && (
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
    </div>
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
