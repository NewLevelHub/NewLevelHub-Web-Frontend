import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
import { cn } from '@/shared/lib/cn';
import type { LeaveBalance, LeaveRequest, PaginatedResponse, TeamLeaveBalance } from '@/shared/types';
import { Button } from '@/shared/ui/Button';
import { useReviewerOptions } from './useReviewerOptions';


const STATUS_BADGE_CLASS: Record<LeaveStatus, string> = {
  [LEAVE_STATUSES.PENDING]: 'bg-warning-subtle text-warning',
  [LEAVE_STATUSES.APPROVED]: 'bg-success-subtle text-success',
  [LEAVE_STATUSES.REJECTED]: 'bg-rose-900/60 text-rose-300',
  [LEAVE_STATUSES.CANCELLED]: 'bg-[color:var(--bg-hover)] text-muted',
};
const LIVE_REFETCH_MS = 15000;
type ReviewStatus = Extract<LeaveStatus, 'approved' | 'rejected'>;
type ReviewDialogState = {
  leaveId: number;
  status: ReviewStatus;
};

export default function LeaveRequestListPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<LeaveType | ''>('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [teamTotals, setTeamTotals] = useState<Record<number, string>>({});
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [reviewDialog, setReviewDialog] = useState<ReviewDialogState | null>(null);
  const [reviewCommentInput, setReviewCommentInput] = useState('');
  const [cancelConfirmId, setCancelConfirmId] = useState<number | null>(null);

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
      apiClient.get<PaginatedResponse<LeaveRequest>>(API.leave.requests, { params: queryParams }).then(r => r.data),
    refetchInterval: LIVE_REFETCH_MS,
    refetchIntervalInBackground: true,
  });

  const { data: balance } = useQuery({
    queryKey: ['leave-balance', year],
    queryFn: () => apiClient.get<LeaveBalance>(API.leave.balance, { params: { year } }).then(r => r.data),
    refetchInterval: LIVE_REFETCH_MS,
    refetchIntervalInBackground: true,
  });

  const isAdmin = user?.role === USER_ROLES.COMPANY_ADMIN || user?.role === USER_ROLES.SUPERADMIN;
  const { isCompanyAdmin, options: reviewerOptions, isLoading: reviewersLoading } = useReviewerOptions();
  const lonelyCompanyAdmin = isCompanyAdmin && !reviewersLoading && reviewerOptions.length === 0;
  const { data: teamBalances, isLoading: isTeamBalancesLoading } = useQuery({
    queryKey: ['leave-team-balance', year],
    queryFn: () => apiClient.get<TeamLeaveBalance[]>(API.leave.balanceTeam, { params: { year } }).then(r => r.data),
    enabled: isAdmin,
    refetchInterval: LIVE_REFETCH_MS,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (!teamBalances) return;
    const totals: Record<number, string> = {};
    for (const row of teamBalances) {
      totals[row.user_id] = String(row.total_days);
    }
    setTeamTotals(totals);
  }, [teamBalances]);

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, reviewComment }: { id: number; status: ReviewStatus; reviewComment: string }) =>
      apiClient.post(API.leave.review(String(id)), { status, review_comment: reviewComment }),
    onSuccess: async () => {
      setMutationError(null);
      setReviewDialog(null);
      setReviewCommentInput('');
      await queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
      await queryClient.invalidateQueries({ queryKey: ['leave-team-balance'] });
    },
    onError: (err) => {
      setMutationError(getApiError(err).message);
    },
  });

  const setBalanceMutation = useMutation({
    mutationFn: ({ userId, totalDays }: { userId: number; totalDays: number }) =>
      apiClient.post(API.leave.balanceSet, { user_id: userId, year, total_days: totalDays }),
    onSuccess: async () => {
      setMutationError(null);
      await queryClient.invalidateQueries({ queryKey: ['leave-team-balance', year] });
      await queryClient.invalidateQueries({ queryKey: ['leave-balance', year] });
    },
    onError: (err) => {
      setMutationError(getApiError(err).message);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => apiClient.post(API.leave.cancel(String(id))),
    onSuccess: async () => {
      setMutationError(null);
      setCancelConfirmId(null);
      await queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
    },
    onError: (err) => {
      setMutationError(getApiError(err).message);
      setCancelConfirmId(null);
    },
  });

  const rows = data?.results ?? [];
  const showUserColumn = isAdmin;

  const openReviewDialog = (leaveId: number, status: ReviewStatus, currentComment = '') => {
    setMutationError(null);
    setReviewDialog({ leaveId, status });
    setReviewCommentInput(currentComment);
  };

  const closeReviewDialog = () => {
    if (reviewMutation.isPending) return;
    setMutationError(null);
    setReviewDialog(null);
    setReviewCommentInput('');
  };

  const submitReview = () => {
    if (!reviewDialog || reviewMutation.isPending) return;
    reviewMutation.mutate({
      id: reviewDialog.leaveId,
      status: reviewDialog.status,
      reviewComment: reviewCommentInput.trim(),
    });
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-primary">Заявки на отсутствие</h1>
        {lonelyCompanyAdmin ? null : (
          <Link
            to="/leave/new"
            className="inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
          >{t('common.submitRequest')}</Link>
        )}
      </div>

      <section className="grid gap-3 rounded-xl border border-default bg-raised p-4 sm:grid-cols-2">
        <label className="text-sm text-secondary">{t('common.status')}<select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as LeaveStatus | '')}
            className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
          >
            {statusOptions.map(option => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-secondary">
          Тип отсутствия
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as LeaveType | '')}
            className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
          >
            {typeOptions.map(option => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="grid gap-3 rounded-xl border border-default bg-raised p-4 sm:grid-cols-4">
        <label className="text-sm text-secondary">
          Год
          <input
            type="number"
            min={1900}
            max={3000}
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
          />
        </label>
        <div className="rounded-lg border border-default bg-surface p-3">
          <div className="text-xs text-secondary">Всего дней</div>
          <div className="text-lg font-semibold text-primary">{balance?.total_days ?? 0}</div>
        </div>
        <div className="rounded-lg border border-default bg-surface p-3">
          <div className="text-xs text-secondary">Использовано</div>
          <div className="text-lg font-semibold text-primary">{balance?.used_days ?? 0}</div>
        </div>
        <div className="rounded-lg border border-default bg-surface p-3">
          <div className="text-xs text-secondary">Осталось</div>
          <div className="text-lg font-semibold text-emerald-400">{balance?.remaining_days ?? 0}</div>
        </div>
      </section>

      {mutationError && !reviewDialog && cancelConfirmId === null ? (
        <div className="rounded-lg border border-rose-800 bg-rose-950/30 px-3 py-2 text-sm text-rose-300" role="alert">
          {mutationError}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-rose-800 bg-rose-950/30 px-3 py-2 text-sm text-rose-300" role="alert">
          {getApiError(error).message}
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-secondary">{t('common.loading')}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-secondary">Заявок пока нет.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-default bg-raised">
          <table className="min-w-full divide-y divide-[color:var(--border)]/60">
            <thead className="bg-surface/60">
              <tr>
                {showUserColumn ? <th className="px-4 py-3 text-left text-xs font-semibold text-secondary">{t('team.roleEmployee')}</th> : null}
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary">Тип</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary">Период</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary">{t('common.status')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary">{t('common.comment')}</th>
                {isAdmin ? <th className="px-4 py-3 text-left text-xs font-semibold text-secondary">Действия</th> : null}
                {!isAdmin ? <th className="px-4 py-3 text-left text-xs font-semibold text-secondary">Действия</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]/60">
              {rows.map((leave) => (
                <tr key={leave.id} className="text-sm text-secondary">
                  {showUserColumn ? (
                    <td className="px-4 py-3">
                      {leave.user_name?.trim() || `ID ${leave.user}`}
                    </td>
                  ) : null}
                  <td className="px-4 py-3">
                    {t(LEAVE_TYPE_LABEL_KEYS[leave.leave_type]) ?? leave.leave_type}
                  </td>
                  <td className="px-4 py-3">
                    {fmtDate(leave.start_date)}
                    {' - '}
                    {fmtDate(leave.end_date)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', STATUS_BADGE_CLASS[leave.status])}>
                      {t(LEAVE_STATUS_LABEL_KEYS[leave.status]) ?? leave.status}
                    </span>
                    {leave.assigned_reviewer_name ? (
                      <div className="mt-1 text-xs text-muted">
                        Согласующий: {leave.assigned_reviewer_name}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-secondary">
                    <div>{leave.comment || '-'}</div>
                    {leave.review_comment ? (
                      <div className="mt-1 text-xs text-muted">
                        Комментарий администратора: {leave.review_comment}
                      </div>
                    ) : null}
                  </td>
                  {isAdmin ? (
                    <td className="px-4 py-3">
                      {(() => {
                        const isOwnLeave = leave.user === user?.id;
                        const isAssignedToOther =
                          leave.assigned_reviewer != null && leave.assigned_reviewer !== user?.id;
                        const canReview =
                          !isOwnLeave && (user?.role === USER_ROLES.SUPERADMIN || !isAssignedToOther);
                        if (!canReview) {
                          return <span className="text-xs text-muted">—</span>;
                        }
                        if (leave.status === LEAVE_STATUSES.PENDING) {
                          return (
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                disabled={reviewMutation.isPending}
                                onClick={() => openReviewDialog(leave.id, LEAVE_STATUSES.APPROVED, leave.review_comment)}
                              >
                                Одобрить
                              </Button>
                              <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                disabled={reviewMutation.isPending}
                                onClick={() => openReviewDialog(leave.id, LEAVE_STATUSES.REJECTED, leave.review_comment)}
                              >
                                Отклонить
                              </Button>
                            </div>
                          );
                        }
                        if (leave.status === LEAVE_STATUSES.APPROVED) {
                          return (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={reviewMutation.isPending}
                              onClick={() => openReviewDialog(leave.id, LEAVE_STATUSES.REJECTED, leave.review_comment)}
                            >
                              Отменить одобрение
                            </Button>
                          );
                        }
                        return <span className="text-xs text-muted">—</span>;
                      })()}
                    </td>
                  ) : null}
                  {!isAdmin ? (
                    <td className="px-4 py-3">
                      {leave.status === LEAVE_STATUSES.PENDING ? (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate(`/hr/leaves/${leave.id}/edit`)}
                          >
                            Редактировать
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            disabled={cancelMutation.isPending}
                            onClick={() => { setMutationError(null); setCancelConfirmId(leave.id); }}
                          >
                            Отменить
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isAdmin ? (
        <section className="overflow-hidden rounded-2xl border border-default bg-raised">
          <div className="border-b border-default px-4 py-3 text-sm font-semibold text-primary">
            Балансы команды
          </div>
          {isTeamBalancesLoading ? (
            <p className="px-4 py-4 text-sm text-secondary">Загрузка балансов...</p>
          ) : !teamBalances?.length ? (
            <p className="px-4 py-4 text-sm text-secondary">Сотрудники не найдены.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[color:var(--border)]/60">
                <thead className="bg-surface/60">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary">{t('team.roleEmployee')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary">Всего</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary">Использовано</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary">Осталось</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-secondary">Установить</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--border)]/60">
                  {teamBalances.map((row) => {
                    const isBalanceLocked = row.total_days > 0 && row.used_days >= row.total_days;

                    return (
                      <tr key={row.user_id} className="text-sm text-secondary">
                        <td className="px-4 py-3">{row.user_name}</td>
                        <td className="px-4 py-3">{row.total_days}</td>
                        <td className="px-4 py-3">{row.used_days}</td>
                        <td className="px-4 py-3">{row.remaining_days}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              value={teamTotals[row.user_id] ?? String(row.total_days)}
                              onChange={(event) =>
                                setTeamTotals((prev) => ({ ...prev, [row.user_id]: event.target.value }))
                              }
                              className={cn(
                                'w-20 rounded-md border border-default bg-surface px-2 py-1 text-xs text-primary',
                                isBalanceLocked && 'cursor-not-allowed opacity-60',
                              )}
                              disabled={isBalanceLocked || setBalanceMutation.isPending}
                            />
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              disabled={isBalanceLocked || setBalanceMutation.isPending}
                              loading={setBalanceMutation.isPending}
                              onClick={() =>
                                !isBalanceLocked &&
                                setBalanceMutation.mutate({
                                  userId: row.user_id,
                                  totalDays: Number(teamTotals[row.user_id] ?? row.total_days),
                                })
                              }
                            >
                              {t('common.save')}
                            </Button>
                            {isBalanceLocked ? (
                              <span className="text-xs text-warning">Лимит уже израсходован</span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {reviewDialog ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeReviewDialog();
          }}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-default bg-raised p-5"
          >
            <h2 className="text-lg font-semibold text-primary">
              {reviewDialog.status === LEAVE_STATUSES.APPROVED ? 'Одобрить заявку' : 'Отклонить заявку'}
            </h2>
            <p className="mt-2 text-sm text-secondary">
              {reviewDialog.status === LEAVE_STATUSES.APPROVED
                ? 'Комментарий к одобрению'
                : 'Комментарий к отклонению'}
            </p>
            <textarea
              value={reviewCommentInput}
              onChange={(event) => setReviewCommentInput(event.target.value)}
              rows={4}
              placeholder="Оставьте комментарий при необходимости"
              className="mt-3 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted"
            />
            {mutationError ? (
              <div className="mt-3 rounded-lg border border-rose-800 bg-rose-950/30 px-3 py-2 text-sm text-rose-300" role="alert">
                {mutationError}
              </div>
            ) : null}
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={closeReviewDialog}
                disabled={reviewMutation.isPending}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                variant={reviewDialog.status === LEAVE_STATUSES.APPROVED ? 'primary' : 'danger'}
                size="sm"
                onClick={submitReview}
                disabled={reviewMutation.isPending}
                loading={reviewMutation.isPending}
              >
                {reviewMutation.isPending
                  ? 'Сохраняем...'
                  : reviewDialog.status === LEAVE_STATUSES.APPROVED
                    ? 'Подтвердить одобрение'
                    : 'Подтвердить отклонение'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {cancelConfirmId !== null ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target !== e.currentTarget) return;
            if (!cancelMutation.isPending) {
              setMutationError(null);
              setCancelConfirmId(null);
            }
          }}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-default bg-raised p-5"
          >
            <h2 className="text-lg font-semibold text-primary">Отменить заявку</h2>
            <p className="mt-2 text-sm text-secondary">
              Вы уверены, что хотите отменить эту заявку? Действие нельзя отменить.
            </p>
            {mutationError ? (
              <div className="mt-3 rounded-lg border border-rose-800 bg-rose-950/30 px-3 py-2 text-sm text-rose-300" role="alert">
                {mutationError}
              </div>
            ) : null}
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setMutationError(null); setCancelConfirmId(null); }}
                disabled={cancelMutation.isPending}
              >
                Назад
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={cancelMutation.isPending}
                loading={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate(cancelConfirmId)}
              >
                {cancelMutation.isPending ? 'Отмена...' : 'Подтвердить отмену'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
