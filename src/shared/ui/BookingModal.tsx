import { useTranslation } from 'react-i18next';
import { dateLocaleTag } from '@/shared/lib/localeFormat';
import { Calendar, Clock, Plus, X } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import type { BookingResourceListItem, ParticipantPickerUser } from '@/shared/types';
import { useBookingModal } from './hooks/useBookingModal';

interface BookingModalProps {
  resource: BookingResourceListItem;
  open: boolean;
  onClose: () => void;
}

export function BookingModal({ resource, open, onClose }: BookingModalProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = dateLocaleTag(i18n.language);

  const {
    overlayRef,
    firstFocusableRef,
    dropdownRef,
    isParking,
    isMeetingRoom,
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
    isPending,
  } = useBookingModal({ resource, open, onClose });

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
      <div className="relative w-full max-w-[560px] rounded-2xl border border-default bg-surface shadow-xl overflow-y-auto max-h-[90vh]">
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

          {/* Date / time grid */}
          {isParking ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-xs font-medium text-secondary"
                  htmlFor="modal-booking-date"
                >
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
                  <label
                    className="text-xs font-medium text-secondary"
                    htmlFor="modal-booking-date"
                  >
                    {t('booking.modal.date')}
                  </label>
                  <div className="relative flex items-center">
                    <Calendar
                      size={13}
                      className="absolute left-3 text-muted pointer-events-none"
                    />
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
                  <label
                    className="text-xs font-medium text-secondary"
                    htmlFor="modal-booking-start"
                  >
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
                  <label
                    className="text-xs font-medium text-secondary"
                    htmlFor="modal-booking-end"
                  >
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
              <p className="text-xs font-medium text-secondary">
                {t('booking.modal.participants')}
                <span className="font-normal text-muted">
                  {' '}· {participantIds.length} {t('booking.modal.participantsOf')}{' '}
                  {userOptions.filter((u) => u.id !== user?.id).length}
                </span>
              </p>
              <div className="flex flex-wrap gap-1.5 min-h-9 p-1.5 border border-default rounded-[var(--radius-sm)] bg-surface">
                {participantIds.map((id) => {
                  const member = participantMap[id];
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
                    <div className="absolute left-0 top-full mt-1 z-10 w-60 rounded-[var(--radius-sm)] border border-default bg-surface shadow-lg">
                      <div className="p-1.5 border-b border-default">
                        <input
                          type="text"
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                          placeholder={t('booking.modal.searchParticipants')}
                          className="w-full px-2 py-1 text-xs border border-default rounded bg-surface text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-[color:var(--brand)]"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-44 overflow-y-auto">
                        {loadingParticipants ? (
                          <p className="px-3 py-2 text-xs text-muted">
                            {t('booking.modal.loadingParticipants')}
                          </p>
                        ) : userOptions.filter(
                              (u) => u.id !== user?.id && !participantIds.includes(u.id),
                            ).length === 0 ? (
                          <p className="px-3 py-2 text-xs text-muted">
                            {t('booking.modal.noParticipants')}
                          </p>
                        ) : (
                          userOptions
                            .filter((u) => u.id !== user?.id && !participantIds.includes(u.id))
                            .map((u: ParticipantPickerUser) => (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => {
                                  toggleParticipant(u.id, u);
                                  setShowMemberDropdown(false);
                                  setMemberSearch('');
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-raised text-left"
                              >
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-raised text-[9px] font-semibold">
                                  {(u.full_name || u.email).slice(0, 2).toUpperCase()}
                                </span>
                                <div className="flex flex-col min-w-0">
                                  <span className="truncate text-xs font-medium">
                                    {u.full_name || u.email}
                                  </span>
                                  {u.full_name && (
                                    <span className="truncate text-[10px] text-muted">
                                      {u.email}
                                    </span>
                                  )}
                                </div>
                              </button>
                            ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Comment field */}
          <div className="flex flex-col gap-1.5">
            <label
              className="text-xs font-medium text-secondary"
              htmlFor="modal-booking-desc"
            >
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
            disabled={isPending || successMsg !== null}
            className={cn(
              'inline-flex items-center gap-1.5 h-8 px-4 text-sm font-medium rounded-[var(--radius-sm)]',
              'text-white bg-[color:var(--brand)] hover:opacity-90 transition-opacity',
              'disabled:opacity-60 disabled:cursor-not-allowed',
            )}
          >
            <Calendar size={14} />
            {isPending ? t('common.submitting') : t('catalog.book')}
          </button>
        </div>
      </div>
    </div>
  );
}
