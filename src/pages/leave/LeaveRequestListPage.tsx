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
  [LEAVE_STATUSES.PENDING]: 'bg-amber-100 text-amber-800',
  [LEAVE_STATUSES.APPROVED]: 'bg-emerald-100 text-emerald-800',
  [LEAVE_STATUSES.REJECTED]: 'bg-rose-100 text-rose-800',
};

export default function LeaveRequestListPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<LeaveType | ''>('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [teamTotals, setTeamTotals] = useState<Record<number, string>>({});
  const [mutationError, setMutationError] = useState<string | null>(null);

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    if (typeFilter) params.leave_type = typeFilter;
    return params;
  }, [statusFilter, typeFilter]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['leave-requests', queryParams],
    queryFn: () =>
      apiClient.get<PaginatedResponse<LeaveRequest>>(API.leave.requests, { params: queryParams }).then(r => r.data),
  });

  const { data: balance } = useQuery({
    queryKey: ['leave-balance', year],
    queryFn: () => apiClient.get<LeaveBalance>(API.leave.balance, { params: { year } }).then(r => r.data),
  });

  const isAdmin = user?.role === USER_ROLES.COMPANY_ADMIN || user?.role === USER_ROLES.SUPERADMIN;
  const { data: teamBalances, isLoading: isTeamBalancesLoading } = useQuery({
    queryKey: ['leave-team-balance', year],
    queryFn: () => apiClient.get<TeamLeaveBalance[]>(API.leave.balanceTeam, { params: { year } }).then(r => r.data),
    enabled: isAdmin,
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
    mutationFn: ({ id, status }: { id: number; status: LeaveStatus }) =>
      apiClient.post(API.leave.review(String(id)), { status }),
    onSuccess: async () => {
      setMutationError(null);
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

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Заявки на отсутствие</h1>
        <Link
          to="/leave/new"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Подать заявку
        </Link>
      </div>

      <section className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2">
        <label className="text-sm text-gray-700">
          Статус
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as LeaveStatus | '')}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          >
            {STATUS_OPTIONS.map(option => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-gray-700">
          Тип отсутствия
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as LeaveType | '')}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          >
            {TYPE_OPTIONS.map(option => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-4">
        <label className="text-sm text-gray-700">
          Год
          <input
            type="number"
            min={1900}
            max={3000}
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          />
        </label>
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <div className="text-xs text-gray-500">Всего дней</div>
          <div className="text-lg font-semibold text-gray-900">{balance?.total_days ?? 0}</div>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <div className="text-xs text-gray-500">Использовано</div>
          <div className="text-lg font-semibold text-gray-900">{balance?.used_days ?? 0}</div>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <div className="text-xs text-gray-500">Осталось</div>
          <div className="text-lg font-semibold text-emerald-700">{balance?.remaining_days ?? 0}</div>
        </div>
      </section>

      {mutationError ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
          {mutationError}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
          {getApiErrorMessage(error, 'Не удалось загрузить заявки.')}
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-gray-500">Загрузка...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">Заявок пока нет.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {showUserColumn ? <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Сотрудник</th> : null}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Тип</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Период</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Статус</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Комментарий</th>
                {isAdmin ? <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Действия</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((leave) => (
                <tr key={leave.id} className="text-sm text-gray-800">
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
                  <td className="px-4 py-3 text-gray-600">{leave.comment || '-'}</td>
                  {isAdmin ? (
                    <td className="px-4 py-3">
                      {leave.status === LEAVE_STATUSES.PENDING ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="rounded-md bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700"
                            disabled={reviewMutation.isPending}
                            onClick={() => reviewMutation.mutate({ id: leave.id, status: LEAVE_STATUSES.APPROVED })}
                          >
                            Одобрить
                          </button>
                          <button
                            type="button"
                            className="rounded-md bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-700"
                            disabled={reviewMutation.isPending}
                            onClick={() => reviewMutation.mutate({ id: leave.id, status: LEAVE_STATUSES.REJECTED })}
                          >
                            Отклонить
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
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
        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-700">
            Балансы команды
          </div>
          {isTeamBalancesLoading ? (
            <p className="px-4 py-4 text-sm text-gray-500">Загрузка балансов...</p>
          ) : !teamBalances?.length ? (
            <p className="px-4 py-4 text-sm text-gray-500">Сотрудники не найдены.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Сотрудник</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Всего</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Использовано</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Осталось</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Установить</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {teamBalances.map((row) => (
                    <tr key={row.user_id} className="text-sm text-gray-800">
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
                            className="w-20 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900"
                          />
                          <button
                            type="button"
                            className="rounded-md bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
                            disabled={setBalanceMutation.isPending}
                            onClick={() =>
                              setBalanceMutation.mutate({
                                userId: row.user_id,
                                totalDays: Number(teamTotals[row.user_id] ?? row.total_days),
                              })
                            }
                          >
                            Сохранить
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}
