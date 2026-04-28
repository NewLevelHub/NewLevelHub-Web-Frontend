import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import type { GuestPass } from '@/shared/types';

export default function PassDetailPage() {
  const { id } = useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['guest-pass-detail', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await apiClient.get<GuestPass>(API.passes.detail(String(id)));
      return response.data;
    },
  });

  if (isLoading) {
    return <main className="p-6 text-sm text-gray-400">Загрузка пропуска...</main>;
  }

  if (isError || !data) {
    return <main className="p-6 text-sm text-rose-400">Не удалось загрузить детали пропуска.</main>;
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Пропуск #{data.id}</h1>
        <Link to="/passes" className="text-sm text-indigo-300 hover:text-indigo-200">
          Назад к списку
        </Link>
      </div>

      <section className="grid gap-4 rounded-xl border border-gray-700 bg-gray-800 p-5 text-sm text-gray-200 sm:grid-cols-2">
        <div>
          <div className="text-gray-400">Гость</div>
          <div className="font-medium text-white">{data.guest_name}</div>
          <div className="text-xs text-gray-400">{data.guest_email}</div>
        </div>
        <div>
          <div className="text-gray-400">Статус</div>
          <div>{data.status}</div>
        </div>
        <div>
          <div className="text-gray-400">Цель</div>
          <div>{data.purpose || '—'}</div>
        </div>
        <div>
          <div className="text-gray-400">Использований</div>
          <div>{data.times_used}</div>
        </div>
        <div>
          <div className="text-gray-400">Действует с</div>
          <div>{new Date(data.valid_from).toLocaleString()}</div>
        </div>
        <div>
          <div className="text-gray-400">Действует до</div>
          <div>{new Date(data.valid_until).toLocaleString()}</div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
        <h2 className="mb-3 text-lg font-semibold text-white">QR-код</h2>
        {data.qr_image ? (
          <img src={data.qr_image} alt="QR guest pass" className="max-h-80 rounded-lg border border-gray-700 bg-white p-3" />
        ) : (
          <div className="text-sm text-gray-400">QR изображение недоступно.</div>
        )}
      </section>
    </main>
  );
}
