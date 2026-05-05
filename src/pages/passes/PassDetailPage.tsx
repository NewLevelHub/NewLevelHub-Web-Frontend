import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Info } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { PASS_STATUSES, USER_ROLES } from '@/shared/config/constants';
import { useUser } from '@/shared/hooks/useAuth';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { cn } from '@/shared/lib/cn';
import type { GuestPass } from '@/shared/types';

export default function PassDetailPage() {
  const { id } = useParams();
  const user = useUser();
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['guest-pass-detail', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await apiClient.get<GuestPass>(API.passes.detail(String(id)));
      return response.data;
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(API.passes.resend(String(id)));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['guest-pass-detail', id] });
      setSuccessMessage('QR-код успешно отправлен повторно.');
    },
    onError: () => setSuccessMessage(null),
  });

  const revokeMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(API.passes.revoke(String(id)));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['guest-pass-detail', id] });
      await queryClient.invalidateQueries({ queryKey: ['guest-passes'] });
      setSuccessMessage('Пропуск успешно отозван.');
    },
    onError: () => setSuccessMessage(null),
  });

  const activatesAt = data ? new Date(data.valid_from) : null;
  const [countdownDisplay, setCountdownDisplay] = useState<string>('');
  const [isNowActive, setIsNowActive] = useState(false);

  useEffect(() => {
    if (!activatesAt) return;
    if (activatesAt <= new Date()) {
      setIsNowActive(true);
      return;
    }
    const tick = () => {
      const diff = activatesAt.getTime() - Date.now();
      if (diff <= 0) {
        setIsNowActive(true);
        clearInterval(timer);
        return;
      }
      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const hh = String(hours).padStart(2, '0');
      const mm = String(minutes).padStart(2, '0');
      const ss = String(seconds).padStart(2, '0');
      setCountdownDisplay(`${hh}:${mm}:${ss}`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [data?.valid_from]);

  if (isLoading) {
    return <main className="p-3 sm:p-4 md:p-6 text-sm text-gray-400">Загрузка пропуска...</main>;
  }

  if (isError || !data) {
    return <main className="p-3 sm:p-4 md:p-6 text-sm text-rose-400">Не удалось загрузить детали пропуска.</main>;
  }

  const isNotYetActive = !isNowActive && activatesAt !== null && activatesAt > new Date();

  const canManagePass =
    user?.role === USER_ROLES.SUPERADMIN || user?.role === USER_ROLES.COMPANY_ADMIN;
  const canRevoke =
    canManagePass &&
    data.status !== PASS_STATUSES.USED &&
    data.status !== PASS_STATUSES.EXPIRED &&
    data.status !== PASS_STATUSES.REVOKED;

  return (
    <main className="mx-auto max-w-3xl space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-white">Пропуск #{data.id}</h1>
        <Link to="/passes" className="text-sm text-indigo-300 hover:text-indigo-200">
          Назад к списку
        </Link>
      </div>

      {canManagePass ? (
        <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
          <h2 className="mb-3 text-lg font-semibold text-white">Действия</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setSuccessMessage(null);
                resendMutation.mutate();
              }}
              disabled={resendMutation.isPending}
              className="inline-flex items-center rounded-lg border border-indigo-600 px-4 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-600/10 disabled:opacity-50"
            >
              {resendMutation.isPending ? 'Отправка...' : 'Повторно отправить QR'}
            </button>
            <button
              type="button"
              onClick={() => {
                setSuccessMessage(null);
                revokeMutation.mutate();
              }}
              disabled={!canRevoke || revokeMutation.isPending}
              className="inline-flex items-center rounded-lg border border-rose-700 px-4 py-2 text-sm font-medium text-rose-300 hover:bg-rose-700/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {revokeMutation.isPending ? 'Отзыв...' : 'Отозвать пропуск'}
            </button>
          </div>
          {isNotYetActive ? (
            <div className="mt-3 flex items-start gap-2 text-xs text-blue-300">
              <Info size={14} className="mt-0.5 shrink-0" />
              <span>
                При отправке гостю — уведомите его, что QR будет активен с{' '}
                {activatesAt!.toLocaleString('ru-RU')}.
              </span>
            </div>
          ) : null}
          {resendMutation.isError ? (
            <div className="mt-3 text-sm text-rose-300">
              {getApiErrorMessage(resendMutation.error, 'Не удалось повторно отправить QR.')}
            </div>
          ) : null}
          {revokeMutation.isError ? (
            <div className="mt-3 text-sm text-rose-300">
              {getApiErrorMessage(revokeMutation.error, 'Не удалось отозвать пропуск.')}
            </div>
          ) : null}
          {successMessage ? <div className="mt-3 text-sm text-emerald-300">{successMessage}</div> : null}
          {!canRevoke ? (
            <div className="mt-3 text-xs text-gray-400">Нельзя отозвать использованный, истекший или уже отозванный пропуск.</div>
          ) : null}
        </section>
      ) : null}

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
          <div className="relative inline-block">
            <img src={data.qr_image} alt="QR guest pass" className="max-h-80 rounded-lg border border-gray-700 bg-white p-3" />
            {isNotYetActive ? (
              <div className={cn(
                'absolute inset-0 flex flex-col items-center justify-center gap-1',
                'bg-black/60 backdrop-blur-sm rounded-lg'
              )}>
                <span className="text-sm text-gray-300">Будет активен в</span>
                <span className="font-semibold text-white">
                  {activatesAt!.toLocaleString('ru-RU')}
                </span>
                <span className="font-mono text-xs text-blue-400">
                  Активен через {countdownDisplay}
                </span>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-sm text-gray-400">QR изображение недоступно.</div>
        )}
      </section>
    </main>
  );
}
