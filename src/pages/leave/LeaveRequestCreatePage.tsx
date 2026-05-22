import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { LEAVE_TYPES, LEAVE_TYPE_LABELS, type LeaveType } from '@/shared/config/constants';
import { getApiError } from '@/shared/lib/getApiError';

type LeaveRequestCreatePayload = {
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  comment?: string;
};

const TYPE_OPTIONS: Array<{ value: LeaveType; label: string }> = [
  { value: LEAVE_TYPES.VACATION, label: LEAVE_TYPE_LABELS[LEAVE_TYPES.VACATION] },
  { value: LEAVE_TYPES.DAY_OFF, label: LEAVE_TYPE_LABELS[LEAVE_TYPES.DAY_OFF] },
  { value: LEAVE_TYPES.SICK_LEAVE, label: LEAVE_TYPE_LABELS[LEAVE_TYPES.SICK_LEAVE] },
  { value: LEAVE_TYPES.REMOTE, label: LEAVE_TYPE_LABELS[LEAVE_TYPES.REMOTE] },
];

export default function LeaveRequestCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [leaveType, setLeaveType] = useState<LeaveType>(LEAVE_TYPES.VACATION);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [comment, setComment] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const createLeaveMutation = useMutation({
    mutationFn: async (payload: LeaveRequestCreatePayload) => {
      await apiClient.post(API.leave.create, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
      navigate('/leave');
    },
    onError: (error: unknown) => {
      setFormError(getApiError(error).message);
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!startDate || !endDate) {
      setFormError('Укажите даты начала и окончания.');
      return;
    }
    if (startDate > endDate) {
      setFormError('Дата начала должна быть раньше или равна дате окончания.');
      return;
    }

    createLeaveMutation.mutate({
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      comment: comment.trim() || undefined,
    });
  };

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-primary">Подать заявку на отсутствие</h1>
        <p className="text-sm text-secondary">Заполните тип, даты и при необходимости добавьте комментарий.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-default bg-raised p-5">
        <label className="block text-sm text-secondary">
          Тип отсутствия
          <select
            value={leaveType}
            onChange={(event) => setLeaveType(event.target.value as LeaveType)}
            className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
          >
            {TYPE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-secondary">
            Дата начала
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
              required
            />
          </label>
          <label className="block text-sm text-secondary">
            Дата окончания
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
              required
            />
          </label>
        </div>

        <label className="block text-sm text-secondary">
          Комментарий
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
            placeholder="Например: поездка к врачу"
          />
        </label>

        {formError ? (
          <div className="rounded-lg border border-rose-800 bg-rose-950/30 px-3 py-2 text-sm text-rose-300" role="alert">
            {formError}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <Link
            to="/leave"
            className="inline-flex items-center rounded-lg border border-default bg-transparent px-4 py-2 text-sm font-medium text-secondary hover:bg-hover"
          >
            Отмена
          </Link>
          <button
            type="submit"
            disabled={createLeaveMutation.isPending}
            className="inline-flex items-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {createLeaveMutation.isPending ? 'Отправка...' : 'Подать заявку'}
          </button>
        </div>
      </form>
    </main>
  );
}
