import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dateLocaleTag } from '@/shared/lib/localeFormat';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bed, Calendar, Car, Clock, DoorOpen, LayoutGrid, Plus, X } from 'lucide-react';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  CAPSULE_ZONE_LABEL_KEYS,
  PARKING_TYPE_LABEL_KEYS,
  PARKING_TYPES,
  CAPSULE_ZONES,
  RESOURCE_TYPES,
  USER_ROLES,
} from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { getApiError } from '@/shared/lib/getApiError';
import { cn } from '@/shared/lib/cn';
import type { Booking, BookingResourceListItem, Company, CompanyMember, PaginatedResponse } from '@/shared/types';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'Asia/Almaty';

/** Format a combined date+time string with Asia/Almaty offset */
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
  const { t, i18n } = useTranslation();
  const dateLocale = dateLocaleTag(i18n.language);
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
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const todayStr = dayjs().tz(TZ).format('YYYY-MM-DD');
  const maxDateDesk = maxDateStr(14);
  const maxDateParking = maxDateStr(7);
  // Parking starts at midnight — which is always "in the past" for today,
  // so the backend rejects same-day bookings. Earliest valid date is tomorrow.
  const minDateParking = maxDateStr(1);
  const maxDate = isDesk ? maxDateDesk : isParking ? maxDateParking : undefined;

  // Fetch company members for participant multi-select (only for meeting rooms)
  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;
  const companyId = user?.company_id ? String(user.company_id) : null;
  const effectiveCompanyId = isSuperadmin ? selectedCompanyId : companyId;

  const { data: companiesData } = useQuery({
    queryKey: ['companies-for-booking'],
    enabled: isMeetingRoom && open && isSuperadmin,
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Company>>(
        API.companies.list,
        { params: { page_size: 200 } },
      );
      return data.results;
    },
  });

  const { data: membersData, isLoading: loadingParticipants } = useQuery({
    queryKey: ['company-members-for-booking', effectiveCompanyId],
    enabled: isMeetingRoom && open && effectiveCompanyId !== null,
    queryFn: async () => {
      const { data } = await apiClient.get<CompanyMember[] | { results: CompanyMember[] }>(
        API.companies.members(effectiveCompanyId!),
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
      setStartTime('');
      setEndTime('');
      setDescription('');
      setParticipantIds([]);
      setSelectedCompanyId(null);
      setErrorMsg(null);
      setSuccessMsg(null);
      setShowMemberDropdown(false);
      setTimeout(() => {
        firstFocusableRef.current?.focus();
      }, 50);
    }
  }, [open, resource.id]);

  // Clear participants when superadmin switches company
  useEffect(() => {
    setParticipantIds([]);
  }, [selectedCompanyId]);

  // Auto-set parking times when date is selected
  useEffect(() => {
    if (isParking && selectedDate) {
      setStartTime('00:00');
      setEndTime('23:59');
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

  // Close member dropdown on click outside
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

  /** Client-side validation before submit */
  function validateBooking(): string | null {
    const parkingEndDate = selectedDate ? dayjs(selectedDate).add(1, 'day').format('YYYY-MM-DD') : '';
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
      const parkingEndDate = selectedDate ? dayjs(selectedDate).add(1, 'day').format('YYYY-MM-DD') : '';
      const startDatetime = isParking ? `${selectedDate}T00:00` : `${selectedDate}T${startTime}`;
      const endDatetime = isParking ? `${parkingEndDate}T00:00` : `${selectedDate}T${endTime}`;

      const start_time = toAlmatyIso(startDatetime);
      const end_time = toAlmatyIso(endDatetime);

      if (!start_time || !end_time) throw new Error(t('booking.modal.errors.timesRequired'));

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

  const toggleParticipant = (userId: number) => {
    setParticipantIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const floorZoneInfo = [
    t('common.floor', { floor: resource.floor_number }),
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

  // Sub-line hint per resource type
  const subLineHint = isParking
    ? `${t('common.resourceType.parking')} · ${t('booking.modal.parkingFullDay')}`
    : isDesk
      ? `${t('common.resourceType.desk')} · ${t('booking.modal.deskMaxHint')}`
      : isCapsule
        ? `${t('common.resourceType.capsule')} · ${t('booking.modal.capsuleHint')}`
        : `${t('common.resourceType.meeting_room')} · ${t('booking.modal.meetingHint')}`;

  // Type-specific icon for resource pill
  const ResourceIcon = isParking
    ? Car
    : isDesk
      ? LayoutGrid
      : isCapsule
        ? Bed
        : DoorOpen;

  // Type-specific hint for date/time section
  const dateHint = isParking
    ? t('booking.modal.parkingFullDay')
    : isDesk
      ? t('booking.modal.deskMaxHint')
      : isCapsule
        ? t('booking.modal.capsuleHint')
        : t('booking.modal.meetingHint');

  if (!open) return null;

  const inputClass =
    'w-full h-9 pl-8 pr-3 text-sm border border-default rounded-[var(--radius-sm)] bg-surface focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]';

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={handleOverlayClick}
      aria-modal="true"
      role="dialog"
      aria-label={t('booking.modal.title', { name: resource.name })}
    >
      <div
        className="relative w-full max-w-[560px] rounded-2xl border border-default bg-surface shadow-xl overflow-y-auto max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-[22px] pt-[18px] pb-[14px]">
          <div className="min-w-0 pr-4">
            <h2 className="text-base font-semibold text-primary tracking-[-0.015em]">
              {t('booking.modal.newBooking')}
            </h2>
            <p className="text-xs text-muted mt-0.5">{subLineHint}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-secondary hover:bg-raised hover:text-primary focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form id="booking-modal-form" className="px-[22px] pb-0 space-y-3" onSubmit={handleSubmit}>
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

          {/* Resource pill */}
          <div className="flex items-center gap-2.5 h-10 px-2.5 rounded-[var(--radius-sm)] border border-default bg-raised">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] bg-[color:var(--brand-subtle)] text-[color:var(--brand-text)]">
              <ResourceIcon size={13} />
            </span>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[13px] font-medium text-primary truncate">{resource.name}</span>
              <span className="text-[11px] text-muted mt-0.5">{floorZoneInfo}</span>
            </div>
          </div>

          {/* Superadmin company selector */}
          {isMeetingRoom && isSuperadmin && (
            <select
              value={selectedCompanyId ?? ''}
              onChange={(e) => setSelectedCompanyId(e.target.value || null)}
              className="w-full h-9 px-3 text-sm border border-default rounded-[var(--radius-sm)] bg-surface focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
              aria-label={t('common.selectCompany')}
            >
              <option value="">{t('common.selectCompany')}</option>
              {(companiesData ?? []).map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {/* Date / time grid */}
          {isParking ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-secondary" htmlFor="modal-booking-date">
                  {t('booking.modal.date')}
                </label>
                <div className="relative flex items-center">
                  <Calendar size={13} className="absolute left-3 text-muted pointer-events-none" />
                  <input
                    ref={firstFocusableRef}
                    id="modal-booking-date"
                    type="date"
                    required
                    min={minDateParking}
                    max={maxDateParking}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    lang={dateLocale}
                    className={inputClass}
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted -mt-1">{dateHint}</p>
            </>
          ) : (
            <>
              <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-2.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-secondary" htmlFor="modal-booking-date">
                    {t('booking.modal.date')}
                  </label>
                  <div className="relative flex items-center">
                    <Calendar size={13} className="absolute left-3 text-muted pointer-events-none" />
                    <input
                      ref={firstFocusableRef}
                      id="modal-booking-date"
                      type="date"
                      required
                      min={todayStr}
                      max={maxDate}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      lang={dateLocale}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-secondary" htmlFor="modal-booking-start">
                    {t('common.start')}
                  </label>
                  <div className="relative flex items-center">
                    <Clock size={13} className="absolute left-3 text-muted pointer-events-none" />
                    <input
                      id="modal-booking-start"
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      lang={dateLocale}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-secondary" htmlFor="modal-booking-end">
                    {t('common.end')}
                  </label>
                  <div className="relative flex items-center">
                    <Clock size={13} className="absolute left-3 text-muted pointer-events-none" />
                    <input
                      id="modal-booking-end"
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      lang={dateLocale}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-muted -mt-1">{dateHint}</p>
            </>
          )}

          {/* Participants token-input (meeting room only) */}
          {isMeetingRoom && (
            <div className="flex flex-col gap-1.5">
              {isSuperadmin && !selectedCompanyId ? (
                <p className="text-sm text-secondary">{t('booking.modal.selectCompanyForParticipants')}</p>
              ) : loadingParticipants ? (
                <p className="text-sm text-muted">{t('booking.modal.loadingParticipants')}</p>
              ) : (
                <>
                  <p className="text-xs font-medium text-secondary">
                    {t('booking.modal.participants')}
                    <span className="font-normal text-muted">
                      {' '}· {participantIds.length} {t('booking.modal.participantsOf')}{' '}
                      {userOptions.filter((u) => u.id !== user?.id).length}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-1.5 min-h-9 p-1.5 border border-default rounded-[var(--radius-sm)] bg-surface">
                    {participantIds.map((id) => {
                      const member = userOptions.find((u) => u.id === id);
                      if (!member) return null;
                      const initials = (member.full_name || member.email).slice(0, 2).toUpperCase();
                      const displayName = member.full_name?.split(' ')[1]
                        ? `${member.full_name.split(' ')[0][0]}. ${member.full_name.split(' ')[1]}`
                        : member.full_name || member.email;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 bg-raised rounded-full text-xs font-medium text-primary"
                        >
                          <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-surface text-[9px] font-semibold text-secondary border border-default">
                            {initials}
                          </span>
                          <span>{displayName}</span>
                          <button
                            type="button"
                            onClick={() => toggleParticipant(id)}
                            className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-muted/30 text-[10px] text-secondary hover:bg-muted/50"
                            aria-label={`Remove ${displayName}`}
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                    {/* Add participant dropdown trigger */}
                    <div className="relative" ref={dropdownRef}>
                      <button
                        type="button"
                        onClick={() => setShowMemberDropdown((p) => !p)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-muted hover:text-secondary"
                      >
                        <Plus size={12} />
                        {t('booking.modal.addParticipant')}
                      </button>
                      {showMemberDropdown && (
                        <div className="absolute left-0 top-full mt-1 z-10 w-52 max-h-44 overflow-y-auto rounded-[var(--radius-sm)] border border-default bg-surface shadow-lg">
                          {userOptions
                            .filter((u) => u.id !== user?.id && !participantIds.includes(u.id))
                            .map((u) => (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => {
                                  toggleParticipant(u.id);
                                  setShowMemberDropdown(false);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-raised text-left"
                              >
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-raised text-[9px] font-semibold">
                                  {(u.full_name || u.email).slice(0, 2).toUpperCase()}
                                </span>
                                <span className="truncate">{u.full_name || u.email}</span>
                              </button>
                            ))}
                          {userOptions.filter((u) => u.id !== user?.id && !participantIds.includes(u.id)).length === 0 && (
                            <p className="px-3 py-2 text-xs text-muted">{t('booking.modal.noParticipants')}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Comment field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-secondary" htmlFor="modal-booking-desc">
              {t('booking.modal.comment')}{' '}
              <span className="font-normal text-muted">· {t('common.optional')}</span>
            </label>
            <textarea
              id="modal-booking-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder={t('booking.modal.descriptionPlaceholder')}
              className="w-full px-3 py-2 text-sm border border-default rounded-[var(--radius-sm)] bg-surface text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)] resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[color:var(--border-faint)] px-[22px] pt-[14px] pb-[18px] mt-3">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 text-sm font-medium text-secondary hover:bg-raised rounded-[var(--radius-sm)] transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            form="booking-modal-form"
            disabled={createMutation.isPending || successMsg !== null}
            className={cn(
              'inline-flex items-center gap-1.5 h-8 px-4 text-sm font-medium rounded-[var(--radius-sm)]',
              'text-white bg-[color:var(--brand)] hover:opacity-90 transition-opacity',
              'disabled:opacity-60 disabled:cursor-not-allowed',
            )}
          >
            <Calendar size={14} />
            {createMutation.isPending ? t('common.submitting') : t('catalog.book')}
          </button>
        </div>
      </div>
    </div>
  );
}
