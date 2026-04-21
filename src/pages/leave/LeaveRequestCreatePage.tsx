import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { LEAVE_TYPES } from '@/shared/config/constants';
import { getApiErrorMessage } from '@/shared/lib/apiError';

export default function LeaveRequestCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [leaveType, setLeaveType] = useState<string>(LEAVE_TYPES.VACATION);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [errorText, setErrorText] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient.post(API.leave.create, {
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        comment,
      }),
    onSuccess: async () => {
      setErrorText(null);
      await queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
      navigate('/leave');
    },
    onError: (error: unknown) => {
      setErrorText(getApiErrorMessage(error, 'Не удалось создать заявку.'));
    },
  });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Новая заявка на отпуск</h1>
        <p className="mt-1 text-sm text-gray-400">Заполните форму и отправьте заявку на рассмотрение.</p>
      </div>

      <form
        className="space-y-4 rounded-xl border border-gray-700 bg-gray-800 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          createMutation.mutate();
        }}
      >
        {errorText && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {errorText}
          </div>
        )}

        <div>
          <label htmlFor="leave-type" className="mb-1 block text-xs font-medium text-gray-400">
            Тип заявки
          </label>
          <select
            id="leave-type"
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
          >
            <option value={LEAVE_TYPES.VACATION}>Отпуск</option>
            <option value={LEAVE_TYPES.DAY_OFF}>Отгул</option>
            <option value={LEAVE_TYPES.SICK_LEAVE}>Больничный</option>
            <option value={LEAVE_TYPES.REMOTE}>Удаленка</option>
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="leave-start-date" className="mb-1 block text-xs font-medium text-gray-400">
              Дата начала
            </label>
            <input
              id="leave-start-date"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label htmlFor="leave-end-date" className="mb-1 block text-xs font-medium text-gray-400">
              Дата окончания
            </label>
            <input
              id="leave-end-date"
              type="date"
              required
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
            />
          </div>
        </div>

        <div>
          <label htmlFor="leave-comment" className="mb-1 block text-xs font-medium text-gray-400">
            Комментарий
          </label>
          <textarea
            id="leave-comment"
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
            placeholder="Опишите причину (опционально)"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {createMutation.isPending ? 'Отправка…' : 'Отправить заявку'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/leave')}
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}
