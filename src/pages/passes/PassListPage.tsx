import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { PASS_STATUSES, type PassStatus } from '@/shared/config/constants';
import type { GuestPass, PaginatedResponse } from '@/shared/types';

const STATUS_OPTIONS: Array<{ label: string; value: PassStatus | '' }> = [
  { label: 'Все статусы', value: '' },
  { label: 'Активные', value: PASS_STATUSES.ACTIVE },
  { label: 'Использованные', value: PASS_STATUSES.USED },
  { label: 'Истекшие', value: PASS_STATUSES.EXPIRED },
  { label: 'Отозванные', value: PASS_STATUSES.REVOKED },
];

export default function PassListPage() {
  const [statusFilter, setStatusFilter] = useState<PassStatus | ''>('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['guest-passes', statusFilter],
    queryFn: async () => {
      const params = statusFilter ? { status: statusFilter } : undefined;
      const response = await apiClient.get<PaginatedResponse<GuestPass>>(API.passes.list, { params });
      return response.data;
    },
  });

  return (
    <main className="mx-auto max-w-5xl space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Гостевые пропуска</h1>
          <p className="text-sm text-gray-400">Ваши цифровые пропуска с QR-кодом.</p>
        </div>
        <Link
          to="/passes/new"
          className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Создать пропуск
        </Link>
      </div>

      <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
        <label className="text-sm text-gray-300">
          Фильтр по статусу
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as PassStatus | '')}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white sm:w-64"
          >
            {STATUS_OPTIONS.map(option => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading ? <div className="text-sm text-gray-400">Загрузка пропусков...</div> : null}
      {isError ? <div className="text-sm text-rose-400">Не удалось загрузить список пропусков.</div> : null}

      {!isLoading && !isError ? (
        <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
          <div className="overflow-x-auto">
            <table className="min-w-[760px] divide-y divide-gray-700 text-sm">
            <thead className="bg-gray-900 text-left text-gray-300">
              <tr>
                <th className="px-4 py-3">Гость</th>
                <th className="px-4 py-3">Владелец</th>
                <th className="px-4 py-3">Цель</th>
                <th className="px-4 py-3">Период</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3 text-right">Детали</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {(data?.results ?? []).map(pass => (
                <tr key={pass.id} className="text-gray-200">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{pass.guest_name}</div>
                    <div className="text-xs text-gray-400">{pass.guest_email}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{pass.created_by_name || '—'}</td>
                  <td className="px-4 py-3">{pass.purpose || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-300">
                    {new Date(pass.valid_from).toLocaleString()}
                    <br />
                    {new Date(pass.valid_until).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{pass.status}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/passes/${pass.id}`} className="text-indigo-300 hover:text-indigo-200">
                      Открыть
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
          {data?.results?.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">Пропусков пока нет.</div>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
