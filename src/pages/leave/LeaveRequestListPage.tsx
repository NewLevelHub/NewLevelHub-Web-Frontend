import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  LEAVE_STATUSES,
  LEAVE_STATUS_LABELS,
  LEAVE_TYPES,
  LEAVE_TYPE_LABELS,
  USER_ROLES,
  type LeaveStatus,
  type LeaveType,
} from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { cn } from '@/shared/lib/cn';
import type { LeaveBalance, LeaveRequest, PaginatedResponse, TeamLeaveBalance } from '@/shared/types';

const STATUS_OPTIONS: Array<{ value: ''; label: string } | { value: LeaveStatus; label: string }> = [
  { value: '', label: 'Все статусы' },
  { value: LEAVE_STATUSES.PENDING, label: LEAVE_STATUS_LABELS[LEAVE_STATUSES.PENDING] },
  { value: LEAVE_STATUSES.APPROVED, label: LEAVE_STATUS_LABELS[LEAVE_STATUSES.APPROVED] },
  { value: LEAVE_STATUSES.REJECTED, label: LEAVE_STATUS_LABELS[LEAVE_STATUSES.REJECTED] },
];

const TYPE_OPTIONS: Array<{ value: ''; label: string } | { value: LeaveType; label: string }> = [
  { value: '', label: 'Все типы' },
  { value: LEAVE_TYPES.VACATION, label: LEAVE_TYPE_LABELS[LEAVE_TYPES.VACATION] },
  { value: LEAVE_TYPES.DAY_OFF, label: LEAVE_TYPE_LABELS[LEAVE_TYPES.DAY_OFF] },
  { value: LEAVE_TYPES.SICK_LEAVE, label: LEAVE_TYPE_LABELS[LEAVE_TYPES.SICK_LEAVE] },
  { value: LEAVE_TYPES.REMOTE, label: LEAVE_TYPE_LABELS[LEAVE_TYPES.REMOTE] },
];

const STATUS_BADGE_CLASS: Record<LeaveStatus, string> = {
  [LEAVE_STATUSES.PENDING]: 'bg-amber-900/60 text-amber-300',
  [LEAVE_STATUSES.APPROVED]: 'bg-emerald-900/60 text-emerald-300',
  [LEAVE_STATUSES.REJECTED]: 'bg-rose-900/60 text-rose-300',
};
const LIVE_REFETCH_MS = 15000;
type ReviewStatus = Extract<LeaveStatus, 'approved' | 'rejected'>;
type ReviewDialogState = {
  leaveId: number;
  status: ReviewStatus;
};

export default function LeaveRequestListPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<LeaveType | ''>('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [teamTotals, setTeamTotals] = useState<Record<number, string>>({});
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [reviewDialog, setReviewDialog] = useState<ReviewDialogState | null>(null);
  const [reviewCommentInput, setReviewCommentInput] = useState('');

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
      setMutationError(getApiErrorMessage(err, 'Не удалось обновить заявку.'));
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
      setMutationError(getApiErrorMessage(err, 'Не удалось установить баланс.'));
    },
  });

  const rows = data?.results ?? [];
  const showUserColumn = isAdmin;

  const openReviewDialog = (leaveId: number, status: ReviewStatus, currentComment = '') => {
    setReviewDialog({ leaveId, status });
    setReviewCommentInput(currentComment);
  };

  const closeReviewDialog = () => {
    if (reviewMutation.isPending) return;
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
        <h1 className="text-2xl font-bold text-white">Заявки на отсутствие</h1>
        <Link
          to="/leave/new"
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Подать заявку
        </Link>
      </div>

      <section className="grid gap-3 rounded-xl border border-gray-700 bg-gray-800 p-4 sm:grid-cols-2">
        <label className="text-sm text-gray-300">
          Статус
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as LeaveStatus | '')}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
          >
            {STATUS_OPTIONS.map(option => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-gray-300">
          Тип отсутствия
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as LeaveType | '')}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
          >
            {TYPE_OPTIONS.map(option => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="grid gap-3 rounded-xl border border-gray-700 bg-gray-800 p-4 sm:grid-cols-4">
        <label className="text-sm text-gray-300">
          Год
          <input
            type="number"
            min={1900}
            max={3000}
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
          />
        </label>
        <div className="rounded-lg border border-gray-700 bg-gray-900 p-3">
          <div className="text-xs text-gray-400">Всего дней</div>
          <div className="text-lg font-semibold text-white">{balance?.total_days ?? 0}</div>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-900 p-3">
          <div className="text-xs text-gray-400">Использовано</div>
          <div className="text-lg font-semibold text-white">{balance?.used_days ?? 0}</div>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-900 p-3">
          <div className="text-xs text-gray-400">Осталось</div>
          <div className="text-lg font-semibold text-emerald-400">{balance?.remaining_days ?? 0}</div>
        </div>
      </section>

      {mutationError ? (
        <div className="rounded-lg border border-rose-800 bg-rose-950/30 px-3 py-2 text-sm text-rose-300" role="alert">
          {mutationError}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-rose-800 bg-rose-950/30 px-3 py-2 text-sm text-rose-300" role="alert">
          {getApiErrorMessage(error, 'Не удалось загрузить заявки.')}
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-gray-400">Загрузка...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-400">Заявок пока нет.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-700 bg-gray-800">
          <table className="min-w-full divide-y divide-gray-700/60">
            <thead className="bg-gray-900/60">
              <tr>
                {showUserColumn ? <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Сотрудник</th> : null}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Тип</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Период</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Статус</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Комментарий</th>
                {isAdmin ? <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Действия</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/60">
              {rows.map((leave) => (
                <tr key={leave.id} className="text-sm text-gray-200">
                  {showUserColumn ? (
                    <td className="px-4 py-3">
                      {leave.user_name?.trim() || `ID ${leave.user}`}
                    </td>
                  ) : null}
                  <td className="px-4 py-3">
                    {LEAVE_TYPE_LABELS[leave.leave_type] ?? leave.leave_type}
                  </td>
                  <td className="px-4 py-3">
                    {new Date(leave.start_date).toLocaleDateString('ru-RU')}
                    {' - '}
                    {new Date(leave.end_date).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', STATUS_BADGE_CLASS[leave.status])}>
                      {LEAVE_STATUS_LABELS[leave.status] ?? leave.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{leave.comment || '-'}</td>
                  {isAdmin ? (
                    <td className="px-4 py-3">
                      {leave.status === LEAVE_STATUSES.PENDING ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="rounded-md border border-emerald-700 bg-emerald-900/30 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-900/50"
                            disabled={reviewMutation.isPending}
                            onClick={() => openReviewDialog(leave.id, LEAVE_STATUSES.APPROVED, leave.review_comment)}
                          >
                            Одобрить
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-rose-800 bg-rose-900/30 px-2 py-1 text-xs text-rose-300 hover:bg-rose-900/50"
                            disabled={reviewMutation.isPending}
                            onClick={() => openReviewDialog(leave.id, LEAVE_STATUSES.REJECTED, leave.review_comment)}
                          >
                            Отклонить
                          </button>
                        </div>
                      ) : leave.status === LEAVE_STATUSES.APPROVED ? (
                        <button
                          type="button"
                          className="rounded-md border border-amber-800 bg-amber-900/30 px-2 py-1 text-xs text-amber-300 hover:bg-amber-900/50"
                          disabled={reviewMutation.isPending}
                          onClick={() => openReviewDialog(leave.id, LEAVE_STATUSES.REJECTED, leave.review_comment)}
                        >
                          Отменить одобрение
                        </button>
                      ) : (
                        <span className="text-xs text-gray-500">—</span>
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
        <section className="overflow-hidden rounded-2xl border border-gray-700 bg-gray-800">
          <div className="border-b border-gray-700 px-4 py-3 text-sm font-semibold text-white">
            Балансы команды
          </div>
          {isTeamBalancesLoading ? (
            <p className="px-4 py-4 text-sm text-gray-400">Загрузка балансов...</p>
          ) : !teamBalances?.length ? (
            <p className="px-4 py-4 text-sm text-gray-400">Сотрудники не найдены.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700/60">
                <thead className="bg-gray-900/60">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Сотрудник</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Всего</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Использовано</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Осталось</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Установить</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/60">
                  {teamBalances.map((row) => {
                    const isBalanceLocked = row.total_days > 0 && row.used_days >= row.total_days;

                    return (
                      <tr key={row.user_id} className="text-sm text-gray-200">
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
                                'w-20 rounded-md border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-white',
                                isBalanceLocked && 'cursor-not-allowed opacity-60',
                              )}
                              disabled={isBalanceLocked || setBalanceMutation.isPending}
                            />
                            <button
                              type="button"
                              className={cn(
                                'rounded-md bg-indigo-600 px-2 py-1 text-xs text-white',
                                !isBalanceLocked && 'hover:bg-indigo-500',
                                isBalanceLocked && 'cursor-not-allowed opacity-60',
                              )}
                              disabled={isBalanceLocked || setBalanceMutation.isPending}
                              onClick={() =>
                                !isBalanceLocked &&
                                setBalanceMutation.mutate({
                                  userId: row.user_id,
                                  totalDays: Number(teamTotals[row.user_id] ?? row.total_days),
                                })
                              }
                            >
                              Сохранить
                            </button>
                            {isBalanceLocked ? (
                              <span className="text-xs text-amber-300">Лимит уже израсходован</span>
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
          onClick={closeReviewDialog}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-gray-700 bg-gray-800 p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-white">
              {reviewDialog.status === LEAVE_STATUSES.APPROVED ? 'Одобрить заявку' : 'Отклонить заявку'}
            </h2>
            <p className="mt-2 text-sm text-gray-300">
              {reviewDialog.status === LEAVE_STATUSES.APPROVED
                ? 'Комментарий к одобрению (необязательно)'
                : 'Комментарий к отклонению (необязательно)'}
            </p>
            <textarea
              value={reviewCommentInput}
              onChange={(event) => setReviewCommentInput(event.target.value)}
              rows={4}
              placeholder="Оставьте комментарий при необходимости"
              className="mt-3 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
                onClick={closeReviewDialog}
                disabled={reviewMutation.isPending}
              >
                Отмена
              </button>
              <button
                type="button"
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium text-white',
                  reviewDialog.status === LEAVE_STATUSES.APPROVED
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500',
                )}
                onClick={submitReview}
                disabled={reviewMutation.isPending}
              >
                {reviewMutation.isPending
                  ? 'Сохраняем...'
                  : reviewDialog.status === LEAVE_STATUSES.APPROVED
                    ? 'Подтвердить одобрение'
                    : 'Подтвердить отклонение'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
