import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dateLocaleTag } from '@/shared/lib/localeFormat';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { RESOURCE_TYPE_LABEL_KEYS, RESOURCE_TYPES, USER_ROLES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { getApiError } from '@/shared/lib/getApiError';
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


export default function BookingCreatePage() {
  const { t, i18n } = useTranslation();
  const dateLocale = dateLocaleTag(i18n.language);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const resourceParam = searchParams.get('resource');
  const resourceId = resourceParam ? Number(resourceParam) : NaN;
  const validResourceId = Number.isFinite(resourceId) ? String(resourceId) : null;

  const todayStr = dayjs().tz(TZ).format('YYYY-MM-DD');
  const minDateParking = dayjs().tz(TZ).add(1, 'day').format('YYYY-MM-DD');

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

  const maxDate = resource?.advance_booking_days
    ? maxDateStr(resource.advance_booking_days)
    : undefined;

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
    const parkingEndDate = selectedDate ? dayjs(selectedDate).add(1, 'day').format('YYYY-MM-DD') : '';
    const startDatetime = isParking ? `${selectedDate}T00:00` : startLocal;
    const endDatetime = isParking ? `${parkingEndDate}T00:00` : endLocal;
    const start = dayjs.tz(startDatetime, TZ);
    const end = dayjs.tz(endDatetime, TZ);

    if (!start.isValid() || !end.isValid()) return t('booking.modal.errors.timesRequired');

    const durationMin = end.diff(start, 'minute');

    if (resource?.advance_booking_days) {
      const maxAllowed = dayjs().tz(TZ).add(resource.advance_booking_days, 'day');
      if (start.isAfter(maxAllowed)) {
        return t('booking.create.advanceBookingError', { days: resource.advance_booking_days });
      }
    }

    if (isMeetingRoom) {
      if (durationMin < 30) return t('booking.modal.errors.min30');
      if (durationMin > 240) return t('booking.modal.errors.max240');
    }

    if (isCapsule) {
      if (durationMin < 60) return t('booking.modal.errors.min60');
      if (durationMin > 480) return t('booking.modal.errors.max480');
    }

    return null;
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!validResourceId) throw new Error(t('booking.create.noResource'));

      const parkingEndDate = selectedDate ? dayjs(selectedDate).add(1, 'day').format('YYYY-MM-DD') : '';
      const startDatetime = isParking ? `${selectedDate}T00:00` : startLocal;
      const endDatetime = isParking ? `${parkingEndDate}T00:00` : endLocal;
      const start_time = toAlmatyIso(startDatetime);
      const end_time = toAlmatyIso(endDatetime);

      if (!start_time || !end_time) throw new Error(t('booking.create.noStartEnd'));

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
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      navigate(`/bookings/${booking.id}`);
    },
    onError: (e) => {
      setErrorMsg(getApiError(e).message);
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
      <div className="space-y-4 text-zinc-100">
        <h1 className="text-xl font-bold text-primary">{t('booking.create.title')}</h1>
        <p className="text-sm text-zinc-400">
          {t('booking.create.selectResourceHint')}{' '}
          <Link to="/bookings/catalog" className="text-blue-400 hover:text-blue-300 underline-offset-2 hover:underline">
            {t('booking.create.catalogLink')}
          </Link>
          .
        </p>
      </div>
    );
  }

  if (loadingResource) {
    return (
      <div className="text-zinc-300">
        <p className="text-sm">{t('booking.create.loadingResource')}</p>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="space-y-4 text-zinc-100">
        <p className="text-sm text-red-400">{t('booking.create.resourceNotFound')}</p>
        <Link
          to="/bookings/catalog"
          className="text-sm text-blue-400 hover:text-blue-300 underline-offset-2 hover:underline"
        >{t('common.goToCatalog')}</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-zinc-100">
      <Link
        to="/bookings/catalog"
        className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('booking.create.catalogBack')}
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
            {t(RESOURCE_TYPE_LABEL_KEYS[resource.type])} · {t('booking.create.floorLabel', { floor: resource.floor })}
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
            <label className="mb-1 block text-sm font-semibold text-primary" htmlFor="booking-date">{t('booking.modal.bookingDate')}</label>
            <input
              id="booking-date"
              type="date"
              required
              min={minDateParking}
              max={maxDate}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              lang={dateLocale}
              className={fieldClass}
            />
            <p className="mt-1 text-xs text-muted">{t('booking.modal.parkingFullDay')}</p>
          </div>
        ) : (
          <>
            {resource.advance_booking_days && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {t('booking.create.advanceBookingHint', { days: resource.advance_booking_days })}
              </p>
            )}
            {isCapsule && (
              <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">{t('booking.modal.capsuleHint')}</p>
            )}
            {isMeetingRoom && (
              <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">{t('booking.modal.meetingHint')}</p>
            )}

            <div>
              <label className="mb-1 block text-sm font-semibold text-primary" htmlFor="booking-start">{t('common.start')}</label>
              <input
                id="booking-start"
                type="datetime-local"
                required
                min={minStep}
                max={maxDate ? `${maxDate}T23:59` : undefined}
                value={startLocal}
                onChange={(e) => setStartLocal(e.target.value)}
                lang={dateLocale}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-primary" htmlFor="booking-end">{t('common.end')}</label>
              <input
                id="booking-end"
                type="datetime-local"
                required
                min={startLocal || minStep}
                max={maxDate ? `${maxDate}T23:59` : undefined}
                value={endLocal}
                onChange={(e) => setEndLocal(e.target.value)}
                lang={dateLocale}
                className={fieldClass}
              />
            </div>
          </>
        )}

        {/* Participants for meeting rooms */}
        {isMeetingRoom && (
          <div>
            <p className="mb-2 text-sm font-semibold text-primary">
              {t('booking.create.participants')}{' '}
              <span className="font-normal text-muted">{t('common.optional')}</span>
            </p>

            {loadingMembers ? (
              <p className="text-sm text-muted">{t('booking.modal.loadingParticipants')}</p>
            ) : userOptions.filter((u) => u.id !== user?.id).length === 0 ? (
              <p className="text-sm text-secondary">{t('booking.modal.noParticipants')}</p>
            ) : (
              <>
                <div
                  className="max-h-40 overflow-y-auto rounded-lg border border-default bg-surface divide-y divide-[color:var(--border)]"
                  role="listbox"
                  aria-multiselectable="true"
                  aria-label={t('booking.modal.selectParticipants')}
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
                    {t('booking.create.selectedCount', { count: participantIds.length })}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-semibold text-primary" htmlFor="booking-note">{t('common.comment')}</label>
          <textarea
            id="booking-note"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={fieldClass}
            placeholder={t('common.optionalShort')}
          />
        </div>
        <p className="text-xs leading-relaxed text-secondary">
          {t('booking.create.timezoneHint')}
        </p>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {createMutation.isPending ? t('common.submitting') : t('catalog.book')}
        </button>
      </form>
    </div>
  );
}
