import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { RESOURCE_TYPE_LABELS, RESOURCE_TYPES, USER_ROLES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { getApiError } from '@/shared/lib/getApiError';
import { cn } from '@/shared/lib/cn';
import type { Booking, BookingResourceListItem, CompanyMember } from '@/shared/types';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'Asia/Almaty';

/** Format a datetime-local string with Asia/Almaty offset (e.g. "2025-04-20T09:00:00+05:00") */
function toAlmatyIso(localDatetime: string): string {
  if (!localDatetime) return '';
  const d = dayjs.tz(localDatetime, TZ);
  if (!d.isValid()) return '';
  return d.format();
}

/** Max date string (YYYY-MM-DD) = today + N days */
function maxDateStr(days: number): string {
  return dayjs().tz(TZ).add(days, 'day').format('YYYY-MM-DD');
}


interface BookingModalProps {
  resource: BookingResourceListItem;
  open: boolean;
  onClose: () => void;
}

export function BookingModal({ resource, open, onClose }: BookingModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const isParking = resource.type === RESOURCE_TYPES.PARKING;
  const isMeetingRoom = resource.type === RESOURCE_TYPES.MEETING_ROOM;
  const isDesk = resource.type === RESOURCE_TYPES.DESK;
  const isCapsule = resource.type === RESOURCE_TYPES.CAPSULE;

  const [selectedDate, setSelectedDate] = useState('');
  const [startLocal, setStartLocal] = useState('');
  const [endLocal, setEndLocal] = useState('');
  const [description, setDescription] = useState('');
  const [participantIds, setParticipantIds] = useState<number[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const overlayRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLInputElement>(null);

  const todayStr = dayjs().tz(TZ).format('YYYY-MM-DD');
  const maxDateDesk = maxDateStr(14);
  const maxDateParking = maxDateStr(7);

  const maxDate = isDesk ? maxDateDesk : isParking ? maxDateParking : undefined;

  // Min step for datetime-local (current moment in local time)
  const minStep = useMemo(() => {
    return dayjs().tz(TZ).format('YYYY-MM-DDTHH:mm');
  }, []);

  // Fetch company members for participant multi-select (only for meeting rooms)
  const companyId = user?.company_id ? String(user.company_id) : null;

  const { data: membersData, isLoading: loadingMembers } = useQuery({
    queryKey: ['company-members-for-booking', companyId],
    enabled: isMeetingRoom && open && companyId !== null,
    queryFn: async () => {
      const { data } = await apiClient.get<CompanyMember[] | { results: CompanyMember[] }>(
        API.companies.members(companyId!),
        { params: { page_size: 200 } },
      );
      return Array.isArray(data) ? data : data.results;
    },
  });
  const userOptions = membersData ?? [];

  // Reset form when modal opens or resource changes
  useEffect(() => {
    if (open) {
      setSelectedDate('');
      setStartLocal('');
      setEndLocal('');
      setDescription('');
      setParticipantIds([]);
      setErrorMsg(null);
      setSuccessMsg(null);
      setTimeout(() => {
        firstFocusableRef.current?.focus();
      }, 50);
    }
  }, [open, resource.id]);

  // Auto-set parking times when date is selected
  useEffect(() => {
    if (isParking && selectedDate) {
      // start = 00:00, end = 23:59 in Asia/Almaty
      setStartLocal(`${selectedDate}T00:00`);
      setEndLocal(`${selectedDate}T23:59`);
    }
  }, [isParking, selectedDate]);

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

  /** Client-side validation before submit */
  function validateBooking(): string | null {
    const start = dayjs.tz(isParking ? `${selectedDate}T00:00` : startLocal, TZ);
    const end = dayjs.tz(isParking ? `${selectedDate}T23:59` : endLocal, TZ);

    if (!start.isValid() || !end.isValid()) return 'Укажите начало и конец бронирования.';

    const durationMin = end.diff(start, 'minute');

    if (isDesk) {
      const maxDesk = dayjs().tz(TZ).add(14, 'day');
      if (start.isAfter(maxDesk)) return 'Можно бронировать не более чем на 14 дней вперёд';
    }

    if (isParking) {
      const maxParking = dayjs().tz(TZ).add(7, 'day');
      if (start.isAfter(maxParking)) return 'Можно бронировать не более чем на 7 дней вперёд';
    }

    if (isMeetingRoom) {
      if (durationMin < 30) return 'Минимальная длительность — 30 минут';
      if (durationMin > 240) return 'Максимальная длительность — 4 часа';
    }

    if (isCapsule) {
      if (durationMin < 60) return 'Минимальная длительность — 1 час';
      if (durationMin > 480) return 'Максимальная длительность — 8 часов';
    }

    return null;
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const startDatetime = isParking ? `${selectedDate}T00:00` : startLocal;
      const endDatetime = isParking ? `${selectedDate}T23:59` : endLocal;

      const start_time = toAlmatyIso(startDatetime);
      const end_time = toAlmatyIso(endDatetime);

      if (!start_time || !end_time) throw new Error('Укажите начало и конец бронирования.');

      const payload: Record<string, unknown> = {
        resource_id: resource.id,
        start_time,
        end_time,
        description: description.trim(),
        participant_ids: isMeetingRoom ? participantIds : [],
      };

      const { data } = await apiClient.post<Booking>(API.bookings.reservations.create, payload);
      console.log('data', JSON.stringify(data, null, 2));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-resources'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking-resource-schedule', resource.id], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['resource-week-schedule', resource.id], refetchType: 'all' });
      setSuccessMsg('Бронирование успешно создано!');
      setTimeout(() => {
        onClose();
      }, 1500);
    },
    onError: (e) => {
      setErrorMsg(getApiError(e).message);
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
    const validationError = validateBooking();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }
    createMutation.mutate();
  };

  const toggleParticipant = (userId: number) => {
    setParticipantIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
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
    'w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-surface text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-500';

  // Determine if current user is admin/superadmin for display logic
  const isAdmin =
    user?.role === USER_ROLES.SUPERADMIN || user?.role === USER_ROLES.COMPANY_ADMIN;

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
        className="relative w-full max-w-md rounded-2xl border border-default bg-surface shadow-xl overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-default px-6 py-4">
          <div className="min-w-0 pr-4">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">
              {RESOURCE_TYPE_LABELS[resource.type]}
            </p>
            <h2 className="mt-0.5 text-lg font-bold text-primary leading-snug">
              {resource.name}
            </h2>
            <p className="mt-0.5 text-xs text-muted">{floorZoneInfo}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-secondary hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          {/* Parking: date-only picker */}
          {isParking ? (
            <div>
              <label
                className="mb-1 block text-sm font-semibold text-primary"
                htmlFor="modal-booking-date"
              >
                Дата бронирования
              </label>
              <input
                ref={firstFocusableRef}
                id="modal-booking-date"
                type="date"
                required
                min={todayStr}
                max={maxDateParking}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={fieldClass}
              />
              <p className="mt-1 text-xs text-muted">
                Парковка бронируется на весь день (00:00 — 23:59)
              </p>
            </div>
          ) : (
            <>
              {/* Date limits hint for desk */}
              {isDesk && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Рабочее место можно бронировать не более чем на 14 дней вперёд.
                </p>
              )}
              {isCapsule && (
                <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  Капсула: от 1 до 8 часов.
                </p>
              )}
              {isMeetingRoom && (
                <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  Переговорка: от 30 минут до 4 часов.
                </p>
              )}

              <div>
                <label
                  className="mb-1 block text-sm font-semibold text-primary"
                  htmlFor="modal-booking-start"
                >
                  Начало
                </label>
                <input
                  ref={firstFocusableRef}
                  id="modal-booking-start"
                  type="datetime-local"
                  required
                  min={minStep}
                  max={maxDate ? `${maxDate}T23:59` : undefined}
                  value={startLocal}
                  onChange={(e) => setStartLocal(e.target.value)}
                  className={fieldClass}
                />
              </div>

              <div>
                <label
                  className="mb-1 block text-sm font-semibold text-primary"
                  htmlFor="modal-booking-end"
                >
                  Окончание
                </label>
                <input
                  id="modal-booking-end"
                  type="datetime-local"
                  required
                  min={startLocal || minStep}
                  max={maxDate ? `${maxDate}T23:59` : undefined}
                  value={endLocal}
                  onChange={(e) => setEndLocal(e.target.value)}
                  className={fieldClass}
                />
              </div>
            </>
          )}

          {/* Participants multi-select for meeting rooms */}
          {isMeetingRoom && (
            <div>
              <p className="mb-2 text-sm font-semibold text-primary">
                Участники{' '}
                <span className="font-normal text-muted">(необязательно)</span>
              </p>

              {loadingMembers ? (
                <p className="text-sm text-muted">Загрузка участников…</p>
              ) : userOptions.filter((u) => u.id !== user?.id).length === 0 ? (
                <p className="text-sm text-secondary">Нет доступных участников</p>
              ) : (
                <>
                  <div
                    className="max-h-40 overflow-y-auto rounded-lg border border-gray-300 bg-surface divide-y divide-[color:var(--border)]"
                    role="listbox"
                    aria-multiselectable="true"
                    aria-label="Выберите участников"
                  >
                    {userOptions
                      .filter((u) => u.id !== user?.id)
                      .map((u) => {
                        const selected = participantIds.includes(u.id);
                        return (
                          <button
                            key={u.id}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onClick={() => toggleParticipant(u.id)}
                            className={cn(
                              'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-raised transition-colors',
                              selected && 'bg-blue-50',
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-4 w-4 shrink-0 items-center justify-center rounded border text-xs font-bold',
                                selected
                                  ? 'border-blue-600 bg-blue-600 text-white'
                                  : 'border-gray-300 text-transparent',
                              )}
                              aria-hidden="true"
                            >
                              ✓
                            </span>
                            <span className="text-primary">{u.full_name || u.email}</span>
                            <span className="ml-auto text-xs text-secondary">{u.email}</span>
                          </button>
                        );
                      })}
                  </div>
                  {participantIds.length > 0 && (
                    <p className="mt-1 text-xs text-blue-600">
                      Выбрано: {participantIds.length}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          <div>
            <label
              className="mb-1 block text-sm font-semibold text-primary"
              htmlFor="modal-booking-desc"
            >
              Комментарий{' '}
              <span className="font-normal text-muted">(необязательно)</span>
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

          {!isAdmin && (
            <p className="text-xs text-muted leading-relaxed">
              Требуется подтверждённый email. Время отправляется с часовым поясом Asia/Almaty (+05:00).
            </p>
          )}

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
                'flex-1 rounded-lg py-2.5 text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:ring-blue-500',
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
