import { Link, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { useAuth } from '@/shared/hooks/useAuth';
import type { GuestPass } from '@/shared/types';

export default function PassDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['guest-pass-detail', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await apiClient.get<GuestPass>(API.passes.detail(String(id)));
      return response.data;
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(API.passes.revoke(String(id)));
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['guest-pass-detail', id] }),
        queryClient.invalidateQueries({ queryKey: ['guest-passes'] }),
      ]);
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(API.passes.resend(String(id)));
    },
  });

  if (isLoading) {
    return <main className="p-6 text-sm text-gray-400">Загрузка пропуска...</main>;
  }

  if (isError || !data) {
    return <main className="p-6 text-sm text-rose-400">Не удалось загрузить детали пропуска.</main>;
  }

  const canManagePass = user?.role === 'company_admin' || user?.role === 'superadmin';
  const canRevoke = canManagePass && data.status !== 'used' && data.status !== 'expired' && data.status !== 'revoked';

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

      {canManagePass ? (
        <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
          <h2 className="mb-3 text-lg font-semibold text-white">Действия</h2>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => resendMutation.mutate()}
              disabled={resendMutation.isPending}
              className="rounded-lg border border-indigo-500 px-4 py-2 text-sm text-indigo-200 hover:bg-indigo-900/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resendMutation.isPending ? 'Отправка...' : 'Переотправить QR'}
            </button>
            {canRevoke ? (
              <button
                type="button"
                onClick={() => revokeMutation.mutate()}
                disabled={revokeMutation.isPending}
                className="rounded-lg border border-rose-500 px-4 py-2 text-sm text-rose-200 hover:bg-rose-900/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {revokeMutation.isPending ? 'Отзыв...' : 'Отозвать пропуск'}
              </button>
            ) : null}
          </div>
          {resendMutation.isSuccess ? (
            <p className="mt-3 text-xs text-emerald-300">QR-код отправлен повторно.</p>
          ) : null}
          {resendMutation.isError ? (
            <p className="mt-3 text-xs text-rose-300">Не удалось переотправить QR-код.</p>
          ) : null}
          {revokeMutation.isError ? (
            <p className="mt-3 text-xs text-rose-300">Не удалось отозвать пропуск.</p>
          ) : null}
        </section>
      ) : null}

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
