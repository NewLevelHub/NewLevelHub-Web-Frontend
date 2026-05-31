import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { LEAVE_STATUSES, LEAVE_TYPES, LEAVE_TYPE_LABELS, type LeaveType } from '@/shared/config/constants';
import { getApiError } from '@/shared/lib/getApiError';
import type { LeaveRequest } from '@/shared/types';
import { useReviewerOptions } from './useReviewerOptions';

type LeaveRequestUpdatePayload = {
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  comment: string;
  assigned_reviewer?: number | null;
};

const TYPE_OPTIONS: Array<{ value: LeaveType; label: string }> = [
  { value: LEAVE_TYPES.VACATION, label: LEAVE_TYPE_LABELS[LEAVE_TYPES.VACATION] },
  { value: LEAVE_TYPES.DAY_OFF, label: LEAVE_TYPE_LABELS[LEAVE_TYPES.DAY_OFF] },
  { value: LEAVE_TYPES.SICK_LEAVE, label: LEAVE_TYPE_LABELS[LEAVE_TYPES.SICK_LEAVE] },
  { value: LEAVE_TYPES.REMOTE, label: LEAVE_TYPE_LABELS[LEAVE_TYPES.REMOTE] },
];

export default function LeaveRequestEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { isCompanyAdmin, options: reviewerOptions, isLoading: reviewersLoading } = useReviewerOptions();
  const [leaveType, setLeaveType] = useState<LeaveType>(LEAVE_TYPES.VACATION);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [comment, setComment] = useState('');
  const [assignedReviewer, setAssignedReviewer] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const reviewerRequired = isCompanyAdmin;
  const noPeerAvailable = isCompanyAdmin && !reviewersLoading && reviewerOptions.length === 0;

  const { data: leave, isLoading, error } = useQuery({
    queryKey: ['leave-request', id],
    queryFn: () =>
      apiClient.get<LeaveRequest>(API.leave.detail(id!)).then(r => r.data),
    enabled: !!id,
  });

  useEffect(() => {
    if (leave && !initialized) {
      setLeaveType(leave.leave_type);
      setStartDate(leave.start_date);
      setEndDate(leave.end_date);
      setComment(leave.comment ?? '');
      setAssignedReviewer(leave.assigned_reviewer != null ? String(leave.assigned_reviewer) : '');
      setInitialized(true);
    }
  }, [leave, initialized]);

  const updateMutation = useMutation({
    mutationFn: async (payload: LeaveRequestUpdatePayload) => {
      await apiClient.patch(API.leave.update(id!), payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
      await queryClient.invalidateQueries({ queryKey: ['leave-request', id] });
      navigate('/hr/leaves');
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
    if (reviewerRequired && !assignedReviewer) {
      setFormError('Укажите согласующего администратора.');
      return;
    }

    updateMutation.mutate({
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      comment: comment.trim(),
      assigned_reviewer: assignedReviewer ? Number(assignedReviewer) : null,
    });
  };

  if (isLoading) {
    return <main className="mx-auto max-w-2xl p-6"><p className="text-sm text-secondary">Загрузка...</p></main>;
  }

  if (error || !leave) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-rose-400">{error ? getApiError(error).message : 'Заявка не найдена.'}</p>
      </main>
    );
  }

  if (leave.status !== LEAVE_STATUSES.PENDING) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-2xl font-bold text-primary">Редактирование заявки</h1>
        <div className="rounded-lg border border-amber-700 bg-warning-subtle px-4 py-3 text-sm text-warning">
          Редактирование недоступно: заявка уже не находится на рассмотрении.
        </div>
        <Link
          to="/hr/leaves"
          className="inline-flex items-center rounded-lg border border-default px-4 py-2 text-sm font-medium text-secondary hover:bg-hover"
        >
          ← Назад к списку
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-primary">Редактировать заявку</h1>
        <p className="text-sm text-secondary">Измените данные заявки и сохраните.</p>
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

        {reviewerRequired ? (
          noPeerAvailable ? (
            <div className="rounded-lg border border-rose-800 bg-rose-950/30 px-3 py-2 text-sm text-rose-300" role="alert">
              В компании нет другого администратора. Сохранить заявку нельзя — попросите суперадмина назначить ещё одного company_admin.
            </div>
          ) : (
            <label className="block text-sm text-secondary">
              Согласующий администратор <span className="text-rose-400">*</span>
              <select
                value={assignedReviewer}
                onChange={(event) => setAssignedReviewer(event.target.value)}
                className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
                required
              >
                <option value="">{reviewersLoading ? 'Загрузка...' : 'Выберите согласующего'}</option>
                {reviewerOptions.map((opt) => (
                  <option key={opt.id} value={String(opt.id)}>
                    {opt.full_name}
                  </option>
                ))}
              </select>
            </label>
          )
        ) : null}

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
            to="/hr/leaves"
            className="inline-flex items-center rounded-lg border border-default bg-transparent px-4 py-2 text-sm font-medium text-secondary hover:bg-hover"
          >
            Отмена
          </Link>
          <button
            type="submit"
            disabled={updateMutation.isPending || noPeerAvailable}
            className="inline-flex items-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </div>
      </form>
    </main>
  );
}
