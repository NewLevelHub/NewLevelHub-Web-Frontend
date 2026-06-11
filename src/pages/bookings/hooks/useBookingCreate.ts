import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { RESOURCE_TYPES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { getApiError } from '@/shared/lib/getApiError';
import type { Booking, BookingResourceDetail, ParticipantPickerUser } from '@/shared/types';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'Asia/Almaty';

function toAlmatyIso(localDatetime: string): string {
  if (!localDatetime) return '';
  const d = dayjs.tz(localDatetime, TZ);
  if (!d.isValid()) return '';
  return d.format();
}

function maxDateStr(days: number): string {
  return dayjs().tz(TZ).add(days, 'day').format('YYYY-MM-DD');
}

export function useBookingCreate() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const resourceParam = searchParams.get('resource');
  const resourceId = resourceParam ? Number(resourceParam) : NaN;
  const validResourceId = Number.isFinite(resourceId) ? String(resourceId) : null;

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
  const isCapsule = resource?.type === RESOURCE_TYPES.CAPSULE;

  const maxDate = resource?.advance_booking_days
    ? maxDateStr(resource.advance_booking_days)
    : undefined;

  const minStep = useMemo(() => dayjs().tz(TZ).format('YYYY-MM-DDTHH:mm'), []);

  const [memberSearch, setMemberSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(memberSearch), 300);
    return () => clearTimeout(timer);
  }, [memberSearch]);

  const { data: membersData, isLoading: loadingMembers } = useQuery({
    queryKey: ['participant-picker', debouncedSearch],
    enabled: isMeetingRoom,
    queryFn: async () => {
      const { data } = await apiClient.get<ParticipantPickerUser[]>(API.bookings.members, {
        params: debouncedSearch ? { q: debouncedSearch } : undefined,
      });
      return data;
    },
  });

  const userOptions = (membersData ?? []).filter((u) => u.id !== user?.id);

  function validateBooking(): string | null {
    const parkingEndDate = selectedDate
      ? dayjs(selectedDate).add(1, 'day').format('YYYY-MM-DD')
      : '';
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

      const parkingEndDate = selectedDate
        ? dayjs(selectedDate).add(1, 'day').format('YYYY-MM-DD')
        : '';
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const validationError = validateBooking();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }
    createMutation.mutate();
  };

  return {
    validResourceId,
    resource,
    loadingResource,
    isParking,
    isMeetingRoom,
    isCapsule,
    maxDate,
    minStep,
    minDateParking,
    selectedDate,
    setSelectedDate,
    startLocal,
    setStartLocal,
    endLocal,
    setEndLocal,
    description,
    setDescription,
    participantIds,
    errorMsg,
    memberSearch,
    setMemberSearch,
    loadingMembers,
    userOptions,
    toggleParticipant,
    handleSubmit,
    isPending: createMutation.isPending,
  };
}
