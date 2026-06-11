import { useTranslation } from 'react-i18next';
import { dateLocaleTag } from '@/shared/lib/localeFormat';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';

import { RESOURCE_TYPE_LABEL_KEYS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { resolveMediaUrl } from '@/shared/lib/mediaUrl';
import { useBookingCreate } from './hooks/useBookingCreate';

const fieldClass =
  'w-full px-3 py-2 text-sm rounded-lg border border-gray-400 bg-surface text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function BookingCreatePage() {
  const { t, i18n } = useTranslation();
  const dateLocale = dateLocaleTag(i18n.language);
  const {
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
    isPending,
  } = useBookingCreate();

  if (validResourceId === null) {
    return (
      <div className="space-y-4 text-zinc-100">
        <h1 className="text-xl font-bold text-primary">{t('booking.create.title')}</h1>
        <p className="text-sm text-zinc-400">
          {t('booking.create.selectResourceHint')}{' '}
          <Link
            to="/bookings/catalog"
            className="text-blue-400 hover:text-blue-300 underline-offset-2 hover:underline"
          >
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
        >
          {t('common.goToCatalog')}
        </Link>
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
            {t(RESOURCE_TYPE_LABEL_KEYS[resource.type])} ·{' '}
            {t('booking.create.floorLabel', { floor: resource.floor })}
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
        onSubmit={handleSubmit}
      >
        {isParking ? (
          <div>
            <label
              className="mb-1 block text-sm font-semibold text-primary"
              htmlFor="booking-date"
            >
              {t('booking.modal.bookingDate')}
            </label>
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
              <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                {t('booking.modal.capsuleHint')}
              </p>
            )}
            {isMeetingRoom && (
              <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                {t('booking.modal.meetingHint')}
              </p>
            )}

            <div>
              <label
                className="mb-1 block text-sm font-semibold text-primary"
                htmlFor="booking-start"
              >
                {t('common.start')}
              </label>
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
              <label
                className="mb-1 block text-sm font-semibold text-primary"
                htmlFor="booking-end"
              >
                {t('common.end')}
              </label>
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

        {isMeetingRoom && (
          <div>
            <p className="mb-2 text-sm font-semibold text-primary">
              {t('booking.create.participants')}{' '}
              <span className="font-normal text-muted">{t('common.optional')}</span>
            </p>

            <input
              type="text"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder={t('booking.modal.searchParticipants')}
              className="mb-2 w-full px-3 py-2 text-sm border border-default rounded-lg bg-surface text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
            />

            {loadingMembers ? (
              <p className="text-sm text-muted">{t('booking.modal.loadingParticipants')}</p>
            ) : userOptions.length === 0 ? (
              <p className="text-sm text-secondary">{t('booking.modal.noParticipants')}</p>
            ) : (
              <>
                <div
                  className="max-h-40 overflow-y-auto rounded-lg border border-default bg-surface divide-y divide-[color:var(--border)]"
                  role="listbox"
                  aria-multiselectable="true"
                  aria-label={t('booking.modal.selectParticipants')}
                >
                  {userOptions.map((u) => {
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
          <label
            className="mb-1 block text-sm font-semibold text-primary"
            htmlFor="booking-note"
          >
            {t('common.comment')}
          </label>
          <textarea
            id="booking-note"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={fieldClass}
            placeholder={t('common.optionalShort')}
          />
        </div>
        <p className="text-xs leading-relaxed text-secondary">{t('booking.create.timezoneHint')}</p>
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? t('common.submitting') : t('catalog.book')}
        </button>
      </form>
    </div>
  );
}
