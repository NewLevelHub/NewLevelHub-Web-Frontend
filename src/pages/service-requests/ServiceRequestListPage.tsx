import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dateLocaleTag } from '@/shared/lib/localeFormat';
import { fmtDate } from '@/shared/lib/formatDate';
import { Star } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  SERVICE_REQUEST_STATUSES,
  SERVICE_REQUEST_STATUS_LABEL_KEYS,
  SERVICE_REQUEST_STATUS_TRANSITIONS,
  SERVICE_REQUEST_TYPES,
  SERVICE_REQUEST_TYPE_LABEL_KEYS,
  USER_ROLES,
  type ServiceRequestStatus,
  type ServiceRequestType,
} from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { getApiError } from '@/shared/lib/getApiError';
import { cn } from '@/shared/lib/cn';
import type {
  PaginatedResponse,
  ServiceRequest,
  ServiceRequestAssignPayload,
  ServiceRequestRatePayload,
  ServiceRequestUpdateStatusPayload,
} from '@/shared/types';

const STATUS_BADGE_CLASS: Record<ServiceRequestStatus, string> = {
  [SERVICE_REQUEST_STATUSES.NEW]: 'bg-sky-900/60 text-sky-300',
  [SERVICE_REQUEST_STATUSES.ACCEPTED]: 'bg-warning-subtle text-warning',
  [SERVICE_REQUEST_STATUSES.IN_PROGRESS]: 'bg-brand-subtle text-brand',
  [SERVICE_REQUEST_STATUSES.COMPLETED]: 'bg-success-subtle text-success',
};

type ServiceFloorOption = {
  id: number;
  number?: number;
  floor_number?: number;
  name?: string | null;
};

type BookingResourceOption = { id: number; name: string };

function normalizeServiceFloors(payload: ServiceFloorOption[] | PaginatedResponse<ServiceFloorOption>) {
  return Array.isArray(payload) ? payload : payload.results;
}

function formatFloorOptionLabel(floor: ServiceFloorOption, tFn: (key: string, opts?: Record<string, unknown>) => string): string {
  const floorNumber = floor.number ?? floor.floor_number ?? floor.id;
  const floorName = floor.name?.trim();
  return floorName
    ? tFn('resources.create.floorOptionWithName', { number: floorNumber, name: floorName })
    : tFn('resources.create.floorOptionNoName', { number: floorNumber });
}

/** Prefer API floor_number/floor_name; otherwise resolve Floor id against loaded floors (never show raw DB id). */
function formatServiceRequestFloorCell(req: ServiceRequest, floors: ServiceFloorOption[], tFn: (key: string, opts?: Record<string, unknown>) => string): string {
  const n = req.floor_number;
  const name = req.floor_name?.trim();
  if (n != null) {
    return name
      ? tFn('resources.create.floorOptionWithName', { number: n, name })
      : tFn('resources.create.floorOptionNoName', { number: n });
  }
  if (req.floor != null) {
    const match = floors.find((f) => f.id === req.floor);
    if (match) return formatFloorOptionLabel(match, tFn);
  }
  return '—';
}

type CreateModalState = { mode: 'general' };

function getRequestOwnerId(request: ServiceRequest): number | null {
  const requestWithFallback = request as ServiceRequest & { user?: number; created_by?: number };
  const ownerId = requestWithFallback.user ?? requestWithFallback.created_by;
  return ownerId != null ? Number(ownerId) : null;
}

function getRequestOwnerName(request: ServiceRequest): string | null {
  const requestWithFallback = request as ServiceRequest & {
    user_name?: string | null;
    created_by_name?: string | null;
  };
  return requestWithFallback.user_name ?? requestWithFallback.created_by_name ?? null;
}

export default function ServiceRequestListPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = dateLocaleTag(i18n.language);
  const typeOptions = useMemo(
    () => [
      { value: '' as const, label: t('common.bookingFilter.allTypes') },
      { value: SERVICE_REQUEST_TYPES.CLEANING, label: t(SERVICE_REQUEST_TYPE_LABEL_KEYS[SERVICE_REQUEST_TYPES.CLEANING]) },
      { value: SERVICE_REQUEST_TYPES.REPAIR, label: t(SERVICE_REQUEST_TYPE_LABEL_KEYS[SERVICE_REQUEST_TYPES.REPAIR]) },
      { value: SERVICE_REQUEST_TYPES.SUPPLIES, label: t(SERVICE_REQUEST_TYPE_LABEL_KEYS[SERVICE_REQUEST_TYPES.SUPPLIES]) },
      { value: SERVICE_REQUEST_TYPES.GENERAL, label: t(SERVICE_REQUEST_TYPE_LABEL_KEYS[SERVICE_REQUEST_TYPES.GENERAL]) },
    ],
    [t],
  );
  const statusOptions = useMemo(
    () => [
      { value: '' as const, label: t('serviceRequests.filters.allStatuses') },
      { value: SERVICE_REQUEST_STATUSES.NEW, label: t(SERVICE_REQUEST_STATUS_LABEL_KEYS[SERVICE_REQUEST_STATUSES.NEW]) },
      { value: SERVICE_REQUEST_STATUSES.ACCEPTED, label: t(SERVICE_REQUEST_STATUS_LABEL_KEYS[SERVICE_REQUEST_STATUSES.ACCEPTED]) },
      { value: SERVICE_REQUEST_STATUSES.IN_PROGRESS, label: t(SERVICE_REQUEST_STATUS_LABEL_KEYS[SERVICE_REQUEST_STATUSES.IN_PROGRESS]) },
      { value: SERVICE_REQUEST_STATUSES.COMPLETED, label: t(SERVICE_REQUEST_STATUS_LABEL_KEYS[SERVICE_REQUEST_STATUSES.COMPLETED]) },
    ],
    [t],
  );
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [typeFilter, setTypeFilter] = useState<ServiceRequestType | ''>('');
  const [statusFilter, setStatusFilter] = useState<ServiceRequestStatus | ''>('');
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Create modal state
  const [createModal, setCreateModal] = useState<CreateModalState | null>(null);
  const [createType, setCreateType] = useState<ServiceRequestType>(SERVICE_REQUEST_TYPES.GENERAL);
  const [createDescription, setCreateDescription] = useState('');
  const [createFloorId, setCreateFloorId] = useState('');
  const [createLocation, setCreateLocation] = useState('');
  const [createResourceId, setCreateResourceId] = useState('');
  const [createUrgency, setCreateUrgency] = useState<'normal' | 'urgent'>('normal');
  const [createPhoto, setCreatePhoto] = useState<File | null>(null);

  // Rate modal state
  const [rateModal, setRateModal] = useState<{ requestId: number; autoOpened?: boolean } | null>(null);
  const [ratingValue, setRatingValue] = useState(5);

  const isAdmin =
    user?.role === USER_ROLES.SUPERADMIN ||
    user?.role === USER_ROLES.COMPANY_ADMIN ||
    user?.role === USER_ROLES.SERVICE_MANAGER;
  // All management actions (status + assign) are reserved for superadmin and
  // service_manager. company_admin can only create requests on behalf of their
  // company (matches IsServiceRequestManager on the backend).
  const canChangeStatus =
    user?.role === USER_ROLES.SUPERADMIN ||
    user?.role === USER_ROLES.SERVICE_MANAGER;
  const canAssign = canChangeStatus;
  const isServiceManager = user?.role === USER_ROLES.SERVICE_MANAGER;

  const queryParams: Record<string, string> = {};
  if (typeFilter) queryParams.type = typeFilter;
  if (statusFilter) queryParams.status = statusFilter;

  const { data, isLoading, error } = useQuery({
    queryKey: ['service-requests', queryParams],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<ServiceRequest>>(API.serviceRequests.list, { params: queryParams })
        .then((r) => r.data),
  });

  const {
    data: floors = [],
    isLoading: isFloorsLoading,
    error: floorsError,
  } = useQuery({
    queryKey: ['building-floors'],
    queryFn: () =>
      apiClient
        .get<ServiceFloorOption[] | PaginatedResponse<ServiceFloorOption>>(API.serviceRequests.floors, {
          params: { page_size: 500 },
        })
        .then((r) => normalizeServiceFloors(r.data)),
  });

  const createMutation = useMutation({
    mutationFn: (payload: FormData) =>
      apiClient.post<ServiceRequest>(API.serviceRequests.create, payload).then((r) => r.data),
    onSuccess: async () => {
      setMutationError(null);
      closeCreateModal(true);
      await queryClient.invalidateQueries({ queryKey: ['service-requests'] });
    },
    onError: (err) => {
      setMutationError(getApiError(err).message);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ServiceRequestStatus; isOwner: boolean }) =>
      apiClient
        .patch<ServiceRequest>(API.serviceRequests.updateStatus(String(id)), {
          status,
        } satisfies ServiceRequestUpdateStatusPayload)
        .then((r) => r.data),
    onSuccess: async (updatedRequest, variables) => {
      setMutationError(null);
      await queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      if (
        variables.status === SERVICE_REQUEST_STATUSES.COMPLETED &&
        variables.isOwner &&
        updatedRequest.rating === null
      ) {
        openRateModal(variables.id, true);
      }
    },
    onError: (err) => {
      setMutationError(getApiError(err).message);
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, assigned_to }: { id: number; assigned_to: number | null }) =>
      apiClient
        .patch<ServiceRequest>(API.serviceRequests.assign(String(id)), {
          assigned_to,
        } satisfies ServiceRequestAssignPayload)
        .then((r) => r.data),
    onSuccess: async () => {
      setMutationError(null);
      await queryClient.invalidateQueries({ queryKey: ['service-requests'] });
    },
    onError: (err) => {
      setMutationError(getApiError(err).message);
    },
  });

  const rateMutation = useMutation({
    mutationFn: ({ id, rating }: { id: number; rating: number }) =>
      apiClient
        .post<ServiceRequest>(API.serviceRequests.rate(String(id)), {
          rating,
        } satisfies ServiceRequestRatePayload)
        .then((r) => r.data),
    onSuccess: async () => {
      setMutationError(null);
      setRateModal(null);
      await queryClient.invalidateQueries({ queryKey: ['service-requests'] });
    },
    onError: (err) => {
      setMutationError(getApiError(err).message);
    },
  });

  function openGeneralModal() {
    setCreateType(SERVICE_REQUEST_TYPES.GENERAL);
    setCreateDescription('');
    setCreateFloorId('');
    setCreateLocation('');
    setCreateResourceId('');
    setCreateUrgency('normal');
    setCreatePhoto(null);
    setMutationError(null);
    setCreateModal({ mode: 'general' });
  }

  // Resolve floor number from selected floor id for resource fetching
  const selectedFloorNumber: number | null = (() => {
    if (!createFloorId) return null;
    const floor = floors.find((f) => String(f.id) === createFloorId);
    return floor?.number ?? floor?.floor_number ?? null;
  })();

  const { data: floorResourcesData, isLoading: isResourcesLoading } = useQuery({
    queryKey: ['booking-resources-by-floor', selectedFloorNumber],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<BookingResourceOption>>(API.bookings.resources.list, {
          params: { floor: selectedFloorNumber, is_active: true, page_size: 100 },
        })
        .then((r) => (Array.isArray(r.data) ? r.data : r.data.results) as BookingResourceOption[]),
    enabled: selectedFloorNumber !== null,
    staleTime: 30_000,
  });
  const floorResources: BookingResourceOption[] = floorResourcesData ?? [];

  function handleCreateFloorChange(floorId: string) {
    setCreateFloorId(floorId);
    setCreateResourceId('');
    // Don't clear location — user may have typed something already
  }

  function closeCreateModal(force = false) {
    if (!force && createMutation.isPending) return;
    setCreateModal(null);
    setMutationError(null);
  }

  function handleCreateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMutationError(null);

    if (!createModal) return;
    if (!createFloorId) {
      setMutationError(t('resources.create.floorRequired'));
      return;
    }
    if (!createLocation.trim()) {
      setMutationError(t('serviceRequests.locationRequired'));
      return;
    }
    if (!createDescription.trim()) {
      setMutationError(t('serviceRequests.descriptionRequired'));
      return;
    }

    const payload = new FormData();
    payload.append('request_type', createType);
    payload.append('description', createDescription.trim());
    payload.append('urgency', createUrgency);
    payload.append('floor', createFloorId);
    payload.append('location', createLocation.trim());
    if (createPhoto) payload.append('photo', createPhoto);
    createMutation.mutate(payload);
  }

  function handleUpdateStatus(request: ServiceRequest) {
    const next = SERVICE_REQUEST_STATUS_TRANSITIONS[request.status];
    if (!next) return;
    const ownerId = getRequestOwnerId(request);
    const isOwner = user?.id != null && ownerId != null && Number(user.id) === ownerId;
    updateStatusMutation.mutate({ id: request.id, status: next, isOwner });
  }

  function openRateModal(requestId: number, autoOpened = false) {
    setRatingValue(5);
    setMutationError(null);
    setRateModal({ requestId, autoOpened });
  }

  function closeRateModal() {
    if (rateMutation.isPending) return;
    setRateModal(null);
  }

  const rows = data?.results ?? [];
  const isPendingMutation =
    createMutation.isPending ||
    updateStatusMutation.isPending ||
    assignMutation.isPending ||
    rateMutation.isPending;

  // Service manager can only hold 1 active (non-completed) request at a time.
  // Check the current page's data to hide the "take" button proactively.
  const serviceManagerHasActive =
    isServiceManager &&
    user?.id != null &&
    rows.some(
      (r) =>
        Number(r.assigned_to) === Number(user.id) &&
        r.status !== SERVICE_REQUEST_STATUSES.COMPLETED,
    );

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-primary">{t('serviceRequests.title')}</h1>
        {isServiceManager ? null : (
          <button
            type="button"
            onClick={openGeneralModal}
            className="inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
          >
            {t('serviceRequests.createRequest')}
          </button>
        )}
      </div>

      {/* Filters */}
      <section className="grid gap-3 rounded-xl border border-default bg-raised p-4 sm:grid-cols-2">
        <label className="text-sm text-secondary">
          {t('serviceRequests.filterType')}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ServiceRequestType | '')}
            className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
          >
            {typeOptions.map((opt) => (
              <option key={opt.value || 'all-types'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-secondary">{t('common.status')}<select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ServiceRequestStatus | '')}
            className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value || 'all-statuses'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      {/* Mutation error */}
      {mutationError ? (
        <div
          className="rounded-lg border border-rose-800 bg-rose-950/30 px-3 py-2 text-sm text-rose-300"
          role="alert"
        >
          {mutationError}
        </div>
      ) : null}

      {/* Query error */}
      {error ? (
        <div
          className="rounded-lg border border-rose-800 bg-rose-950/30 px-3 py-2 text-sm text-rose-300"
          role="alert"
        >
          {getApiError(error).message}
        </div>
      ) : null}

      {/* List */}
      {isLoading ? (
        <p className="text-sm text-secondary">{t('common.loading')}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-secondary">{t('serviceRequests.noRequests')}</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-default bg-raised">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[color:var(--border)]/60">
              <thead className="bg-surface/60">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary">{t('serviceRequests.columnType')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary">{t('common.status')}</th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary">{t('team.roleEmployee')}</th>
                  )}
                  {isAdmin && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary">{t('common.assignee')}</th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary">{t('serviceRequests.columnDescription')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary">{t('serviceRequests.columnPhoto')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary">{t('serviceRequests.columnFloor')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary">{t('serviceRequests.columnCreated')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary">{t('serviceRequests.columnRating')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary">{t('serviceRequests.columnActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]/60">
                {rows.map((req) => {
                  const nextStatus = SERVICE_REQUEST_STATUS_TRANSITIONS[req.status];
                  const ownerId = getRequestOwnerId(req);
                  const isOwner = user?.id != null && ownerId != null && Number(user.id) === ownerId;
                  const canRate =
                    isOwner &&
                    req.status === SERVICE_REQUEST_STATUSES.COMPLETED &&
                    req.rating === null;

                  return (
                    <tr key={req.id} className="text-sm text-secondary">
                      <td className="px-4 py-3">
                        {t(SERVICE_REQUEST_TYPE_LABEL_KEYS[req.request_type]) ?? req.request_type}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                            STATUS_BADGE_CLASS[req.status],
                          )}
                        >
                          {t(SERVICE_REQUEST_STATUS_LABEL_KEYS[req.status]) ?? req.status}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="whitespace-nowrap px-4 py-3 text-secondary">
                          {getRequestOwnerName(req) || '—'}
                        </td>
                      )}
                      {isAdmin && (
                        <td className="whitespace-nowrap px-4 py-3 text-secondary">
                          {req.assigned_to_name || '—'}
                        </td>
                      )}
                      <td className="max-w-xs px-4 py-3 text-secondary">
                        <span className="line-clamp-2">{req.description || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {req.photo ? (
                          <a
                            href={req.photo}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-xs text-sky-300 hover:text-sky-200"
                          >
                            <img
                              src={req.photo}
                              alt={t('serviceRequests.photoAlt')}
                              className="h-8 w-8 rounded object-cover ring-1 ring-gray-600"
                            />
                            {t('serviceRequests.openPhoto')}
                          </a>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{formatServiceRequestFloorCell(req, floors, t)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-secondary">
                        {fmtDate(req.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        {req.rating !== null ? (
                          <span className="flex items-center gap-1 text-amber-400">
                            <Star className="h-3.5 w-3.5 fill-amber-400" aria-hidden="true" />
                            {req.rating}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {/* Admin / service_manager: advance status.
                              Service managers can only act on their own assigned request. */}
                          {canChangeStatus &&
                          nextStatus &&
                          (!isServiceManager || req.assigned_to === Number(user?.id)) ? (
                            <button
                              type="button"
                              disabled={isPendingMutation}
                              onClick={() => handleUpdateStatus(req)}
                              className="rounded-md border border-default bg-brand-subtle px-2 py-1 text-xs text-brand hover:bg-brand-subtle disabled:opacity-50"
                            >
                              {t(SERVICE_REQUEST_STATUS_LABEL_KEYS[nextStatus])}
                            </button>
                          ) : null}

                          {/* Admin / service_manager: self-assign or unassign */}
                          {canAssign && req.status !== SERVICE_REQUEST_STATUSES.COMPLETED ? (
                            user?.id != null && req.assigned_to === Number(user.id) ? (
                              // Service managers cannot unassign themselves — only superadmin can
                              !isServiceManager ? (
                                <button
                                  type="button"
                                  disabled={isPendingMutation}
                                  onClick={() =>
                                    assignMutation.mutate({ id: req.id, assigned_to: null })
                                  }
                                  className="rounded-md border border-default px-2 py-1 text-xs text-secondary hover:bg-hover disabled:opacity-50"
                                >
                                  Снять с себя
                                </button>
                              ) : null
                            ) : user?.id != null && (!isServiceManager || !req.assigned_to) && !serviceManagerHasActive ? (
                              <button
                                type="button"
                                disabled={isPendingMutation}
                                onClick={() =>
                                  assignMutation.mutate({
                                    id: req.id,
                                    assigned_to: Number(user.id),
                                  })
                                }
                                className="rounded-md border border-default bg-surface px-2 py-1 text-xs text-primary hover:bg-hover disabled:opacity-50"
                              >
                                {!isServiceManager && req.assigned_to_name ? 'Переназначить на себя' : 'Взять в работу'}
                              </button>
                            ) : null
                          ) : null}

                          {/* Employee: rate completed request */}
                          {canRate ? (
                            <button
                              type="button"
                              disabled={isPendingMutation}
                              onClick={() => openRateModal(req.id)}
                              aria-label={t('serviceRequests.rateAriaLabel')}
                              className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm hover:bg-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 disabled:opacity-50"
                            >
                              <Star className="h-3.5 w-3.5 fill-gray-900" aria-hidden="true" />
                              {t('serviceRequests.rateRequest')}
                            </button>
                          ) : null}

                          {!canChangeStatus && !canAssign && !canRate ? (
                            <span className="text-xs text-muted">—</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create General Modal */}
      {createModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeCreateModal();
          }}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-default bg-raised p-5"
          >
            <h2 className="text-lg font-semibold text-primary">{t('serviceRequests.newRequestTitle')}</h2>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              {/* Type selector */}
              <label className="block text-sm text-secondary">
                {t('serviceRequests.requestTypeLabel')}
                <select
                  value={createType}
                  onChange={(e) => setCreateType(e.target.value as ServiceRequestType)}
                  className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
                >
                  {typeOptions.filter((opt) => opt.value !== '').map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              {/* Floor */}
              <label className="block text-sm text-secondary">
                {t('serviceRequests.floorSelect')}
                <p className="mt-1 text-xs text-muted">{t('serviceRequests.floorHint')}</p>
                <select
                  value={createFloorId}
                  onChange={(e) => handleCreateFloorChange(e.target.value)}
                  disabled={isFloorsLoading}
                  required
                  className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
                >
                  {isFloorsLoading ? (
                    <option value="">{t('serviceRequests.floorLoading')}</option>
                  ) : (
                    <>
                      <option value="">{t('serviceRequests.selectFloor')}</option>
                      {floors.length === 0 ? (
                        <option value="__no_floors" disabled>
                          {t('serviceRequests.noFloors')}
                        </option>
                      ) : (
                        floors.map((floor) => (
                          <option key={floor.id} value={String(floor.id)}>
                            {formatFloorOptionLabel(floor, t)}
                          </option>
                        ))
                      )}
                    </>
                  )}
                </select>
                {floorsError ? (
                  <p className="mt-1 text-xs text-warning">{t('serviceRequests.floorLoadError')}</p>
                ) : null}
              </label>

              {/* Resource (optional, loaded from floor) */}
              {createFloorId ? (
                <label className="block text-sm text-secondary">
                  Ресурс (необязательно)
                  <select
                    value={createResourceId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setCreateResourceId(id);
                      if (id) {
                        const resource = floorResources.find((r) => String(r.id) === id);
                        if (resource) setCreateLocation(resource.name);
                      }
                    }}
                    disabled={isResourcesLoading}
                    className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
                  >
                    <option value="">
                      {isResourcesLoading
                        ? 'Загрузка ресурсов...'
                        : floorResources.length === 0
                          ? 'Нет ресурсов на этом этаже'
                          : 'Не выбрано'}
                    </option>
                    {floorResources.map((r) => (
                      <option key={r.id} value={String(r.id)}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="block text-sm text-secondary">
                {t('serviceRequests.locationLabel')}
                <input
                  type="text"
                  value={createLocation}
                  onChange={(e) => setCreateLocation(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
                  placeholder={t('serviceRequests.locationPlaceholder')}
                />
              </label>

              {/* Description */}
              <label className="block text-sm text-secondary">
                {t('serviceRequests.descriptionLabel')}
                <textarea
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  rows={3}
                  required
                  className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted"
                  placeholder={t('serviceRequests.descriptionPlaceholder')}
                />
              </label>

              <label className="block text-sm text-secondary">
                {t('serviceRequests.photoLabel')}
                <input
                  type="file"
                  accept="image/*"
                  lang={dateLocale}
                  onChange={(e) => setCreatePhoto(e.target.files?.[0] ?? null)}
                  className="mt-1 block w-full cursor-pointer rounded-lg border border-default bg-surface px-3 py-2 text-sm text-secondary file:mr-3 file:rounded-md file:border-0 file:bg-hover file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary hover:file:bg-gray-600"
                />
                {createPhoto ? (
                  <p className="mt-1 text-xs text-secondary">{t('serviceRequests.selectedFile', { name: createPhoto.name })}</p>
                ) : null}
              </label>

              {/* Urgency */}
              <label className="block text-sm text-secondary">
                {t('serviceRequests.urgencyLabel')}
                <select
                  value={createUrgency}
                  onChange={(e) => setCreateUrgency(e.target.value as 'normal' | 'urgent')}
                  className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
                >
                  <option value="normal">{t('serviceRequests.urgencyNormal')}</option>
                  <option value="urgent">{t('serviceRequests.urgencyUrgent')}</option>
                </select>
              </label>

              {mutationError ? (
                <div
                  className="rounded-lg border border-rose-800 bg-rose-950/30 px-3 py-2 text-sm text-rose-300"
                  role="alert"
                >
                  {mutationError}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => closeCreateModal()}
                  disabled={createMutation.isPending}
                  className="rounded-lg border border-default px-3 py-2 text-sm text-secondary hover:bg-hover"
                >{t('common.cancel')}</button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
                >
                  {createMutation.isPending ? t('common.submittingPlain') : t('serviceRequests.createRequest')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Rate Modal */}
      {rateModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeRateModal();
          }}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-default bg-raised p-5"
          >
            <h2 className="text-lg font-semibold text-primary">
              {rateModal.autoOpened ? t('serviceRequests.rateAuto') : t('serviceRequests.rateTitle')}
            </h2>
            <p className="mt-1 text-sm text-secondary">
              {rateModal.autoOpened
                ? t('serviceRequests.rateAutoHint')
                : t('serviceRequests.ratePrompt')}
            </p>

            <div className="mt-4 flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatingValue(star)}
                  aria-label={`Оценка ${star}`}
                  className="focus:outline-none"
                >
                  <Star
                    className={cn(
                      'h-8 w-8 transition-colors',
                      star <= ratingValue
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-gray-700 text-muted hover:text-warning',
                    )}
                  />
                </button>
              ))}
            </div>

            {mutationError ? (
              <div
                className="mt-3 rounded-lg border border-rose-800 bg-rose-950/30 px-3 py-2 text-sm text-rose-300"
                role="alert"
              >
                {mutationError}
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeRateModal}
                disabled={rateMutation.isPending}
                className="rounded-lg border border-default px-3 py-2 text-sm text-secondary hover:bg-hover"
              >{t('common.cancel')}</button>
              <button
                type="button"
                disabled={rateMutation.isPending}
                onClick={() =>
                  rateMutation.mutate({ id: rateModal.requestId, rating: ratingValue })
                }
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-primary hover:bg-amber-500 disabled:opacity-50"
              >
                {rateMutation.isPending ? 'Сохраняем...' : 'Отправить оценку'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
