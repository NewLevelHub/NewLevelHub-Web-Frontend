import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { RESOURCE_TYPE_LABELS } from '@/shared/config/constants';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { cn } from '@/shared/lib/cn';
import type { Booking, BookingResourceListItem } from '@/shared/types';

interface BookingModalProps {
  resource: BookingResourceListItem;
  open: boolean;
  onClose: () => void;
}

function toIsoUtc(localDatetime: string): string {
  if (!localDatetime) return '';
  const d = new Date(localDatetime);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
}

export function BookingModal({ resource, open, onClose }: BookingModalProps) {
  const queryClient = useQueryClient();

  const [startLocal, setStartLocal] = useState('');
  const [endLocal, setEndLocal] = useState('');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const overlayRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLInputElement>(null);

  const minStep = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }, []);

  // Reset form when modal opens for a (possibly different) resource
  useEffect(() => {
    if (open) {
      setStartLocal('');
      setEndLocal('');
      setDescription('');
      setErrorMsg(null);
      setSuccessMsg(null);
      // Delay focus until the modal is rendered
      setTimeout(() => {
        firstFocusableRef.current?.focus();
      }, 50);
    }
  }, [open, resource.id]);

  // Escape key closes modal
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const start_time = toIsoUtc(startLocal);
      const end_time = toIsoUtc(endLocal);
      if (!start_time || !end_time) throw new Error('Укажите начало и конец бронирования.');
      const { data } = await apiClient.post<Booking>(API.bookings.reservations.create, {
        resource_id: resource.id,
        start_time,
        end_time,
        description: description.trim(),
        participant_ids: [],
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-resources'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setSuccessMsg('Бронирование успешно создано!');
      setTimeout(() => {
        onClose();
      }, 1500);
    },
    onError: (e) => {
      const axiosError = e as { response?: { status?: number } };
      if (axiosError.response?.status === 409) {
        setErrorMsg('Этот слот уже занят. Выберите другое время.');
        return;
      }
      if (e instanceof Error && e.message && !('response' in e)) {
        setErrorMsg(e.message);
        return;
      }
      setErrorMsg(getApiErrorMessage(e));
    },
  });

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    createMutation.mutate();
  };

  const floorZoneInfo = [
    `Этаж ${resource.floor}`,
    resource.zone || null,
    resource.parking_type ? (resource.parking_type === 'vip' ? 'VIP' : 'Обычная') : null,
    resource.capsule_zone
      ? resource.capsule_zone === 'quiet'
        ? 'тихая зона'
        : 'обычная'
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const fieldClass =
    'w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500';

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleOverlayClick}
      aria-modal="true"
      role="dialog"
      aria-label={`Бронирование: ${resource.name}`}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
          <div className="min-w-0 pr-4">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">
              {RESOURCE_TYPE_LABELS[resource.type]}
            </p>
            <h2 className="mt-0.5 text-lg font-bold text-gray-900 leading-snug">
              {resource.name}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">{floorZoneInfo}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form className="px-6 py-5 space-y-4" onSubmit={handleSubmit}>
          {errorMsg && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
            >
              {successMsg}
            </div>
          )}

          <div>
            <label
              className="mb-1 block text-sm font-semibold text-gray-900"
              htmlFor="modal-booking-start"
            >
              Начало (локальное время)
            </label>
            <input
              ref={firstFocusableRef}
              id="modal-booking-start"
              type="datetime-local"
              required
              min={minStep}
              value={startLocal}
              onChange={(e) => setStartLocal(e.target.value)}
              className={fieldClass}
            />
          </div>

          <div>
            <label
              className="mb-1 block text-sm font-semibold text-gray-900"
              htmlFor="modal-booking-end"
            >
              Окончание
            </label>
            <input
              id="modal-booking-end"
              type="datetime-local"
              required
              min={startLocal || minStep}
              value={endLocal}
              onChange={(e) => setEndLocal(e.target.value)}
              className={fieldClass}
            />
          </div>

          <div>
            <label
              className="mb-1 block text-sm font-semibold text-gray-900"
              htmlFor="modal-booking-desc"
            >
              Комментарий{' '}
              <span className="font-normal text-gray-500">(необязательно)</span>
            </label>
            <textarea
              id="modal-booking-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Например, еженедельный стендап"
              className={cn(fieldClass, 'resize-none')}
            />
          </div>

          <p className="text-xs text-gray-500 leading-relaxed">
            Время отправляется на сервер в UTC. Требуется подтверждённый email.
          </p>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 bg-gray-50 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || successMsg !== null}
              className={cn(
                'flex-1 rounded-lg py-2.5 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500',
                createMutation.isPending || successMsg !== null
                  ? 'bg-blue-400 cursor-not-allowed opacity-70'
                  : 'bg-blue-600 hover:bg-blue-700',
              )}
            >
              {createMutation.isPending ? 'Отправка…' : 'Забронировать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
