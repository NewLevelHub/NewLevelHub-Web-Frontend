import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import type { LeaveBalance, LeaveRequest, PaginatedResponse, TeamLeaveBalance } from '@/shared/types';

type LeaveListResponse = LeaveRequest[] | PaginatedResponse<LeaveRequest>;

const currentYear = new Date().getFullYear();

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('ru-RU');
}

function statusLabel(status: string): string {
  if (status === 'approved') return 'Одобрена';
  if (status === 'rejected') return 'Отклонена';
  return 'На рассмотрении';
}

function leaveTypeLabel(leaveType: string): string {
  if (leaveType === 'vacation') return 'Отпуск';
  if (leaveType === 'day_off') return 'Отгул';
  if (leaveType === 'sick_leave') return 'Больничный';
  if (leaveType === 'remote') return 'Удаленка';
  return leaveType;
}

export default function LeaveRequestListPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [year, setYear] = useState<number>(currentYear);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [teamTotals, setTeamTotals] = useState<Record<number, string>>({});

  const isAdmin = user?.role === USER_ROLES.COMPANY_ADMIN || user?.role === USER_ROLES.SUPERADMIN;

  const { data: leaveResponse, isLoading: isLeavesLoading } = useQuery<LeaveListResponse>({
    queryKey: ['leave-requests'],
    queryFn: () => apiClient.get<LeaveListResponse>(API.leave.requests).then((r) => r.data),
  });

  const leaveItems = useMemo(() => {
    if (!leaveResponse) return [];
    return Array.isArray(leaveResponse) ? leaveResponse : leaveResponse.results;
  }, [leaveResponse]);

  const { data: balance, isLoading: isBalanceLoading } = useQuery<LeaveBalance>({
    queryKey: ['leave-balance', year],
    queryFn: () =>
      apiClient
        .get<LeaveBalance>(API.leave.balance, { params: { year } })
        .then((r) => r.data),
  });

  const { data: teamBalances, isLoading: isTeamLoading } = useQuery<TeamLeaveBalance[]>({
    queryKey: ['leave-team-balance', year],
    queryFn: () =>
      apiClient
        .get<TeamLeaveBalance[]>(API.leave.balanceTeam, { params: { year } })
        .then((r) => r.data),
    enabled: isAdmin,
  });

  useEffect(() => {
    if (!teamBalances) return;
    const initial: Record<number, string> = {};
    for (const row of teamBalances) {
      initial[row.user_id] = String(row.total_days);
    }
    setTeamTotals(initial);
  }, [teamBalances]);

  const reviewMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'approved' | 'rejected' }) =>
      apiClient.post(API.leave.review(String(id)), { status }),
    onSuccess: async () => {
      setErrorText(null);
      await queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
      await queryClient.invalidateQueries({ queryKey: ['leave-team-balance'] });
    },
    onError: (error: unknown) => {
      setErrorText(getApiErrorMessage(error, 'Не удалось обновить статус заявки.'));
    },
  });

  const setBalanceMutation = useMutation({
    mutationFn: ({ userId, totalDays }: { userId: number; totalDays: number }) =>
      apiClient.post(API.leave.balanceSet, { user_id: userId, year, total_days: totalDays }),
    onSuccess: async () => {
      setErrorText(null);
      await queryClient.invalidateQueries({ queryKey: ['leave-team-balance', year] });
      await queryClient.invalidateQueries({ queryKey: ['leave-balance', year] });
    },
    onError: (error: unknown) => {
      setErrorText(getApiErrorMessage(error, 'Не удалось обновить баланс сотрудника.'));
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Отпуска</h1>
          <p className="mt-1 text-sm text-gray-400">Заявки и баланс отпускных дней</p>
        </div>
        <Link
          to="/leave/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Новая заявка
        </Link>
      </div>

      <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
        <label htmlFor="leave-year" className="mb-1 block text-xs font-medium text-gray-400">
          Год баланса
        </label>
        <input
          id="leave-year"
          type="number"
          min={1900}
          max={3000}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-full max-w-40 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
        />
      </div>

      {errorText && (
        <div className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {errorText}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
          <p className="text-xs text-gray-400">Год</p>
          <p className="mt-1 text-xl font-semibold text-white">{isBalanceLoading ? '...' : balance?.year ?? year}</p>
        </div>
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
          <p className="text-xs text-gray-400">Всего дней</p>
          <p className="mt-1 text-xl font-semibold text-white">{isBalanceLoading ? '...' : balance?.total_days ?? 0}</p>
        </div>
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
          <p className="text-xs text-gray-400">Использовано</p>
          <p className="mt-1 text-xl font-semibold text-white">{isBalanceLoading ? '...' : balance?.used_days ?? 0}</p>
        </div>
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
          <p className="text-xs text-gray-400">Осталось</p>
          <p className="mt-1 text-xl font-semibold text-emerald-400">
            {isBalanceLoading ? '...' : balance?.remaining_days ?? 0}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
        <div className="border-b border-gray-700 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Заявки</h2>
        </div>
        {isLeavesLoading ? (
          <p className="px-4 py-6 text-sm text-gray-400">Загрузка заявок…</p>
        ) : !leaveItems.length ? (
          <p className="px-4 py-6 text-sm text-gray-400">Заявок пока нет.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-900/60 text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-3">Сотрудник</th>
                  <th className="px-4 py-3">Тип</th>
                  <th className="px-4 py-3">Период</th>
                  <th className="px-4 py-3">Дней</th>
                  <th className="px-4 py-3">Статус</th>
                  {isAdmin && <th className="px-4 py-3">Действия</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {leaveItems.map((item) => (
                  <tr key={item.id} className="text-gray-200">
                    <td className="px-4 py-3">{item.user_name}</td>
                    <td className="px-4 py-3">{leaveTypeLabel(item.leave_type)}</td>
                    <td className="px-4 py-3">
                      {formatDate(item.start_date)} - {formatDate(item.end_date)}
                    </td>
                    <td className="px-4 py-3">{item.duration_days}</td>
                    <td className="px-4 py-3">{statusLabel(item.status)}</td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        {item.status === 'pending' ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={reviewMutation.isPending}
                              onClick={() => reviewMutation.mutate({ id: item.id, status: 'approved' })}
                              className="rounded-md border border-emerald-700 bg-emerald-900/30 px-2 py-1 text-xs text-emerald-300"
                            >
                              Одобрить
                            </button>
                            <button
                              type="button"
                              disabled={reviewMutation.isPending}
                              onClick={() => reviewMutation.mutate({ id: item.id, status: 'rejected' })}
                              className="rounded-md border border-red-800 bg-red-900/30 px-2 py-1 text-xs text-red-300"
                            >
                              Отклонить
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
          <div className="border-b border-gray-700 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Балансы команды</h2>
          </div>
          {isTeamLoading ? (
            <p className="px-4 py-6 text-sm text-gray-400">Загрузка балансов команды…</p>
          ) : !teamBalances?.length ? (
            <p className="px-4 py-6 text-sm text-gray-400">Нет сотрудников для отображения.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-900/60 text-xs uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Сотрудник</th>
                    <th className="px-4 py-3">Всего</th>
                    <th className="px-4 py-3">Использовано</th>
                    <th className="px-4 py-3">Осталось</th>
                    <th className="px-4 py-3">Установить</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50 text-gray-200">
                  {teamBalances.map((row) => (
                    <tr key={row.user_id}>
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
                            onChange={(e) =>
                              setTeamTotals((prev) => ({ ...prev, [row.user_id]: e.target.value }))
                            }
                            className="w-20 rounded-md border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-white"
                          />
                          <button
                            type="button"
                            disabled={setBalanceMutation.isPending}
                            onClick={() =>
                              setBalanceMutation.mutate({
                                userId: row.user_id,
                                totalDays: Number(teamTotals[row.user_id] ?? row.total_days),
                              })
                            }
                            className="rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white"
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
        </div>
      )}
    </div>
  );
}
