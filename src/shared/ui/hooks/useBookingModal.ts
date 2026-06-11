import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bed, Car, DoorOpen, LayoutGrid } from 'lucide-react';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  CAPSULE_ZONE_LABEL_KEYS,
  CAPSULE_ZONES,
  PARKING_TYPE_LABEL_KEYS,
  PARKING_TYPES,
  RESOURCE_TYPES,
} from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { getApiError } from '@/shared/lib/getApiError';
import type { Booking, BookingResourceListItem, ParticipantPickerUser } from '@/shared/types';

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

interface UseBookingModalOptions {
  resource: BookingResourceListItem;
  open: boolean;
  onClose: () => void;
}

export function useBookingModal({ resource, open, onClose }: UseBookingModalOptions) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const isParking = resource.type === RESOURCE_TYPES.PARKING;
  const isMeetingRoom = resource.type === RESOURCE_TYPES.MEETING_ROOM;
  const isDesk = resource.type === RESOURCE_TYPES.DESK;
  const isCapsule = resource.type === RESOURCE_TYPES.CAPSULE;

  const [selectedDate, setSelectedDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [participantIds, setParticipantIds] = useState<number[]>([]);
  const [participantMap, setParticipantMap] = useState<Record<number, ParticipantPickerUser>>({});
  const [memberSearch, setMemberSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const todayStr = dayjs().tz(TZ).format('YYYY-MM-DD');
  const maxDateDesk = maxDateStr(14);
  const maxDateParking = maxDateStr(7);
  const minDateParking = maxDateStr(1);
  const maxDate = isDesk ? maxDateDesk : isParking ? maxDateParking : undefined;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(memberSearch), 300);
    return () => clearTimeout(timer);
  }, [memberSearch]);

  const { data: membersData, isLoading: loadingParticipants } = useQuery({
    queryKey: ['participant-picker', debouncedSearch],
    enabled: isMeetingRoom && open,
    queryFn: async () => {
      const { data } = await apiClient.get<ParticipantPickerUser[]>(API.bookings.members, {
        params: debouncedSearch ? { q: debouncedSearch } : undefined,
      });
      return data;
    },
  });

  const userOptions = membersData ?? [];

  useEffect(() => {
    if (open) {
      setSelectedDate('');
      setStartTime('');
      setEndTime('');
      setDescription('');
      setParticipantIds([]);
      setParticipantMap({});
      setMemberSearch('');
      setDebouncedSearch('');
      setErrorMsg(null);
      setSuccessMsg(null);
      setShowMemberDropdown(false);
      setTimeout(() => {
        firstFocusableRef.current?.focus();
      }, 50);
    }
  }, [open, resource.id]);

  useEffect(() => {
    if (isParking && selectedDate) {
      setStartTime('00:00');
      setEndTime('23:59');
    }
  }, [isParking, selectedDate]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

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

  useEffect(() => {
    if (!showMemberDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowMemberDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMemberDropdown]);

  function validateBooking(): string | null {
    const parkingEndDate = selectedDate
      ? dayjs(selectedDate).add(1, 'day').format('YYYY-MM-DD')
      : '';
    const startDatetime = isParking ? `${selectedDate}T00:00` : `${selectedDate}T${startTime}`;
    const endDatetime = isParking ? `${parkingEndDate}T00:00` : `${selectedDate}T${endTime}`;
    const start = dayjs.tz(startDatetime, TZ);
    const end = dayjs.tz(endDatetime, TZ);

    if (!start.isValid() || !end.isValid()) return t('booking.modal.errors.timesRequired');

    const durationMin = end.diff(start, 'minute');

    if (isDesk) {
      const maxDesk = dayjs().tz(TZ).add(14, 'day');
      if (start.isAfter(maxDesk)) return t('booking.modal.errors.deskMaxDays');
    }

    if (isParking) {
      const maxParking = dayjs().tz(TZ).add(7, 'day');
      if (start.isAfter(maxParking)) return t('booking.modal.errors.parkingMaxDays');
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
      const parkingEndDate = selectedDate
        ? dayjs(selectedDate).add(1, 'day').format('YYYY-MM-DD')
        : '';
      const startDatetime = isParking ? `${selectedDate}T00:00` : `${selectedDate}T${startTime}`;
      const endDatetime = isParking ? `${parkingEndDate}T00:00` : `${selectedDate}T${endTime}`;
      const start_time = toAlmatyIso(startDatetime);
      const end_time = toAlmatyIso(endDatetime);

      if (!start_time || !end_time) throw new Error(t('booking.modal.errors.timesRequired'));

      const { data } = await apiClient.post<Booking>(API.bookings.reservations.create, {
        resource_id: resource.id,
        start_time,
        end_time,
        description: description.trim(),
        participant_ids: isMeetingRoom ? participantIds : [],
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-resources'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking-resource-schedule', resource.id], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['resource-week-schedule', resource.id], refetchType: 'all' });
      setSuccessMsg(t('booking.modal.success'));
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

  const toggleParticipant = (userId: number, participantUser?: ParticipantPickerUser) => {
    setParticipantIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
    setParticipantMap((prev) => {
      if (prev[userId]) {
        const next = { ...prev };
        delete next[userId];
        return next;
      }
      return participantUser ? { ...prev, [userId]: participantUser } : prev;
    });
  };

  const floorZoneInfo = [
    t('common.floor', { floor: resource.floor }),
    resource.zone || null,
    resource.parking_type
      ? t(PARKING_TYPE_LABEL_KEYS[resource.parking_type === PARKING_TYPES.VIP ? PARKING_TYPES.VIP : PARKING_TYPES.REGULAR])
      : null,
    resource.capsule_zone
      ? t(CAPSULE_ZONE_LABEL_KEYS[resource.capsule_zone === CAPSULE_ZONES.QUIET ? CAPSULE_ZONES.QUIET : CAPSULE_ZONES.REGULAR])
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const subLineHint = isParking
    ? `${t('common.resourceType.parking')} · ${t('booking.modal.parkingFullDay')}`
    : isDesk
      ? `${t('common.resourceType.desk')} · ${t('booking.modal.deskMaxHint')}`
      : isCapsule
        ? `${t('common.resourceType.capsule')} · ${t('booking.modal.capsuleHint')}`
        : `${t('common.resourceType.meeting_room')} · ${t('booking.modal.meetingHint')}`;

  const ResourceIcon = isParking ? Car : isDesk ? LayoutGrid : isCapsule ? Bed : DoorOpen;

  const dateHint = isParking
    ? t('booking.modal.parkingFullDay')
    : isDesk
      ? t('booking.modal.deskMaxHint')
      : isCapsule
        ? t('booking.modal.capsuleHint')
        : t('booking.modal.meetingHint');

  return {
    overlayRef,
    firstFocusableRef,
    dropdownRef,
    isParking,
    isMeetingRoom,
    isDesk,
    isCapsule,
    todayStr,
    maxDate,
    maxDateParking,
    minDateParking,
    floorZoneInfo,
    subLineHint,
    ResourceIcon,
    dateHint,
    selectedDate,
    setSelectedDate,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    description,
    setDescription,
    participantIds,
    participantMap,
    memberSearch,
    setMemberSearch,
    errorMsg,
    successMsg,
    showMemberDropdown,
    setShowMemberDropdown,
    userOptions,
    loadingParticipants,
    user,
    handleOverlayClick,
    handleSubmit,
    toggleParticipant,
    isPending: createMutation.isPending,
  };
}
