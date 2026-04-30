import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  SERVICE_REQUEST_TYPES,
  SERVICE_REQUEST_TYPE_LABELS,
  type ServiceRequestType,
} from '@/shared/config/constants';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import type { ServiceRequest, ServiceRequestCreatePayload } from '@/shared/types';

const TYPE_OPTIONS: Array<{ value: ServiceRequestType; label: string }> = [
  { value: SERVICE_REQUEST_TYPES.GENERAL, label: SERVICE_REQUEST_TYPE_LABELS[SERVICE_REQUEST_TYPES.GENERAL] },
  { value: SERVICE_REQUEST_TYPES.CLEANING, label: SERVICE_REQUEST_TYPE_LABELS[SERVICE_REQUEST_TYPES.CLEANING] },
  { value: SERVICE_REQUEST_TYPES.REPAIR, label: SERVICE_REQUEST_TYPE_LABELS[SERVICE_REQUEST_TYPES.REPAIR] },
  { value: SERVICE_REQUEST_TYPES.SUPPLIES, label: SERVICE_REQUEST_TYPE_LABELS[SERVICE_REQUEST_TYPES.SUPPLIES] },
];

export default function ServiceRequestCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [requestType, setRequestType] = useState<ServiceRequestType>(SERVICE_REQUEST_TYPES.GENERAL);
  const [description, setDescription] = useState('');
  const [floor, setFloor] = useState('');
  const [location, setLocation] = useState('');
  const [urgency, setUrgency] = useState<'normal' | 'urgent'>('normal');
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (payload: ServiceRequestCreatePayload) =>
      apiClient.post<ServiceRequest>(API.serviceRequests.create, payload).then((r) => r.data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      void navigate('/service-requests');
    },
    onError: (err: unknown) => {
      setFormError(getApiErrorMessage(err, 'Не удалось создать заявку.'));
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!description.trim()) {
      setFormError('Заполните описание заявки.');
      return;
    }

    createMutation.mutate({
      request_type: requestType,
      description: description.trim(),
      floor: floor ? Number(floor) : undefined,
      location: location.trim() || undefined,
      urgency,
    });
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white">Новая сервисная заявка</h1>
        <p className="text-sm text-gray-400">
          Опишите проблему или запрос — мы назначим исполнителя.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-gray-700 bg-gray-800 p-5"
      >
        <label className="block text-sm text-gray-300">
          Тип заявки
          <select
            value={requestType}
            onChange={(e) => setRequestType(e.target.value as ServiceRequestType)}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-gray-300">
            Этаж (необязательно)
            <input
              type="number"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              min={1}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
              placeholder="Например: 3"
            />
          </label>

          <label className="block text-sm text-gray-300">
            Место (необязательно)
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
              placeholder="Переговорка A, кухня..."
            />
          </label>
        </div>

        <label className="block text-sm text-gray-300">
          Описание
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            required
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500"
            placeholder="Опишите проблему или запрос подробнее"
          />
        </label>

        <label className="block text-sm text-gray-300">
          Срочность
          <select
            value={urgency}
            onChange={(e) => setUrgency(e.target.value as 'normal' | 'urgent')}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
          >
            <option value="normal">Обычная</option>
            <option value="urgent">Срочная</option>
          </select>
        </label>

        {formError ? (
          <div
            className="rounded-lg border border-rose-800 bg-rose-950/30 px-3 py-2 text-sm text-rose-300"
            role="alert"
          >
            {formError}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <Link
            to="/service-requests"
            className="inline-flex items-center rounded-lg border border-gray-700 bg-transparent px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700"
          >
            Отмена
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Отправка...' : 'Создать заявку'}
          </button>
        </div>
      </form>
    </main>
  );
}
