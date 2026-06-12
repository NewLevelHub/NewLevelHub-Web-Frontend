import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Minus,
  Plus,
  PowerOff,
  Search,
  Trash2,
  X,
  Zap,
} from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { resolveMediaUrl } from '@/shared/lib/mediaUrl';
import { BOOKING_RESOURCE_CATALOG_STATUS, RESOURCE_TYPE_LABEL_KEYS } from '@/shared/config/constants';
import type { BookingResourceListItem } from '@/shared/types';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { useResourceList } from '@/pages/resources/hooks/useResourceList';

// ─── ResourceStatusBadge ──────────────────────────────────────────────────────

function ResourceStatusBadge({ resource }: { resource: BookingResourceListItem }) {
  const { t } = useTranslation();

  const { label, colorClass } = useMemo(() => {
    if (resource.status === BOOKING_RESOURCE_CATALOG_STATUS.BLOCKED) {
      return {
        label: t('catalog.status.blocked'),
        colorClass: 'bg-[color:var(--status-soon-bg)] text-[color:var(--status-soon-text)]',
      };
    }
    if (resource.is_active) {
      return {
        label: t('common.active'),
        colorClass: 'bg-[color:var(--status-free-bg)] text-[color:var(--status-free-text)]',
      };
    }
    return {
      label: t('common.inactive'),
      colorClass: 'bg-[color:var(--status-na-bg)] text-[color:var(--status-na-text)]',
    };
  }, [resource.status, resource.is_active, t]);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium',
        colorClass,
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
      {label}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResourceListPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const statusFilter = useMemo(
    () => [
      { value: '' as const, label: t('common.allStatuses') },
      { value: 'true' as const, label: t('resources.filters.activeOnly') },
      { value: 'false' as const, label: t('resources.filters.inactiveOnly') },
    ],
    [t],
  );

  const {
    isSuperadmin,
    searchInput,
    setSearchInput,
    typeFilter,
    setTypeFilter,
    floorFilter,
    setFloorFilter,
    activeFilter,
    setActiveFilter,
    typeOptions,
    page,
    setPage,
    totalCount,
    totalPages,
    rangeStart,
    rangeEnd,
    results,
    isLoading,
    isError,
    successMessage,
  } = useResourceList();

  // ── Bulk selection state ────────────────────────────────────────────────────

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmBulkActivate, setConfirmBulkActivate] = useState(false);
  const [confirmBulkDeactivate, setConfirmBulkDeactivate] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  // Reset selection when the result set changes (page turn / filter change)
  useEffect(() => {
    setSelectedIds(new Set());
  }, [results]);

  const allSelected = results.length > 0 && selectedIds.size === results.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < results.length;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(results.map((r) => r.id)));
    }
  }

  function toggleSelectRow(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // ── Bulk mutations ──────────────────────────────────────────────────────────

  const bulkActivateMutation = useMutation({
    mutationFn: (ids: number[]) =>
      apiClient.post(API.bookings.resources.bulkActivate, { ids }),
    onSuccess: () => {
      setSelectedIds(new Set());
      setConfirmBulkActivate(false);
      queryClient.invalidateQueries({ queryKey: ['booking-resources'] });
    },
  });

  const bulkDeactivateMutation = useMutation({
    mutationFn: (ids: number[]) =>
      apiClient.post(API.bookings.resources.bulkDeactivate, { ids }),
    onSuccess: () => {
      setSelectedIds(new Set());
      setConfirmBulkDeactivate(false);
      queryClient.invalidateQueries({ queryKey: ['booking-resources'] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) =>
      apiClient.delete(API.bookings.resources.bulkDelete, { data: { ids } }),
    onSuccess: () => {
      setSelectedIds(new Set());
      setConfirmBulkDelete(false);
      queryClient.invalidateQueries({ queryKey: ['booking-resources'] });
    },
  });

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[color:var(--text-primary)]">
            {t('resources.list.title')}
          </h1>
          <p className="text-[13px] text-[color:var(--text-muted)] mt-0.5">
            {t('resources.list.subtitle')}
          </p>
        </div>
        {isSuperadmin && (
          <Link
            to="/resources/new"
            className="inline-flex items-center gap-1.5 h-[34px] px-3 text-[13px] font-medium bg-[color:var(--brand)] text-white rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            {t('dashboard.addResource')}
          </Link>
        )}
      </div>

      {/* Error / success banners */}
      {isError && (
        <div
          role="alert"
          className="rounded-[var(--radius-sm)] border border-[color:var(--status-busy-bg)] bg-[color:var(--status-busy-bg)] px-4 py-3 text-[13px] text-[color:var(--status-busy-text)]"
        >
          {t('resources.list.errorLoad')}
        </div>
      )}
      {successMessage && (
        <div
          role="status"
          className="rounded-[var(--radius-sm)] border border-[color:var(--status-free-bg)] bg-[color:var(--status-free-bg)] px-4 py-3 text-[13px] text-[color:var(--status-free-text)]"
        >
          {successMessage}
        </div>
      )}

      {/* Card wrapper */}
      <div className="bg-[color:var(--bg-surface)] border border-[color:var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] overflow-hidden">
        {/* Filter bar */}
        <div
          className="flex items-center gap-1.5 flex-wrap px-4 py-3 border-b border-[color:var(--border)]"
          aria-label={t('resources.list.filterLabel')}
        >
          {/* Search */}
          <div className="relative flex items-center">
            <Search
              className="w-3.5 h-3.5 text-[color:var(--text-muted)] flex-shrink-0 absolute left-2.5 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('resources.list.searchPlaceholder')}
              className="h-[30px] pl-7 pr-2.5 text-[12px] border border-[color:var(--border)] bg-[color:var(--bg-surface)] rounded-[var(--radius-sm)] text-[color:var(--text-primary)] focus:outline-none placeholder:text-[color:var(--text-muted)] w-full sm:w-44 min-w-0"
            />
          </div>

          <span className="self-stretch w-px bg-[color:var(--border)] flex-shrink-0 my-0.5" aria-hidden="true" />

          {/* Type select */}
          <div className="relative flex items-center">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-[30px] px-2.5 pr-6 text-[12px] border border-[color:var(--border)] bg-[color:var(--bg-surface)] rounded-[var(--radius-sm)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)] cursor-pointer focus:outline-none appearance-none"
            >
              <option value="">{t('common.bookingFilter.allTypes')}</option>
              {typeOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {t(RESOURCE_TYPE_LABEL_KEYS[o.value])}
                </option>
              ))}
            </select>
            <ChevronDown
              className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[color:var(--text-muted)]"
              aria-hidden="true"
            />
          </div>

          {/* Floor input */}
          <input
            type="number"
            min={-5}
            max={99}
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value)}
            placeholder={t('catalog.floor')}
            className="w-20 h-[30px] px-2.5 text-[12px] border border-[color:var(--border)] bg-[color:var(--bg-surface)] rounded-[var(--radius-sm)] text-[color:var(--text-primary)] focus:outline-none placeholder:text-[color:var(--text-muted)]"
          />

          <span className="self-stretch w-px bg-[color:var(--border)] flex-shrink-0 my-0.5" aria-hidden="true" />

          {/* Status chips */}
          {statusFilter.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => { setActiveFilter(chip.value); setPage(1); }}
              className={cn(
                'inline-flex items-center px-2.5 py-1 text-[12px] rounded-full transition-colors',
                activeFilter === chip.value
                  ? 'border-transparent bg-[color:var(--brand-subtle)] text-[color:var(--brand-text)] cursor-pointer'
                  : 'border border-[color:var(--border)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)] cursor-pointer',
              )}
            >
              {chip.label}
            </button>
          ))}

          {/* Pagination — pushed to right */}
          {totalCount > 0 && (
            <div className="ml-auto flex items-center gap-1.5 text-[12px] text-[color:var(--text-muted)]">
              <span>
                {t('resources.list.showing', {
                  start: rangeStart,
                  end: rangeEnd,
                  total: totalCount,
                })}
              </span>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label={t('common.previousPage')}
                className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--text-muted)] hover:bg-[color:var(--bg-hover)] disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label={t('common.nextPage')}
                className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--text-muted)] hover:bg-[color:var(--bg-hover)] disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Bulk action bar — only for superadmin when items are selected */}
        {isSuperadmin && selectedIds.size > 0 && (
          <div className="flex items-center gap-3 mx-4 my-3 rounded-xl border border-[var(--brand)] bg-brand-subtle px-4 py-2.5 text-sm">
            <span className="font-medium text-[var(--brand-text)]">
              {t('resources.bulk.selectedCount', { count: selectedIds.size })}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-[var(--radius-sm)] border border-default bg-surface text-[12px] font-medium text-secondary hover:bg-hover transition-colors"
              >
                <X size={12} />
                {t('resources.bulk.deselectAll')}
              </button>
              <button
                type="button"
                onClick={() => setConfirmBulkActivate(true)}
                disabled={bulkActivateMutation.isPending}
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-[var(--radius-sm)] bg-[color:var(--status-free-bg)] border border-[color:var(--status-free-text)] text-[12px] font-medium text-[color:var(--status-free-text)] hover:opacity-80 transition-opacity disabled:opacity-50"
              >
                <Zap size={12} />
                {t('resources.bulk.activate')}
              </button>
              <button
                type="button"
                onClick={() => setConfirmBulkDeactivate(true)}
                disabled={bulkDeactivateMutation.isPending}
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-[var(--radius-sm)] bg-[color:var(--status-soon-bg)] border border-[var(--brand)] text-[12px] font-medium text-[color:var(--status-soon-text)] hover:opacity-80 transition-opacity disabled:opacity-50"
              >
                <PowerOff size={12} />
                {t('resources.bulk.deactivate')}
              </button>
              <button
                type="button"
                onClick={() => setConfirmBulkDelete(true)}
                disabled={bulkDeleteMutation.isPending}
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-[var(--radius-sm)] bg-danger-subtle border border-[var(--danger)] text-[12px] font-medium text-danger hover:bg-[var(--danger)] hover:text-white transition-colors disabled:opacity-50"
              >
                <Trash2 size={12} />
                {t('resources.bulk.delete')}
              </button>
            </div>
          </div>
        )}

        {/* Table / states */}
        {isLoading ? (
          <div className="px-4 py-12 text-center text-[13px] text-[color:var(--text-muted)]">
            {t('common.loading')}
          </div>
        ) : results.length === 0 ? (
          <div className="px-4 py-12 text-center text-[13px] text-[color:var(--text-muted)]">
            {t('resources.list.noResults')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] border-collapse text-[13px]" role="table">
              <thead className="border-b border-[color:var(--border)]">
                <tr>
                  {/* Checkbox header — superadmin only */}
                  {isSuperadmin && (
                    <th className="w-[34px] px-3 py-2 text-left">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className={cn(
                          'w-3.5 h-3.5 rounded-[3px] border-[1.5px] transition-colors flex items-center justify-center',
                          allSelected || someSelected
                            ? 'bg-[var(--brand)] border-[var(--brand)]'
                            : 'border-[var(--border-strong)] hover:border-[var(--brand)]',
                        )}
                      >
                        {allSelected && (
                          <Check size={10} strokeWidth={3} className="text-white" />
                        )}
                        {someSelected && (
                          <Minus size={10} strokeWidth={3} className="text-white" />
                        )}
                      </button>
                    </th>
                  )}
                  <th className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                    {t('resources.list.photo')}
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                    {t('resources.list.resourceName')}
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                    {t('common.type')}
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                    {t('catalog.floor')}
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                    {t('resources.list.zone')}
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                    {t('catalog.capacityLabel')}
                  </th>
                  {isSuperadmin && (
                    <th className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                      {t('common.company')}
                    </th>
                  )}
                  <th className="px-3 py-2 text-left text-[11px] font-medium text-[color:var(--text-muted)] whitespace-nowrap">
                    {t('common.status')}
                  </th>
                  <th className="w-10 px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {results.map((r) => {
                  const isSelected = selectedIds.has(r.id);
                  const firstPhoto = r.photos?.[0];
                  const photoSrc = firstPhoto
                    ? (firstPhoto.image_url ?? resolveMediaUrl(firstPhoto.image) ?? firstPhoto.image)
                    : r.photo
                      ? (resolveMediaUrl(r.photo) ?? r.photo)
                      : null;

                  return (
                    <tr
                      key={r.id}
                      className={cn(
                        'border-b border-[color:var(--border)] transition-colors',
                        isSelected
                          ? 'bg-[color-mix(in_srgb,var(--brand)_7%,transparent)]'
                          : 'hover:bg-[color:var(--bg-hover)]',
                      )}
                    >
                      {/* Per-row checkbox — superadmin only */}
                      {isSuperadmin && (
                        <td className="px-3 py-2.5 align-middle">
                          <button
                            type="button"
                            onClick={() => toggleSelectRow(r.id)}
                            className={cn(
                              'w-3.5 h-3.5 rounded-[3px] border-[1.5px] transition-colors flex items-center justify-center',
                              isSelected
                                ? 'bg-[var(--brand)] border-[var(--brand)]'
                                : 'border-[var(--border-strong)] hover:border-[var(--brand)]',
                            )}
                          >
                            {isSelected && <Check size={10} strokeWidth={3} className="text-white" />}
                          </button>
                        </td>
                      )}
                      <td className="w-10 px-3 py-2 align-middle">
                        {photoSrc ? (
                          <img
                            src={photoSrc}
                            alt=""
                            className="w-8 h-8 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-[color:var(--bg-raised)] flex items-center justify-center">
                            <LayoutGrid className="w-4 h-4 text-[color:var(--text-muted)]" aria-hidden="true" />
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 align-middle font-medium text-[color:var(--text-primary)]">
                        <Link
                          to={`/resources/${r.id}`}
                          className="hover:text-[color:var(--brand)] transition-colors"
                        >
                          {r.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 align-middle text-[color:var(--text-muted)]">
                        {t(RESOURCE_TYPE_LABEL_KEYS[r.type]) ?? r.type}
                      </td>
                      <td className="px-3 py-2.5 align-middle text-[color:var(--text-muted)]">
                        {r.floor}
                      </td>
                      <td className="px-3 py-2.5 align-middle text-[color:var(--text-muted)]">
                        {r.zone || '—'}
                      </td>
                      <td className="px-3 py-2.5 align-middle text-[color:var(--text-muted)]">
                        {r.capacity}
                      </td>
                      {isSuperadmin && (
                        <td className="px-3 py-2.5 align-middle text-[color:var(--text-muted)]">
                          {r.assigned_company_name ?? '—'}
                        </td>
                      )}
                      <td className="px-3 py-2.5 align-middle">
                        <ResourceStatusBadge resource={r} />
                      </td>
                      <td className="w-10 px-3 py-2.5 align-middle" />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk activate confirm dialog */}
      <ConfirmModal
        isOpen={confirmBulkActivate}
        onClose={() => !bulkActivateMutation.isPending && setConfirmBulkActivate(false)}
        onConfirm={() => bulkActivateMutation.mutate(Array.from(selectedIds))}
        title={t('resources.bulk.confirmActivateTitle')}
        description={t('resources.bulk.confirmActivateBody', { count: selectedIds.size })}
        variant="warning"
        isLoading={bulkActivateMutation.isPending}
      />

      {/* Bulk deactivate confirm dialog */}
      <ConfirmModal
        isOpen={confirmBulkDeactivate}
        onClose={() => setConfirmBulkDeactivate(false)}
        onConfirm={() => bulkDeactivateMutation.mutate(Array.from(selectedIds))}
        title={t('resources.bulk.confirmDeactivateTitle')}
        description={t('resources.bulk.confirmDeactivateBody', { count: selectedIds.size })}
        variant="warning"
        isLoading={bulkDeactivateMutation.isPending}
      />

      {/* Bulk delete confirm dialog */}
      <ConfirmModal
        isOpen={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
        title={t('resources.bulk.confirmDeleteTitle')}
        description={t('resources.bulk.confirmDeleteBody', { count: selectedIds.size })}
        variant="danger"
        isLoading={bulkDeleteMutation.isPending}
      />
    </div>
  );
}
