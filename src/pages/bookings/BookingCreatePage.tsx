import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { RESOURCE_TYPE_LABELS, RESOURCE_TYPES, USER_ROLES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { cn } from '@/shared/lib/cn';
import { resolveMediaUrl } from '@/shared/lib/mediaUrl';
import type { Booking, BookingResourceDetail, CompanyMember } from '@/shared/types';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'Asia/Almaty';

/** Format a datetime-local string with Asia/Almaty offset */
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

/** Map backend error detail strings to user-friendly Russian messages */
function mapApiError(rawMessage: unknown, status?: number): string {
  const message = typeof rawMessage === 'string' ? rawMessage : String(rawMessage ?? '');
  if (status === 409) return 'Выбранное время уже занято';
  if (status === 403 && message.includes('cancel your own')) return 'Нельзя отменить чужую бронь';
  if (message.includes('Email not verified')) return 'Для бронирования нужно подтвердить email';
  if (message.includes('Datetime must include timezone')) return 'Ошибка формата даты';
  if (message.includes('Booking start time must be in the future')) return 'Время начала должно быть в будущем';
  if (message.includes('Booking is outside resource availability hours')) return 'Выбранное время вне доступных часов ресурса';
  if (message.includes('Booking is outside resource availability days')) return 'Выбранный день недоступен для этого ресурса';
  if (message.includes('Booking must be within a single day')) return 'Бронирование должно быть в пределах одного дня';
  if (message.includes('Resource is assigned to another company')) return 'Ресурс привязан к другой компании';
  if (message.includes('Desk booking must start within 14 days')) return 'Слишком далёкая дата';
  if (message.includes('Meeting room booking minimum duration is 30')) return 'Минимальная длительность — 30 минут';
  if (message.includes('Meeting room booking maximum duration is 4')) return 'Максимальная длительность — 4 часа';
  if (message.includes('Parking booking must be whole-day only')) return 'Только целый день';
  if (message.includes('Capsule booking minimum')) return message.replace(/Capsule booking minimum duration is (\d+) hours?\.?/, 'Мин. $1 ч');
  if (message.includes('Capsule booking maximum')) return message.replace(/Capsule booking maximum duration is (\d+) hours?\.?/, 'Макс. $1 ч');
  if (message.includes('Minimum booking duration is')) return message.replace(/Minimum booking duration is (\d+) minutes?\.?/, 'Мин. $1 минут');
  if (message.includes('Active booking limit exceeded')) return 'Достигнут лимит броней';
  return message || 'Произошла ошибка';
}

function getBookingError(error: unknown): string {
  const err = error as { response?: { status?: number }; message?: string };
  const status = err.response?.status;
  const baseMessage = getApiErrorMessage(error, 'Произошла ошибка');
  if (baseMessage) return mapApiError(baseMessage, status);
  if (status === 409) return 'Выбранное время уже занято';
  if (err instanceof Error && err.message && !('response' in err)) return err.message;
  return 'Произошла ошибка';
}

export default function BookingCreatePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const resourceParam = searchParams.get('resource');
  const resourceId = resourceParam ? Number(resourceParam) : NaN;
  const validResourceId = Number.isFinite(resourceId) ? String(resourceId) : null;

  const todayStr = dayjs().tz(TZ).format('YYYY-MM-DD');

  const [selectedDate, setSelectedDate] = useState('');
  const [startLocal, setStartLocal] = useState('');
  const [endLocal, setEndLocal] = useState('');
  const [description, setDescription] = useState('');
  const [participantIds, setParticipantIds] = useState<number[]>([]);
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

  const isParking = resource?.type === RESOURCE_TYPES.PARKING;
  const isMeetingRoom = resource?.type === RESOURCE_TYPES.MEETING_ROOM;
  const isDesk = resource?.type === RESOURCE_TYPES.DESK;
  const isCapsule = resource?.type === RESOURCE_TYPES.CAPSULE;

  const maxDateDesk = maxDateStr(14);
  const maxDateParking = maxDateStr(7);
  const maxDate = isDesk ? maxDateDesk : isParking ? maxDateParking : undefined;

  const minStep = useMemo(() => {
    return dayjs().tz(TZ).format('YYYY-MM-DDTHH:mm');
  }, []);

  // Fetch company members for participant multi-select
  const companyId = user?.company_id ? String(user.company_id) : null;

  const { data: membersData, isLoading: loadingMembers } = useQuery({
    queryKey: ['company-members-for-booking', companyId],
    enabled: isMeetingRoom && companyId !== null,
    queryFn: async () => {
      const { data } = await apiClient.get<CompanyMember[] | { results: CompanyMember[] }>(
        API.companies.members(companyId!),
        { params: { page_size: 200 } },
      );
      return Array.isArray(data) ? data : data.results;
    },
  });
  const userOptions = membersData ?? [];

  /** Client-side validation */
  function validateBooking(): string | null {
    const startDatetime = isParking ? `${selectedDate}T00:00` : startLocal;
    const endDatetime = isParking ? `${selectedDate}T23:59` : endLocal;
    const start = dayjs.tz(startDatetime, TZ);
    const end = dayjs.tz(endDatetime, TZ);

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
      if (!validResourceId) throw new Error('Выберите ресурс из каталога.');

      const startDatetime = isParking ? `${selectedDate}T00:00` : startLocal;
      const endDatetime = isParking ? `${selectedDate}T23:59` : endLocal;
      const start_time = toAlmatyIso(startDatetime);
      const end_time = toAlmatyIso(endDatetime);

      if (!start_time || !end_time) throw new Error('Укажите начало и конец.');

      const { data } = await apiClient.post<Booking>(API.bookings.reservations.create, {
        resource_id: Number(validResourceId),
        start_time,
        end_time,
        description: description.trim(),
        participant_ids: isMeetingRoom ? participantIds : [],
      });
      return data;
    },
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      navigate(`/bookings/${booking.id}`);
    },
    onError: (e) => {
      if (e instanceof Error && e.message && !('response' in e)) {
        setErrorMsg(e.message);
        return;
      }
      setErrorMsg(getBookingError(e));
    },
  });

  const toggleParticipant = (userId: number) => {
    setParticipantIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const fieldClass =
    'w-full px-3 py-2 text-sm rounded-lg border border-gray-400 bg-surface text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-500';

  if (validResourceId === null) {
    return (
      <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8 max-w-lg mx-auto space-y-4 text-zinc-100">
        <h1 className="text-xl font-bold text-primary">Новое бронирование</h1>
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
      <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8 max-w-lg mx-auto text-zinc-300">
        <p className="text-sm">Загрузка ресурса…</p>
      </main>
    );
  }

  if (!resource) {
    return (
      <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8 max-w-lg mx-auto space-y-4 text-zinc-100">
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
    <main className="px-3 py-4 sm:px-4 sm:py-6 md:py-8 max-w-lg mx-auto space-y-6 text-zinc-100">
      <Link
        to="/bookings/catalog"
        className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-primary"
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
          <h1 className="text-xl font-bold text-primary">{resource.name}</h1>
          <p className="text-sm text-zinc-400">
            {RESOURCE_TYPE_LABELS[resource.type]} · этаж {resource.floor}
            {resource.zone ? ` · ${resource.zone}` : ''}
          </p>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-lg border border-red-400/50 bg-danger-subtle px-4 py-3 text-sm text-danger-badge"
        >
          {errorMsg}
        </div>
      )}

      <form
        className="space-y-4 rounded-2xl border border-default bg-surface p-6 text-primary shadow-md"
        onSubmit={(e) => {
          e.preventDefault();
          setErrorMsg(null);
          const validationError = validateBooking();
          if (validationError) {
            setErrorMsg(validationError);
            return;
          }
          createMutation.mutate();
        }}
      >
        {/* Parking: date-only */}
        {isParking ? (
          <div>
            <label className="mb-1 block text-sm font-semibold text-primary" htmlFor="booking-date">
              Дата бронирования
            </label>
            <input
              id="booking-date"
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
              <label className="mb-1 block text-sm font-semibold text-primary" htmlFor="booking-start">
                Начало
              </label>
              <input
                id="booking-start"
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
              <label className="mb-1 block text-sm font-semibold text-primary" htmlFor="booking-end">
                Окончание
              </label>
              <input
                id="booking-end"
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

        {/* Participants for meeting rooms */}
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
                  className="max-h-40 overflow-y-auto rounded-lg border border-default bg-surface divide-y divide-[color:var(--border)]"
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
                                : 'border-default text-transparent',
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
          <label className="mb-1 block text-sm font-semibold text-primary" htmlFor="booking-note">
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
        <p className="text-xs leading-relaxed text-secondary">
          Время отправляется с часовым поясом Asia/Almaty (+05:00). Требуется подтверждённый email (кроме superadmin).
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
