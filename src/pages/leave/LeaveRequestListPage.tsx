import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';

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
import type { LeaveRequest, PaginatedResponse } from '@/shared/types';

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
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<LeaveType | ''>('');

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

  const rows = data?.results ?? [];
  const showUserColumn = user?.role === USER_ROLES.COMPANY_ADMIN || user?.role === USER_ROLES.SUPERADMIN;

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Заявки на отсутствие</h1>
        <Link
          to="/hr/leaves/new"
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
