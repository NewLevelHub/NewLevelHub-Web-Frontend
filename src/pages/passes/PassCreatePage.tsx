import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { getApiError } from '@/shared/lib/getApiError';
import type { GuestPass } from '@/shared/types';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'Asia/Almaty';

type GuestPassCreatePayload = {
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  purpose: string;
  valid_from: string;
  valid_until: string;
  is_single_use: boolean;
};

export default function PassCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [purpose, setPurpose] = useState('');
  const [validFrom, setValidFrom] = useState(dayjs().tz(TZ).format('YYYY-MM-DDTHH:mm'));
  const [isSingleUse, setIsSingleUse] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const createPassMutation = useMutation({
    mutationFn: async (payload: GuestPassCreatePayload) => {
      const response = await apiClient.post<GuestPass>(API.passes.create, payload);
      return response.data;
    },
    onSuccess: async (createdPass) => {
      await queryClient.invalidateQueries({ queryKey: ['guest-passes'] });
      navigate(`/passes/${createdPass.id}`);
    },
    onError: (error: unknown) => {
      setFormError(getApiError(error).message);
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    if (!guestName.trim() || !guestEmail.trim() || !purpose.trim()) {
      setFormError('Заполните обязательные поля: имя, email и цель.');
      return;
    }
    const start = dayjs.tz(validFrom, TZ);
    const end = isSingleUse ? start.add(30, 'day') : start.add(1, 'day');
    createPassMutation.mutate({
      guest_name: guestName.trim(),
      guest_email: guestEmail.trim(),
      guest_phone: guestPhone.trim() || undefined,
      purpose: purpose.trim(),
      valid_from: start.toISOString(),
      valid_until: end.toISOString(),
      is_single_use: isSingleUse,
    });
  };

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-primary">Создание гостевого пропуска</h1>
        <p className="text-sm text-secondary">Можно отправить инвайт на любой email гостя.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-default bg-raised p-5">
        <label className="block text-sm text-secondary">
          Имя гостя
          <input
            value={guestName}
            onChange={(event) => setGuestName(event.target.value)}
            className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
            required
          />
        </label>
        <label className="block text-sm text-secondary">
          Email гостя
          <input
            type="email"
            value={guestEmail}
            onChange={(event) => setGuestEmail(event.target.value)}
            className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
            required
          />
        </label>
        <label className="block text-sm text-secondary">
          Телефон (необязательно)
          <input
            value={guestPhone}
            onChange={(event) => setGuestPhone(event.target.value)}
            className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
          />
        </label>
        <label className="block text-sm text-secondary">
          Цель визита
          <textarea
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
            required
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-secondary">
            Начало действия
            <input
              type="datetime-local"
              value={validFrom}
              onChange={(event) => setValidFrom(event.target.value)}
              min={dayjs().tz(TZ).format('YYYY-MM-DDTHH:mm')}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
              required
            />
            <p className="mt-1 text-xs text-muted">Код станет активным начиная с этого момента</p>
          </label>
          <div className="block text-sm text-secondary">
            Действует до
            <div className="mt-1 rounded-lg border border-default bg-surface px-3 py-2 text-sm text-secondary">
              {isSingleUse
                ? 'Автоматически: +30 дней от даты начала'
                : 'Автоматически: +1 день от даты начала'}
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-secondary">
          <input
            type="checkbox"
            checked={isSingleUse}
            onChange={(event) => setIsSingleUse(event.target.checked)}
            className="h-4 w-4 rounded border-default bg-surface text-brand"
          />
          Одноразовый пропуск
        </label>

        {formError ? (
          <div className="rounded-lg border border-rose-800 bg-rose-950/30 px-3 py-2 text-sm text-rose-300">{formError}</div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Link
            to="/passes"
            className="inline-flex items-center rounded-lg border border-default px-4 py-2 text-sm font-medium text-secondary hover:bg-hover"
          >
            Отмена
          </Link>
          <button
            type="submit"
            disabled={createPassMutation.isPending}
            className="inline-flex items-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {createPassMutation.isPending ? 'Создание...' : 'Создать пропуск'}
          </button>
        </div>
      </form>
    </main>
  );
}
