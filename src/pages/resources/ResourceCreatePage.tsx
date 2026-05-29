import { useTranslation } from 'react-i18next';
import { dateLocaleTag } from '@/shared/lib/localeFormat';
import { useNavigate } from 'react-router';
import { Plus } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { RESOURCE_TYPES } from '@/shared/config/constants';
import type { ResourceType } from '@/shared/config/constants';
import { RESOURCE_TYPE_LABEL_KEYS } from '@/shared/config/constants';
import { inputCls, textareaCls } from '@/pages/resources/utils';
import { useResourceCreate } from '@/pages/resources/hooks/useResourceCreate';
import {
  DeskFields,
  MeetingRoomFields,
  ParkingFields,
  CapsuleFields,
} from '@/pages/resources/components/ResourceTypeFields';
import { PhotoUploadCreate } from '@/pages/resources/components/PhotoUpload';
import type { CapsuleZone, ParkingType, ResourceEquipmentKey } from '@/shared/config/constants';

export default function ResourceCreatePage() {
  const { t, i18n } = useTranslation();
  const dateLocale = dateLocaleTag(i18n.language);
  const navigate = useNavigate();

  const {
    isBulkMode,
    setIsBulkMode,
    form,
    updateForm,
    bulk,
    setBulk,
    isDesk,
    isParking,
    isCapsule,
    requiresCapacity,
    availabilityRangeInvalid,
    generalError,
    fieldErrors,
    clearError,
    photoFiles,
    primaryPhotoIndex,
    setPrimaryPhotoIndex,
    addPhotos,
    removePhoto,
    companies,
    floors,
    floorsLoading,
    dayOptions,
    toggleDay,
    toggleEquipment,
    handleSubmit,
    isPending,
  } = useResourceCreate();

  function inputClass(hasError: boolean) {
    return cn(inputCls, hasError && 'border-red-400 focus:ring-red-500/20');
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => navigate('/resources')}
          className="text-sm font-medium text-muted transition-colors hover:text-primary"
        >
          {t('resources.create.backToResources')}
        </button>
        <h1 className="text-xl font-semibold text-primary">{t('resources.create.pageTitle')}</h1>
        <p className="text-sm text-muted">{t('resources.create.pageSubtitle')}</p>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-default bg-surface shadow-xl overflow-hidden">
        {/* Card header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[color:var(--border-faint)]">
          <div>
            <h2 className="text-base font-semibold text-primary tracking-[-0.015em]">
              {t('resources.create.pageTitle')}
            </h2>
            <p className="text-xs text-muted mt-0.5">{t('resources.create.pageSubtitle')}</p>
          </div>
          {/* Mode toggle */}
          <div className="rounded-lg border border-default bg-raised p-0.5 inline-flex shrink-0">
            <button
              type="button"
              onClick={() => setIsBulkMode(false)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                !isBulkMode ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-secondary',
              )}
            >
              {t('resources.create.singleMode')}
            </button>
            <button
              type="button"
              onClick={() => setIsBulkMode(true)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                isBulkMode ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-secondary',
              )}
            >
              {t('resources.create.bulkMode')}
            </button>
          </div>
        </div>

        {/* Form body + footer */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="px-6 py-5 space-y-4">
            {/* Global error banner */}
            {generalError && (
              <div className="rounded-[var(--radius-sm)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {generalError}
              </div>
            )}

            {/* Row: type + floor */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="type" className="text-xs font-medium text-secondary">
                  {t('resources.create.resourceTypeLabel')}
                </label>
                <select
                  id="type"
                  value={form.type}
                  onChange={(e) => updateForm('type', e.target.value as ResourceType)}
                  className={inputClass(!!fieldErrors.type)}
                >
                  {Object.values(RESOURCE_TYPES).map((rt) => (
                    <option key={rt} value={rt}>
                      {t(RESOURCE_TYPE_LABEL_KEYS[rt])}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="floor" className="text-xs font-medium text-secondary">
                  {t('resources.create.floorLabel')}
                </label>
                <select
                  id="floor"
                  value={form.floor}
                  disabled={floorsLoading}
                  onChange={(e) => updateForm('floor', e.target.value)}
                  className={inputClass(!!fieldErrors.floor)}
                >
                  <option value="">{t('resources.create.floorSelectDefault')}</option>
                  {floors.map((f) => (
                    <option key={f.id} value={String(f.number)}>
                      {f.name
                        ? t('resources.create.floorOptionWithName', { number: f.number, name: f.name })
                        : t('resources.create.floorOptionNoName', { number: f.number })}
                    </option>
                  ))}
                </select>
                {fieldErrors.floor && (
                  <p className="text-xs text-red-600 mt-0.5">{fieldErrors.floor}</p>
                )}
              </div>
            </div>

            {/* Single mode: resource name */}
            {!isBulkMode && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-xs font-medium text-secondary">
                  {t('resources.create.resourceNameLabel')}
                </label>
                <input
                  id="name"
                  type="text"
                  value={form.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  placeholder={t('resources.create.namePlaceholder')}
                  className={inputClass(!!fieldErrors.name)}
                />
                {fieldErrors.name && (
                  <p className="text-xs text-red-600 mt-0.5">{fieldErrors.name}</p>
                )}
              </div>
            )}

            {/* Bulk mode: prefix + count */}
            {isBulkMode && (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="name_prefix" className="text-xs font-medium text-secondary">
                    {t('resources.create.namePrefixLabel')}
                  </label>
                  <input
                    id="name_prefix"
                    type="text"
                    value={bulk.name_prefix}
                    onChange={(e) => {
                      setBulk((prev) => ({ ...prev, name_prefix: e.target.value }));
                      clearError('name_prefix');
                    }}
                    placeholder={t('resources.create.prefixPlaceholder')}
                    className={inputClass(!!fieldErrors.name_prefix)}
                  />
                  {fieldErrors.name_prefix && (
                    <p className="text-xs text-red-600 mt-0.5">{fieldErrors.name_prefix}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="count" className="text-xs font-medium text-secondary">
                    {t('resources.create.countLabel')}
                  </label>
                  <input
                    id="count"
                    type="number"
                    min={1}
                    value={bulk.count}
                    onChange={(e) => {
                      setBulk((prev) => ({ ...prev, count: e.target.value }));
                      clearError('count');
                    }}
                    className={inputClass(!!fieldErrors.count)}
                  />
                  {fieldErrors.count && (
                    <p className="text-xs text-red-600 mt-0.5">{fieldErrors.count}</p>
                  )}
                </div>
              </div>
            )}

            {/* Row: zone + capacity */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="zone" className="text-xs font-medium text-secondary">
                  {t('resources.create.zoneLabel')}
                </label>
                <input
                  id="zone"
                  type="text"
                  value={form.zone}
                  onChange={(e) => updateForm('zone', e.target.value)}
                  placeholder="North"
                  className={inputClass(!!fieldErrors.zone)}
                />
              </div>
              {requiresCapacity && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="capacity" className="text-xs font-medium text-secondary">
                    {t('resources.create.capacityLabel')}
                  </label>
                  <input
                    id="capacity"
                    type="number"
                    min={1}
                    value={form.capacity}
                    onChange={(e) => updateForm('capacity', e.target.value)}
                    className={inputClass(!!fieldErrors.capacity)}
                  />
                  {fieldErrors.capacity && (
                    <p className="text-xs text-red-600 mt-0.5">{fieldErrors.capacity}</p>
                  )}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="description" className="text-xs font-medium text-secondary">
                {t('resources.create.descriptionLabel')}
              </label>
              <textarea
                id="description"
                rows={3}
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                placeholder={t('resources.create.descriptionPlaceholder')}
                className={textareaCls}
              />
            </div>

            {/* Photo upload (single mode only) */}
            {!isBulkMode && (
              <PhotoUploadCreate
                photoFiles={photoFiles}
                primaryPhotoIndex={primaryPhotoIndex}
                onAddPhotos={addPhotos}
                onRemovePhoto={removePhoto}
                onSetPrimary={setPrimaryPhotoIndex}
              />
            )}

            {/* is_active checkbox */}
            <label className="inline-flex items-center gap-2 text-xs text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => updateForm('is_active', e.target.checked)}
                className="h-3.5 w-3.5 rounded border-default text-[color:var(--brand)]"
              />
              {t('resources.create.activeInCatalog')}
            </label>

            {/* Type-specific fieldsets */}
            {isDesk && (
              <DeskFields
                hasMonitor={form.has_monitor}
                hasDock={form.has_dock}
                hasPowerOutlet={form.has_power_outlet}
                isHotDesk={form.is_hot_desk}
                assignedCompanyId={form.assigned_company_id}
                companies={companies}
                fieldErrors={fieldErrors}
                onMonitorChange={(v) => updateForm('has_monitor', v)}
                onDockChange={(v) => updateForm('has_dock', v)}
                onPowerOutletChange={(v) => updateForm('has_power_outlet', v)}
                onHotDeskChange={(v) => updateForm('is_hot_desk', v)}
                onAssignedCompanyChange={(v) => updateForm('assigned_company_id', v)}
              />
            )}

            {requiresCapacity && (
              <MeetingRoomFields
                equipment={form.equipment}
                minDurationMinutes={form.min_duration_minutes}
                maxDurationMinutes={form.max_duration_minutes}
                assignedCompanyId={form.assigned_company_id}
                companies={companies}
                fieldErrors={fieldErrors}
                onEquipmentToggle={(key: ResourceEquipmentKey) => toggleEquipment(key)}
                onMinDurationChange={(v) => updateForm('min_duration_minutes', v)}
                onMaxDurationChange={(v) => updateForm('max_duration_minutes', v)}
                onAssignedCompanyChange={(v) => updateForm('assigned_company_id', v)}
              />
            )}

            {isParking && (
              <ParkingFields
                parkingType={form.parking_type}
                assignedCompanyId={form.assigned_company_id}
                companies={companies}
                fieldErrors={fieldErrors}
                onParkingTypeChange={(v: ParkingType) => updateForm('parking_type', v)}
                onAssignedCompanyChange={(v) => updateForm('assigned_company_id', v)}
              />
            )}

            {isCapsule && (
              <CapsuleFields
                capsuleZone={form.capsule_zone}
                assignedCompanyId={form.assigned_company_id}
                companies={companies}
                fieldErrors={fieldErrors}
                onCapsuleZoneChange={(v: CapsuleZone) => updateForm('capsule_zone', v)}
                onAssignedCompanyChange={(v) => updateForm('assigned_company_id', v)}
              />
            )}

            {/* Booking policy sub-card */}
            <div className="rounded-xl border border-[color:var(--border-faint)] bg-raised px-4 py-3 space-y-3">
              <p className="text-xs font-semibold text-secondary mb-2">
                {t('resources.create.bookingPolicyLabel')}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="advance_booking_days" className="text-xs font-medium text-secondary">
                    {t('resources.create.advanceDaysLabel')}
                  </label>
                  <input
                    type="number"
                    id="advance_booking_days"
                    min={1}
                    placeholder="14"
                    value={form.advance_booking_days}
                    onChange={(e) => updateForm('advance_booking_days', e.target.value)}
                    className={inputClass(false)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="min_cancel_minutes" className="text-xs font-medium text-secondary">
                    {t('resources.create.minCancelLabel')}
                  </label>
                  <input
                    type="number"
                    id="min_cancel_minutes"
                    min={1}
                    placeholder="30"
                    value={form.min_cancel_minutes}
                    onChange={(e) => updateForm('min_cancel_minutes', e.target.value)}
                    className={inputClass(false)}
                  />
                </div>
              </div>
            </div>

            {/* Availability section */}
            <div className="rounded-xl border border-[color:var(--border-faint)] bg-raised px-4 py-3 space-y-3">
              <p className="text-xs font-semibold text-secondary mb-2">
                {t('resources.create.availabilitySection')}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="availability_start" className="text-xs font-medium text-secondary">
                    {t('common.start')}
                  </label>
                  <input
                    id="availability_start"
                    type="time"
                    value={form.availability_start}
                    onChange={(e) => updateForm('availability_start', e.target.value)}
                    lang={dateLocale}
                    className={inputClass(!!fieldErrors.availability_start || availabilityRangeInvalid)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="availability_end" className="text-xs font-medium text-secondary">
                    {t('resources.create.endLabel')}
                  </label>
                  <input
                    id="availability_end"
                    type="time"
                    value={form.availability_end}
                    onChange={(e) => updateForm('availability_end', e.target.value)}
                    lang={dateLocale}
                    className={inputClass(!!fieldErrors.availability_end || availabilityRangeInvalid)}
                  />
                </div>
              </div>
              {(fieldErrors.availability_start || availabilityRangeInvalid) && (
                <p className="text-xs text-red-600 mt-0.5">
                  {fieldErrors.availability_start || t('resources.create.availabilityOrder')}
                </p>
              )}

              <div>
                <p className="text-xs font-medium text-secondary mb-2">
                  {t('resources.create.availabilityDaysLabel')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {dayOptions.map((day) => {
                    const active = form.availability_days.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDay(day.value)}
                        className={cn(
                          'h-7 px-2.5 text-xs font-medium rounded-[var(--radius-sm)] border transition-colors',
                          active
                            ? 'border-[color:var(--brand)] bg-[color:var(--brand-subtle)] text-[color:var(--brand-text)]'
                            : 'border-default text-secondary hover:bg-raised',
                        )}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
                {fieldErrors.availability_days && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.availability_days}</p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-[color:var(--border-faint)] px-6 pt-4 pb-5 mt-0">
            <button
              type="button"
              onClick={() => navigate('/resources')}
              className="h-8 px-4 text-sm font-medium text-secondary hover:bg-raised rounded-[var(--radius-sm)] transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={cn(
                'inline-flex items-center gap-1.5 h-8 px-4 text-sm font-medium rounded-[var(--radius-sm)] transition-colors',
                'text-[color:var(--text-onbrand)] bg-[color:var(--brand)] hover:bg-[color:var(--brand-hover)]',
                'disabled:opacity-60 disabled:cursor-not-allowed',
              )}
            >
              <Plus size={14} />
              {isPending
                ? t('common.savingPlain')
                : isBulkMode
                  ? t('resources.create.submitBulk')
                  : t('resources.create.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
