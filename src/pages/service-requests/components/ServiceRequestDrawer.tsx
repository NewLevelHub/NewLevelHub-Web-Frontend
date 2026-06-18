import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { FileText, Star, X } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  SERVICE_REQUEST_STATUSES,
  type ServiceRequestStatus,
  type ServiceRequestType,
} from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { cn } from '@/shared/lib/cn';
import { fmtDate } from '@/shared/lib/formatDate';
import type {
  CompanyMember,
  PaginatedResponse,
  ServiceRequest,
} from '@/shared/types';
import { AvatarCircle } from '@/pages/service-requests/components/ServiceRequestAvatar';
import { StatusBadge, UrgBadge, getTypeConfig, getStatusConfig } from '@/pages/service-requests/components/ServiceRequestBadges';
import { useServiceRequestMutations } from '@/pages/service-requests/hooks/useServiceRequestMutations';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  id: number | null;
  onClose: () => void;
  isAdmin: boolean;
  canChangeStatus?: boolean;
  isSuperadmin?: boolean;
  isServiceManager?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ServiceRequestDrawer({
  id,
  onClose,
  isAdmin,
  isSuperadmin = false,
  isServiceManager = false,
}: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const TYPE_CONFIG = getTypeConfig(t);

  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [assignedToId, setAssignedToId] = useState<number | ''>('');

  const {
    rateMutation,
    assignRequest,
    takeRequest,
    startRequest,
    completeRequest,
    actionPending,
  } = useServiceRequestMutations(id, (msg) => setDrawerError(msg), user?.id ? Number(user.id) : null);

  const [hoveredStar, setHoveredStar]   = useState(0);
  const [selectedStar, setSelectedStar] = useState(5);

  const isOpen = id !== null;

  // Reset assignee selection when drawer opens/closes for a different request
  useEffect(() => {
    setAssignedToId('');
    setDrawerError(null);
  }, [id]);

  const { data: buildingStaffData } = useQuery<PaginatedResponse<CompanyMember>>({
    queryKey: ['building-staff-for-assign'],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<CompanyMember>>(API.companies.buildingStaff)
        .then((r) => r.data),
    enabled: isSuperadmin && isOpen,
  });

  const buildingStaff = buildingStaffData?.results ?? [];

  const { data: request, isLoading } = useQuery<ServiceRequest>({
    queryKey: ['service-request', id],
    queryFn: () =>
      apiClient.get<ServiceRequest>(API.serviceRequests.detail(String(id))).then((r) => r.data),
    enabled: isOpen,
  });

  // ─── Computed values ──────────────────────────────────────────────────────

  const assignedUserId = request?.assigned_to?.id ?? null;
  const isAssignedToMe = assignedUserId !== null && Number(user?.id) === Number(assignedUserId);
  const requestAuthorId = request?.created_by?.id ?? null;
  const isAuthor = requestAuthorId !== null && Number(user?.id) === Number(requestAuthorId);

  const canRate =
    isAuthor &&
    request?.status === SERVICE_REQUEST_STATUSES.COMPLETED &&
    request.rating === null;

  const alreadyRated =
    isAuthor &&
    request?.status === SERVICE_REQUEST_STATUSES.COMPLETED &&
    request.rating !== null;

  function handleAssign() {
    if (!request || assignedToId === '') return;
    setDrawerError(null);
    assignRequest(Number(assignedToId));
  }

  function handleSubmitRating() {
    if (!request) return;
    rateMutation.mutate(
      { reqId: request.id, rating: selectedStar },
      {
        onError: () => {},
        onSuccess: () => setDrawerError(null),
      },
    );
  }

  const typeConfig = request
    ? (TYPE_CONFIG[request.request_type as ServiceRequestType] ?? { Icon: FileText, label: request.request_type, color: 'var(--text-secondary)', bg: 'var(--bg-raised)' })
    : null;

  const floorLabel = request
    ? (request.floor_number != null
        ? (request.floor_name?.trim() ? `${request.floor_number} — ${request.floor_name}` : String(request.floor_number))
        : '—')
    : '—';

  const authorName  = request ? (request.created_by?.full_name ?? '—') : '—';
  const assigneeName = request ? (request.assigned_to?.full_name ?? '—') : '—';
  const companyName  = request ? (request.company?.name ?? null) : null;

  const metaItems: [string, ReactNode][] = request ? [
    [t('serviceRequests.colFloor'), floorLabel],
    [t('serviceRequests.colLocation'), request.location || '—'],
    [t('serviceRequests.colCreated'), fmtDate(request.created_at)],
    [t('serviceRequests.managementAssign'), assigneeName !== '—' ? (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <AvatarCircle avatar={request.assigned_to?.avatar ?? null} name={assigneeName} />
        {assigneeName}
      </span>
    ) : '—'],
    ...(isAdmin ? [[t('serviceRequests.colAuthor'), (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <AvatarCircle avatar={request.created_by?.avatar} name={authorName} />
        {authorName}
      </span>
    )] as [string, ReactNode]] : []),
    ...(isSuperadmin && companyName ? [[t('serviceRequests.colCompany'), companyName] as [string, ReactNode]] : []),
    ...(request.status === SERVICE_REQUEST_STATUSES.COMPLETED && request.completed_at
      ? [[t('serviceRequests.colCompletedAt'), fmtDate(request.completed_at)] as [string, ReactNode]]
      : []),
  ] : [];

  // ─── Inline ActionButton helper ───────────────────────────────────────────

  function ActionButton({
    label,
    onClick,
    pending,
    variant = 'brand',
  }: {
    label: string;
    onClick: () => void;
    pending: boolean;
    variant?: 'brand' | 'success';
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className={variant !== 'success' ? 'bg-brand hover:bg-brand-hover text-on-brand' : ''}
        style={{
          height: 32,
          padding: '0 12px',
          borderRadius: 'var(--radius-sm)',
          border: 'none',
          fontSize: 13,
          fontWeight: 500,
          cursor: pending ? 'not-allowed' : 'pointer',
          opacity: pending ? 0.5 : 1,
          transition: 'background 0.15s',
          ...(variant === 'success' ? { background: 'var(--success)', color: '#fff' } : {}),
        }}
      >
        {pending ? t('common.submittingPlain') : label}
      </button>
    );
  }

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900 }}>
      {/* Overlay */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.15)', backdropFilter: 'blur(1px)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('serviceRequests.title')}
        style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: 420,
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border)',
          boxShadow: '-12px 0 32px rgba(0,0,0,0.08)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Head */}
        <div style={{
          padding: '20px 20px 14px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
          flexShrink: 0,
        }}>
          <div>
            {request && (
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 5,
                fontFamily: 'var(--font-mono)',
              }}>
                #{String(request.id).padStart(4, '0')}
              </div>
            )}
            {typeConfig && (
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <typeConfig.Icon size={15} style={{ color: typeConfig.color, flexShrink: 0 }} />
                {typeConfig.label}
              </div>
            )}
            {request && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <StatusBadge status={request.status} />
                <UrgBadge urgency={request.urgency} />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
              background: 'var(--bg-raised)', color: 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
            aria-label={t('common.close')}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {isLoading && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              {t('common.loading')}
            </div>
          )}

          {!isLoading && request && (
            <>
              {/* Meta grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {metaItems.map(([label, value]) => (
                  <div key={label} style={{
                    padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-raised)', border: '1px solid var(--border-faint)',
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Status flow — read-only display */}
              {(() => {
                const statusCfg = getStatusConfig(t);
                const statuses: ServiceRequestStatus[] = [
                  SERVICE_REQUEST_STATUSES.NEW,
                  SERVICE_REQUEST_STATUSES.ACCEPTED,
                  SERVICE_REQUEST_STATUSES.IN_PROGRESS,
                  SERVICE_REQUEST_STATUSES.COMPLETED,
                ];
                return (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {statuses.map((k) => {
                      const cfg = statusCfg[k];
                      const isActive = request.status === k;
                      return (
                        <span
                          key={k}
                          style={{
                            padding: '4px 12px', borderRadius: 20,
                            border: `1.5px solid ${isActive ? cfg.color : 'var(--border-faint)'}`,
                            background: isActive ? cfg.bg : 'transparent',
                            color: isActive ? cfg.color : 'var(--text-muted)',
                            fontSize: 11, fontWeight: isActive ? 600 : 400,
                            opacity: isActive ? 1 : 0.5,
                          }}
                        >
                          {cfg.label}
                        </span>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Description */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                  {t('serviceRequests.drawerDescription')}
                </div>
                <div style={{
                  padding: 12, borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-raised)', border: '1px solid var(--border-faint)',
                  fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6,
                }}>
                  {request.description || '—'}
                </div>
              </div>

              {/* Photo */}
              {request.photo && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    {t('serviceRequests.drawerPhoto')}
                  </div>
                  <a href={request.photo} target="_blank" rel="noreferrer">
                    <img
                      src={request.photo}
                      alt={t('serviceRequests.photoAlt')}
                      style={{ width: '100%', borderRadius: 8, objectFit: 'cover', maxHeight: 200, display: 'block' }}
                    />
                  </a>
                </div>
              )}

              {/* Superadmin: assignee dropdown — only when status === 'new' */}
              {isSuperadmin && request.status === SERVICE_REQUEST_STATUSES.NEW && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    {t('serviceRequests.fieldAssignee')}
                  </label>
                  <select
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(e.target.value === '' ? '' : Number(e.target.value))}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      height: 36, padding: '0 12px', fontSize: 13,
                      border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface)', color: 'var(--text-primary)',
                      fontFamily: 'inherit', appearance: 'none', outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">{t('serviceRequests.assigneeNoChange')}</option>
                    {buildingStaff.map((u) => (
                      <option key={u.id} value={u.id}>{u.full_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Superadmin: read-only assignee display for accepted / in_progress */}
              {isSuperadmin && (
                request.status === SERVICE_REQUEST_STATUSES.ACCEPTED ||
                request.status === SERVICE_REQUEST_STATUSES.IN_PROGRESS
              ) && request.assigned_to && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-raised)', border: '1px solid var(--border-faint)' }}>
                  <AvatarCircle avatar={request.assigned_to.avatar} name={request.assigned_to.full_name} size={24} />
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      {t('serviceRequests.fieldAssignee')}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                      {request.assigned_to.full_name}
                    </div>
                  </div>
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', padding: '2px 6px', borderRadius: 4, background: 'var(--bg-raised)', border: '1px solid var(--border-faint)' }}>
                    {t('serviceRequests.assigneeLocked')}
                  </span>
                </div>
              )}

              {/* Rating block — author only, completed status */}
              {(canRate || alreadyRated) && (
                <div style={{
                  padding: 18, borderRadius: 12,
                  background: alreadyRated ? 'var(--bg-raised)' : 'var(--success-bg)',
                  border: `1px solid ${alreadyRated ? 'var(--border)' : 'var(--success)'}`,
                }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {alreadyRated ? t('serviceRequests.rated') : t('serviceRequests.rateTitle')}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {t('serviceRequests.rateHint')}
                  </p>
                  <div style={{ display: 'flex', gap: 7, marginTop: 14 }}>
                    {[1, 2, 3, 4, 5].map((star) => {
                      const active = star <= (alreadyRated ? (request.rating ?? 0) : (hoveredStar || selectedStar));
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => !alreadyRated && setSelectedStar(star)}
                          onMouseEnter={() => !alreadyRated && setHoveredStar(star)}
                          onMouseLeave={() => !alreadyRated && setHoveredStar(0)}
                          disabled={alreadyRated || rateMutation.isPending}
                          style={{ background: 'none', border: 'none', cursor: alreadyRated ? 'default' : 'pointer', padding: 0 }}
                          aria-label={`${t('serviceRequests.rateTitle')} ${star}`}
                        >
                          <Star
                            size={30}
                            className={cn(
                              'transition-colors',
                              active ? 'fill-amber-400 stroke-amber-500' : 'text-muted',
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>
                  {canRate && (
                    <div style={{ marginTop: 14 }}>
                      <button
                        type="button"
                        onClick={handleSubmitRating}
                        disabled={rateMutation.isPending}
                        className="bg-brand hover:bg-brand-hover text-on-brand"
                        style={{
                          height: 32, padding: '0 12px', borderRadius: 'var(--radius-sm)',
                          border: 'none', fontSize: 13, fontWeight: 500,
                          cursor: 'pointer', opacity: rateMutation.isPending ? 0.5 : 1,
                          transition: 'background 0.15s',
                        }}
                      >
                        {rateMutation.isPending ? t('common.submittingPlain') : t('serviceRequests.rateSubmit')}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Error */}
              {drawerError && (
                <div
                  role="alert"
                  style={{
                    padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--danger)', background: 'var(--danger-bg)',
                    color: 'var(--danger-text)', fontSize: 13,
                  }}
                >
                  {drawerError}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0,
          background: 'var(--bg-raised)',
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 32, padding: '0 12px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            {t('serviceRequests.drawerClose')}
          </button>

          {/* ── status === 'new' ── */}
          {request?.status === SERVICE_REQUEST_STATUSES.NEW && (
            <>
              {/* Superadmin: take for myself — hidden when a staff member is selected */}
              {isSuperadmin && assignedToId === '' && (
                <ActionButton
                  label={t('serviceRequests.takeSelfBtn')}
                  onClick={() => takeRequest()}
                  pending={actionPending}
                />
              )}
              {/* Superadmin: assign to staff member */}
              {isSuperadmin && assignedToId !== '' && (
                <ActionButton
                  label={t('serviceRequests.assignBtn')}
                  onClick={handleAssign}
                  pending={actionPending}
                />
              )}
              {/* Service manager: take request */}
              {isServiceManager && (
                <ActionButton
                  label={t('serviceRequests.takeBtn')}
                  onClick={() => takeRequest()}
                  pending={actionPending}
                />
              )}
            </>
          )}

          {/* ── status === 'accepted' ── */}
          {request?.status === SERVICE_REQUEST_STATUSES.ACCEPTED && (
            <>
              {/* Service manager assigned to this request: start */}
              {isServiceManager && isAssignedToMe && (
                <ActionButton
                  label={t('serviceRequests.takeInProgressBtn')}
                  onClick={() => startRequest()}
                  pending={actionPending}
                />
              )}
            </>
          )}

          {/* ── status === 'in_progress' ── */}
          {request?.status === SERVICE_REQUEST_STATUSES.IN_PROGRESS && (
            <>
              {/* Superadmin assigned to this request OR service manager assigned to this request */}
              {isAssignedToMe && (isSuperadmin || isServiceManager) && (
                <ActionButton
                  label={t('serviceRequests.completeBtn')}
                  onClick={() => completeRequest()}
                  pending={actionPending}
                  variant="success"
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
