import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { RESOURCE_TYPE_LABELS } from '@/shared/config/constants';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { resolveMediaUrl } from '@/shared/lib/mediaUrl';
import type { Booking, BookingResourceDetail } from '@/shared/types';

function toIsoUtc(localDatetime: string): string {
  if (!localDatetime) return '';
  const d = new Date(localDatetime);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
}

export default function BookingCreatePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const resourceParam = searchParams.get('resource');
  const resourceId = resourceParam ? Number(resourceParam) : NaN;
  const validResourceId = Number.isFinite(resourceId) ? String(resourceId) : null;

  const [startLocal, setStartLocal] = useState('');
  const [endLocal, setEndLocal] = useState('');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: resource, isLoading: loadingResource } = useQuery({
    queryKey: ['booking-resource', resourceId],
    enabled: validResourceId !== null,
    queryFn: async () => {
      const { data } = await apiClient.get<BookingResourceDetail>(
        API.bookings.resources.detail(validResourceId!),
      );
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const start_time = toIsoUtc(startLocal);
      const end_time = toIsoUtc(endLocal);
      if (!validResourceId) throw new Error('Выберите ресурс из каталога.');
      if (!start_time || !end_time) throw new Error('Укажите начало и конец.');
      const { data } = await apiClient.post<Booking>(API.bookings.reservations.create, {
        resource: Number(validResourceId),
        start_time,
        end_time,
        description: description.trim(),
        participant_ids: [],
      });
      return data;
    },
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      navigate(`/bookings/${booking.id}`);
    },
    onError: (e) => {
      if (e instanceof Error && e.message && !('response' in e)) {
        setErrorMsg(e.message);
        return;
      }
      setErrorMsg(getApiErrorMessage(e));
    },
  });

  const minStep = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }, []);

  /** Тёмный фон шелла задаёт `text-white`; на светлых карточках явно задаём тёмный текст. */
  const fieldClass =
    'w-full px-3 py-2 text-sm rounded-lg border border-gray-400 bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500';

  if (validResourceId === null) {
    return (
      <main className="px-4 py-8 max-w-lg mx-auto space-y-4 text-zinc-100">
        <h1 className="text-xl font-bold text-white">Новое бронирование</h1>
        <p className="text-sm text-zinc-400">
          Сначала выберите ресурс в{' '}
          <Link to="/bookings/catalog" className="text-blue-400 hover:text-blue-300 underline-offset-2 hover:underline">
            каталоге
          </Link>
          .
        </p>
      </main>
    );
  }

  if (loadingResource) {
    return (
      <main className="px-4 py-8 max-w-lg mx-auto text-zinc-300">
        <p className="text-sm">Загрузка ресурса…</p>
      </main>
    );
  }

  if (!resource) {
    return (
      <main className="px-4 py-8 max-w-lg mx-auto space-y-4 text-zinc-100">
        <p className="text-sm text-red-400">Ресурс не найден или недоступен.</p>
        <Link
          to="/bookings/catalog"
          className="text-sm text-blue-400 hover:text-blue-300 underline-offset-2 hover:underline"
        >
          В каталог
        </Link>
      </main>
    );
  }

  return (
    <main className="px-4 py-8 max-w-lg mx-auto space-y-6 text-zinc-100">
      <Link
        to="/bookings/catalog"
        className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Каталог
      </Link>

      <div className="flex gap-4">
        {resource.photo && (
          <img
            src={resolveMediaUrl(resource.photo) ?? resource.photo}
            alt=""
            className="h-20 w-28 rounded-lg object-cover border border-zinc-600"
          />
        )}
        <div>
          <h1 className="text-xl font-bold text-white">{resource.name}</h1>
          <p className="text-sm text-zinc-400">
            {RESOURCE_TYPE_LABELS[resource.type]} · этаж {resource.floor}
            {resource.zone ? ` · ${resource.zone}` : ''}
          </p>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-lg border border-red-400/50 bg-red-950/40 px-4 py-3 text-sm text-red-200"
        >
          {errorMsg}
        </div>
      )}

      <form
        className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-md"
        onSubmit={(e) => {
          e.preventDefault();
          setErrorMsg(null);
          createMutation.mutate();
        }}
      >
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-900" htmlFor="booking-start">
            Начало (локальное время)
          </label>
          <input
            id="booking-start"
            type="datetime-local"
            required
            min={minStep}
            value={startLocal}
            onChange={(e) => setStartLocal(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-900" htmlFor="booking-end">
            Окончание
          </label>
          <input
            id="booking-end"
            type="datetime-local"
            required
            value={endLocal}
            onChange={(e) => setEndLocal(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-900" htmlFor="booking-note">
            Комментарий
          </label>
          <textarea
            id="booking-note"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={fieldClass}
            placeholder="Необязательно"
          />
        </div>
        <p className="text-xs leading-relaxed text-gray-700">
          Бронирование требует подтверждённый email (кроме superadmin). Время отправляется на сервер в UTC.
        </p>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {createMutation.isPending ? 'Отправка…' : 'Забронировать'}
        </button>
      </form>
    </main>
  );
}
