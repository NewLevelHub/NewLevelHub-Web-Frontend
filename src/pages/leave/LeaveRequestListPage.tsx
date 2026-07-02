import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Plus } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  LEAVE_STATUSES,
  LEAVE_STATUS_LABEL_KEYS,
  LEAVE_TYPES,
  LEAVE_TYPE_LABEL_KEYS,
  USER_ROLES,
  type LeaveStatus,
  type LeaveType,
} from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { getApiError } from '@/shared/lib/getApiError';
import { fmtDate } from '@/shared/lib/formatDate';
import type { LeaveBalance, LeaveRequest, PaginatedResponse, TeamLeaveBalance } from '@/shared/types';
import LeaveCreateModal from './components/LeaveCreateModal';
import LeaveActionModal from './components/LeaveActionModal';

const LIVE_REFETCH_MS = 15000;

// Table standards from CLAUDE.md
const thStyle: React.CSSProperties = {
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 500,
  color: 'var(--text-muted)',
  padding: '8px 12px',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 13,
  color: 'var(--text-primary)',
  verticalAlign: 'middle',
};

const selStyle: React.CSSProperties = {
  padding: '5px 10px',
  borderRadius: 7,
  border: '1px solid var(--border)',
  background: 'var(--bg-raised)',
  color: 'var(--text-primary)',
  fontSize: 12,
  fontFamily: 'inherit',
  outline: 'none',
  cursor: 'pointer',
};

// Type badge colors (semantically fixed per spec)
function getTypeStyle(leaveType: LeaveType): React.CSSProperties {
  switch (leaveType) {
    case LEAVE_TYPES.VACATION:
      return {
        color: 'var(--info)',
        background: 'color-mix(in srgb, var(--info) 12%, transparent)',
      };
    case LEAVE_TYPES.DAY_OFF:
      return {
        color: 'var(--brand-text)',
        background: 'var(--brand-subtle)',
      };
    case LEAVE_TYPES.SICK_LEAVE:
      return {
        color: 'var(--danger)',
        background: 'var(--danger-bg)',
      };
    case LEAVE_TYPES.REMOTE:
      return {
        color: 'var(--success)',
        background: 'var(--success-bg)',
      };
    default:
      return {
        color: 'var(--text-muted)',
        background: 'var(--bg-raised)',
      };
  }
}

// Status badge colors
function getStatusStyle(status: LeaveStatus): React.CSSProperties {
  switch (status) {
    case LEAVE_STATUSES.PENDING:
      return { color: 'var(--warning)', background: 'var(--warning-bg)' };
    case LEAVE_STATUSES.APPROVED:
      return { color: 'var(--success)', background: 'var(--success-bg)' };
    case LEAVE_STATUSES.REJECTED:
      return { color: 'var(--danger)', background: 'var(--danger-bg)' };
    case LEAVE_STATUSES.CANCELLED:
      return { color: 'var(--text-muted)', background: 'var(--bg-raised)' };
    default:
      return { color: 'var(--text-muted)', background: 'var(--bg-raised)' };
  }
}

// Period formatting: "dd.mm — dd.mm"
function fmtPeriod(startDate: string, endDate: string): string {
  const s = startDate.slice(5).replace('-', '.');
  const e = endDate.slice(5).replace('-', '.');
  return `${s} — ${e}`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ─── UserAvatar ───────────────────────────────────────────────────────────────

interface UserAvatarProps {
  avatar: string | null;
  fullName: string;
  size?: number;
}

function UserAvatar({ avatar, fullName, size = 24 }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const showImg = avatar && !imgError;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        background: showImg ? 'transparent' : 'var(--brand-subtle)',
        color: 'var(--brand-text)',
        fontSize: Math.round(size * 0.42),
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {showImg ? (
        <img
          src={avatar}
          alt={fullName}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setImgError(true)}
        />
      ) : (
        getInitials(fullName)
      )}
    </div>
  );
}

// ─── TeamBalanceRow ───────────────────────────────────────────────────────────

interface TeamBalanceRowProps {
  row: TeamLeaveBalance;
  year: number;
  onSave: (userId: number, totalDays: number) => void;
  isSaving: boolean;
}

function TeamBalanceRow({ row, year: _year, onSave, isSaving }: TeamBalanceRowProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(row.total_days));

  const pct = row.total_days > 0 ? Math.round((row.used_days / row.total_days) * 100) : 0;
  const isLocked = row.total_days > 0 && row.used_days >= row.total_days;

  const barColor =
    pct > 80
      ? 'var(--danger)'
      : pct > 50
        ? 'var(--warning)'
        : 'var(--brand)';

  const handleSave = () => {
    onSave(row.user.id, Number(value));
    setEditing(false);
  };

  const handleCancel = () => {
    setValue(String(row.total_days));
    setEditing(false);
  };

  return (
    <tr
      style={{ borderBottom: '1px solid var(--border)' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.background = '';
      }}
    >
      {/* Employee */}
      <td style={tdStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserAvatar avatar={row.user.avatar} fullName={row.user.full_name} />
          <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{row.user.full_name}</span>
        </div>
      </td>
      {/* Total */}
      <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
        {row.total_days}
      </td>
      {/* Used */}
      <td style={{ ...tdStyle, color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>
        {row.used_days}
      </td>
      {/* Remaining */}
      <td
        style={{
          ...tdStyle,
          color: 'var(--success)',
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
        }}
      >
        {row.remaining_days}
      </td>
      {/* Usage progress */}
      <td style={tdStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              flex: 1,
              height: 5,
              borderRadius: 3,
              background: 'var(--bg-raised)',
              overflow: 'hidden',
              minWidth: 60,
            }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: 3,
                width: `${Math.min(pct, 100)}%`,
                background: barColor,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 30 }}>
            {pct}%
          </span>
        </div>
        {isLocked && (
          <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2 }}>
            {t('leave.teamBalance.limitReached')}
          </div>
        )}
      </td>
      {/* Set balance */}
      <td style={tdStyle}>
        {editing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="number"
              min={0}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              style={{
                width: 64,
                height: 28,
                padding: '0 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: 12,
                outline: 'none',
                fontFamily: 'inherit',
              }}
              disabled={isSaving}
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              style={{
                height: 28,
                padding: '0 8px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'var(--brand)',
                color: 'var(--text-on-brand)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              ✓
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              style={{
                height: 28,
                padding: '0 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setValue(String(row.total_days)); setEditing(true); }}
            style={{
              height: 26,
              padding: '0 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {t('leave.teamBalance.edit')}
          </button>
        )}
      </td>
    </tr>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LeaveRequestListPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<LeaveStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<LeaveType | ''>('');
  const year = new Date().getFullYear();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [actionModal, setActionModal] = useState<{
    type: 'approve' | 'reject' | 'cancel_approval' | 'cancel';
    leaveId: number;
  } | null>(null);

  const statusOptions = useMemo(
    () => [
      { value: '' as const, label: t('leave.filters.allStatuses') },
      { value: LEAVE_STATUSES.PENDING, label: t(LEAVE_STATUS_LABEL_KEYS[LEAVE_STATUSES.PENDING]) },
      { value: LEAVE_STATUSES.APPROVED, label: t(LEAVE_STATUS_LABEL_KEYS[LEAVE_STATUSES.APPROVED]) },
      { value: LEAVE_STATUSES.REJECTED, label: t(LEAVE_STATUS_LABEL_KEYS[LEAVE_STATUSES.REJECTED]) },
      { value: LEAVE_STATUSES.CANCELLED, label: t(LEAVE_STATUS_LABEL_KEYS[LEAVE_STATUSES.CANCELLED]) },
    ],
    [t],
  );

  const typeOptions = useMemo(
    () => [
      { value: '' as const, label: t('leave.filters.allTypes') },
      { value: LEAVE_TYPES.VACATION, label: t(LEAVE_TYPE_LABEL_KEYS[LEAVE_TYPES.VACATION]) },
      { value: LEAVE_TYPES.DAY_OFF, label: t(LEAVE_TYPE_LABEL_KEYS[LEAVE_TYPES.DAY_OFF]) },
      { value: LEAVE_TYPES.SICK_LEAVE, label: t(LEAVE_TYPE_LABEL_KEYS[LEAVE_TYPES.SICK_LEAVE]) },
      { value: LEAVE_TYPES.REMOTE, label: t(LEAVE_TYPE_LABEL_KEYS[LEAVE_TYPES.REMOTE]) },
    ],
    [t],
  );

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    if (typeFilter) params.leave_type = typeFilter;
    params.year = String(year);
    return params;
  }, [statusFilter, typeFilter, year]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['leave-requests', queryParams],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<LeaveRequest>>(API.leave.requests, { params: queryParams })
        .then((r) => r.data),
    refetchInterval: LIVE_REFETCH_MS,
    refetchIntervalInBackground: true,
  });

  const { data: balance } = useQuery({
    queryKey: ['leave-balance', year],
    queryFn: () =>
      apiClient.get<LeaveBalance>(API.leave.balance, { params: { year } }).then((r) => r.data),
    refetchInterval: LIVE_REFETCH_MS,
    refetchIntervalInBackground: true,
  });

  const isAdmin = user?.role === USER_ROLES.COMPANY_ADMIN || user?.role === USER_ROLES.SUPERADMIN;

  const { data: teamBalances, isLoading: isTeamBalancesLoading } = useQuery({
    queryKey: ['leave-team-balance', year],
    queryFn: () =>
      apiClient
        .get<TeamLeaveBalance[]>(API.leave.balanceTeam, { params: { year } })
        .then((r) => r.data),
    enabled: isAdmin,
    refetchInterval: LIVE_REFETCH_MS,
    refetchIntervalInBackground: true,
  });

  const setBalanceMutation = useMutation({
    mutationFn: ({ userId, totalDays }: { userId: number; totalDays: number }) =>
      apiClient.post(API.leave.balanceSet, { user_id: userId, year, total_days: totalDays }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['leave-team-balance', year] });
      await queryClient.invalidateQueries({ queryKey: ['leave-balance', year] });
    },
  });

  const rows = data?.results ?? [];
  console.log('LeaveRequestListPage rows:', rows);
  const pendingCount = rows.filter((r) => r.status === LEAVE_STATUSES.PENDING).length;

  const totalDays = balance?.total_days ?? 0;
  const usedDays = balance?.used_days ?? 0;
  const remainingDays = balance?.remaining_days ?? 0;
  const usedPct = totalDays > 0 ? Math.round((usedDays / totalDays) * 100) : 0;
  const remainingPct = totalDays > 0 ? Math.round((remainingDays / totalDays) * 100) : 0;

  const handleActionSuccess = async () => {
    await queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    await queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
    await queryClient.invalidateQueries({ queryKey: ['leave-team-balance'] });
  };

  const showUserColumn = isAdmin;
  const isEmployee = user?.role === USER_ROLES.EMPLOYEE;
  const showActionsColumn = !isEmployee;
  const columnCount = (showUserColumn ? 1 : 0) + (showActionsColumn ? 1 : 0) + 6;

  return (
    <main className="mx-auto max-w-6xl space-y-5 p-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            {t('leave.pageTitle')}
            {isAdmin && pendingCount > 0 && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 20,
                  background: 'var(--warning-bg)',
                  color: 'var(--warning)',
                }}
              >
                {t('leave.pendingCount', { count: pendingCount })}
              </span>
            )}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            {isAdmin ? t('leave.subtitleCA') : t('leave.subtitleEmployee')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 h-[34px] px-3 text-[13px] font-medium bg-[color:var(--brand)] text-white rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity"
        >
          <Plus size={14} />
          {t('leave.newRequest')}
        </button>
      </div>

      {/* KPI balance cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {/* Total */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 16px',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>
            {t('leave.balance.total')}
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-primary)',
            }}
          >
            {totalDays}
          </div>
          <div
            style={{
              marginTop: 8,
              height: 4,
              borderRadius: 2,
              background: 'var(--bg-raised)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{ height: '100%', borderRadius: 2, width: '100%', background: 'var(--border)' }}
            />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
            {t('leave.balance.totalSub')}
          </div>
        </div>

        {/* Used */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 16px',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>
            {t('leave.balance.used')}
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              color: 'var(--warning)',
            }}
          >
            {usedDays}
          </div>
          <div
            style={{
              marginTop: 8,
              height: 4,
              borderRadius: 2,
              background: 'var(--bg-raised)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: 2,
                width: `${Math.min(usedPct, 100)}%`,
                background: 'var(--warning)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
            {t('leave.balance.usedSub')}
          </div>
        </div>

        {/* Remaining */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 16px',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>
            {t('leave.balance.remaining')}
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              color: 'var(--success)',
            }}
          >
            {remainingDays}
          </div>
          <div
            style={{
              marginTop: 8,
              height: 4,
              borderRadius: 2,
              background: 'var(--bg-raised)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: 2,
                width: `${Math.min(remainingPct, 100)}%`,
                background: 'var(--success)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
            {t('leave.balance.remainingSub')}
          </div>
        </div>
      </div>

      {/* Filters row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as LeaveStatus | '')}
          style={selStyle}
          aria-label={t('leave.filters.allStatuses')}
        >
          {statusOptions.map((opt) => (
            <option key={opt.value || 'all-status'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as LeaveType | '')}
          style={selStyle}
          aria-label={t('leave.filters.allTypes')}
        >
          {typeOptions.map((opt) => (
            <option key={opt.value || 'all-type'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>
          {t('leave.requestsCount', { count: rows.length })}
        </span>
      </div>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--danger)',
            background: 'var(--danger-bg)',
            color: 'var(--danger)',
            fontSize: 13,
          }}
        >
          {getApiError(error).message}
        </div>
      )}

      {/* Main table */}
      {isLoading ? (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-card)',
            padding: '48px 0',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 13,
          }}
        >
          {t('common.loading')}
        </div>
      ) : rows.length === 0 ? (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-card)',
            overflow: 'hidden',
          }}
        >
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{t('leave.empty')}</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>{t('leave.emptyHint')}</div>
          </div>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-card)',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {showUserColumn && <th style={thStyle}>{t('leave.table.employee')}</th>}
                <th style={thStyle}>{t('leave.table.type')}</th>
                <th style={thStyle}>{t('leave.table.period')}</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>{t('leave.table.days')}</th>
                <th style={thStyle}>{t('leave.table.status')}</th>
                <th style={thStyle}>{t('leave.table.submitted')}</th>
                <th style={thStyle}>{t('leave.table.comment')}</th>
                {showActionsColumn && <th style={thStyle}>{t('leave.table.actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((leave) => {
                const isExpanded = expandedId === leave.id;
                const isOwnLeave = leave.user.id === user?.id;
                const isAssignedToOther =
                  leave.assigned_reviewer != null && leave.assigned_reviewer.id !== user?.id;
                const canReview =
                  isAdmin &&
                  !isOwnLeave &&
                  (user?.role === USER_ROLES.SUPERADMIN || !isAssignedToOther);

                const typeStyle = getTypeStyle(leave.leave_type);
                const statusStyle = getStatusStyle(leave.status);

                return (
                  <>
                    <tr
                      key={leave.id}
                      style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--border)', cursor: 'pointer' }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background =
                          'var(--bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background = '';
                      }}
                      onClick={() => setExpandedId(isExpanded ? null : leave.id)}
                    >
                      {/* Employee */}
                      {showUserColumn && (
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <UserAvatar avatar={leave.user.avatar} fullName={leave.user.full_name?.trim() || 'U'} />
                            <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                              {leave.user.full_name?.trim() || `ID ${leave.user.id}`}
                            </span>
                          </div>
                        </td>
                      )}

                      {/* Type */}
                      <td style={tdStyle}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 500,
                            ...typeStyle,
                          }}
                        >
                          {t(LEAVE_TYPE_LABEL_KEYS[leave.leave_type]) ?? leave.leave_type}
                        </span>
                      </td>

                      {/* Period */}
                      <td style={tdStyle}>
                        <span
                          style={{
                            fontSize: 12,
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {fmtPeriod(leave.start_date, leave.end_date)}
                        </span>
                      </td>

                      {/* Days */}
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            fontSize: 13,
                            color: 'var(--text-primary)',
                          }}
                        >
                          {leave.duration_days ?? '—'}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={tdStyle}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '2px 8px',
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            ...statusStyle,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: statusStyle.color,
                              flexShrink: 0,
                            }}
                          />
                          {t(LEAVE_STATUS_LABEL_KEYS[leave.status]) ?? leave.status}
                        </span>
                      </td>

                      {/* Submitted */}
                      <td style={tdStyle}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {fmtDate(leave.created_at)}
                        </span>
                      </td>

                      {/* Comment */}
                      <td style={{ ...tdStyle, maxWidth: 160 }}>
                        {leave.comment ? (
                          <div
                            style={{
                              fontSize: 12,
                              color: 'var(--text-secondary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {leave.comment}
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                        )}
                        {leave.review_comment ? (
                          <div
                            style={{
                              fontSize: 11,
                              color: 'var(--brand-text)',
                              marginTop: 2,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {leave.review_comment}
                          </div>
                        ) : null}
                      </td>

                      {/* Actions */}
                      {showActionsColumn && (
                        <td
                          style={tdStyle}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {/* Admin actions */}
                            {isAdmin && (
                              <>
                                {canReview && leave.status === LEAVE_STATUSES.PENDING && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setActionModal({ type: 'approve', leaveId: leave.id })
                                      }
                                      style={{
                                        height: 26,
                                        padding: '0 8px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--success)',
                                        background: 'var(--success-bg)',
                                        color: 'var(--success)',
                                        fontSize: 11,
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        fontFamily: 'inherit',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {t('leave.action.approve')}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setActionModal({ type: 'reject', leaveId: leave.id })
                                      }
                                      style={{
                                        height: 26,
                                        padding: '0 8px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--danger)',
                                        background: 'var(--danger-bg)',
                                        color: 'var(--danger)',
                                        fontSize: 11,
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        fontFamily: 'inherit',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {t('leave.action.reject')}
                                    </button>
                                  </>
                                )}
                                {canReview && leave.status === LEAVE_STATUSES.APPROVED && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActionModal({ type: 'cancel_approval', leaveId: leave.id })
                                    }
                                    style={{
                                      height: 26,
                                      padding: '0 8px',
                                      borderRadius: 'var(--radius-sm)',
                                      border: '1px solid var(--warning)',
                                      background: 'var(--warning-bg)',
                                      color: 'var(--warning)',
                                      fontSize: 11,
                                      fontWeight: 500,
                                      cursor: 'pointer',
                                      fontFamily: 'inherit',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {t('leave.action.cancelApproval')}
                                  </button>
                                )}
                                {(!canReview ||
                                  (leave.status !== LEAVE_STATUSES.PENDING &&
                                    leave.status !== LEAVE_STATUSES.APPROVED)) && (
                                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                                )}
                              </>
                            )}

                            {/* Expand chevron */}
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : leave.id)}
                              style={{
                                width: 24,
                                height: 24,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 'var(--radius-sm)',
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                transition: 'transform 0.15s ease',
                                transform: isExpanded ? 'rotate(90deg)' : 'none',
                                flexShrink: 0,
                              }}
                              aria-label={isExpanded ? t('common.close') : 'Expand'}
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>

                    {/* Detail row */}
                    {isExpanded && (
                      <tr
                        key={`${leave.id}-detail`}
                        style={{ borderBottom: '1px solid var(--border)' }}
                      >
                        <td colSpan={columnCount} style={{ padding: 0 }}>
                          <div
                            style={{
                              padding: '16px 20px',
                              background: 'var(--bg-raised)',
                              borderTop: '1px solid var(--border-faint)',
                              display: 'grid',
                              gridTemplateColumns: 'repeat(4,1fr)',
                              gap: 20,
                            }}
                          >
                            {/* Duration */}
                            <div>
                              <div
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  color: 'var(--text-muted)',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.06em',
                                  marginBottom: 4,
                                }}
                              >
                                {t('leave.table.duration')}
                              </div>
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: 500,
                                  color: 'var(--text-primary)',
                                }}
                              >
                                {leave.duration_days
                                  ? t('leave.createModal.daysPreview', {
                                      count: leave.duration_days,
                                    })
                                  : '—'}
                              </div>
                            </div>

                            {/* Submitted */}
                            <div>
                              <div
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  color: 'var(--text-muted)',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.06em',
                                  marginBottom: 4,
                                }}
                              >
                                {t('leave.table.submitted')}
                              </div>
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: 500,
                                  color: 'var(--text-primary)',
                                }}
                              >
                                {fmtDate(leave.created_at)}
                              </div>
                            </div>

                            {/* Reviewed at */}
                            <div>
                              <div
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  color: 'var(--text-muted)',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.06em',
                                  marginBottom: 4,
                                }}
                              >
                                {t('leave.table.reviewedAt')}
                              </div>
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: 500,
                                  color: 'var(--text-primary)',
                                }}
                              >
                                {leave.reviewed_at ? fmtDate(leave.reviewed_at) : '—'}
                              </div>
                            </div>

                            {/* Reviewed by */}
                            <div>
                              <div
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  color: 'var(--text-muted)',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.06em',
                                  marginBottom: 4,
                                }}
                              >
                                {t('leave.table.reviewedBy')}
                              </div>
                              {(() => {
                                const reviewer = leave.reviewed_by ?? leave.assigned_reviewer;
                                if (!reviewer) return <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>—</span>;
                                return (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <UserAvatar avatar={reviewer.avatar} fullName={reviewer.full_name} />
                                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                                      {reviewer.full_name}
                                    </span>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Employee comment — full width if present */}
                            {leave.comment && (
                              <div style={{ gridColumn: '1 / -1' }}>
                                <div
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.06em',
                                    marginBottom: 4,
                                  }}
                                >
                                  {t('leave.table.employeeComment')}
                                </div>
                                <div
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 500,
                                    color: 'var(--text-primary)',
                                    wordBreak: 'break-word',
                                    whiteSpace: 'pre-wrap',
                                    overflowWrap: 'break-word',
                                  }}
                                >
                                  {leave.comment}
                                </div>
                              </div>
                            )}

                            {/* Admin comment — full width if present */}
                            {leave.review_comment && (
                              <div style={{ gridColumn: '1 / -1' }}>
                                <div
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.06em',
                                    marginBottom: 4,
                                  }}
                                >
                                  {t('leave.table.adminComment')}
                                </div>
                                <div
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 500,
                                    color: 'var(--brand-text)',
                                    wordBreak: 'break-word',
                                    whiteSpace: 'pre-wrap',
                                    overflowWrap: 'break-word',
                                  }}
                                >
                                  {leave.review_comment}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Team balance table (admin only) */}
      {isAdmin && (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-card)',
            overflow: 'hidden',
          }}
        >
          {/* Section header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              {t('leave.teamBalance.title')}
            </span>
            {teamBalances && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {t('leave.teamBalance.employees', { count: teamBalances.length })}
              </span>
            )}
          </div>

          {isTeamBalancesLoading ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              {t('leave.loadingBalances')}
            </div>
          ) : !teamBalances?.length ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              {t('leave.noEmployees')}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={thStyle}>{t('leave.table.employee')}</th>
                    <th style={thStyle}>{t('leave.teamBalance.total')}</th>
                    <th style={thStyle}>{t('leave.teamBalance.used')}</th>
                    <th style={thStyle}>{t('leave.teamBalance.remaining')}</th>
                    <th style={{ ...thStyle, minWidth: 100 }}>{t('leave.teamBalance.usage')}</th>
                    <th style={thStyle}>{t('leave.teamBalance.setBalance')}</th>
                  </tr>
                </thead>
                <tbody>
                  {teamBalances.map((row) => (
                    <TeamBalanceRow
                      key={row.user.id}
                      row={row}
                      year={year}
                      onSave={(userId, totalDays) => {
                        setBalanceMutation.mutate({ userId, totalDays });
                      }}
                      isSaving={setBalanceMutation.isPending}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create modal */}
      <LeaveCreateModal open={createOpen} onClose={() => setCreateOpen(false)} />

      {/* Action modal */}
      <LeaveActionModal
        open={actionModal !== null}
        actionType={actionModal?.type ?? null}
        leaveId={actionModal?.leaveId ?? null}
        onClose={() => setActionModal(null)}
        onSuccess={handleActionSuccess}
      />
    </main>
  );
}
