import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ArrowLeft, Save } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import {
  CAPSULE_ZONES,
  PARKING_TYPES,
  RESOURCE_EQUIPMENT_KEYS,
  RESOURCE_EQUIPMENT_LABEL_KEYS,
  RESOURCE_TYPE_LABEL_KEYS,
  RESOURCE_TYPES,
  type ResourceEquipmentKey,
  type ResourceType,
} from '@/shared/config/constants';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { fmtBlockRange } from '@/pages/resources/utils';
import { inputCls, textareaCls } from '@/pages/resources/utils';
import { useResourceDetail } from '@/pages/resources/hooks/useResourceDetail';
import { ScheduleSection } from '@/pages/resources/components/ScheduleSection';
import { BlockSection } from '@/pages/resources/components/BlockSection';
import { PhotoUploadDetail } from '@/pages/resources/components/PhotoUpload';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResourceDetailPage() {
  const { t } = useTranslation();

  const {
    resourceId,
    isLoading,
    isError,
    data,
    scheduleDay,
    setScheduleDay,
    scheduleSlots,
    scheduleLoading,
    weekAnchors,
    blocks,
    blocksLoading,
    activeBlock,
    blockForm,
    blockFormError,
    updateBlockForm,
    submitBlockForm,
    blockMutationPending,
    unblockMutation,
    type,
    setType,
    name,
    setName,
    floor,
    setFloor,
    zone,
    setZone,
    description,
    setDescription,
    capacity,
    setCapacity,
    isActive,
    setIsActive,
    newPhotoFiles,
    setNewPhotoFiles,
    hasMonitor,
    setHasMonitor,
    hasDock,
    setHasDock,
    hasPowerOutlet,
    setHasPowerOutlet,
    isHotDesk,
    setIsHotDesk,
    assignedCompanyId,
    setAssignedCompanyId,
    equipment,
    toggleEquipment,
    minDuration,
    setMinDuration,
    maxDuration,
    setMaxDuration,
    advanceBookingDays,
    setAdvanceBookingDays,
    minCancelMinutes,
    setMinCancelMinutes,
    parkingType,
    setParkingType,
    capsuleZone,
    setCapsuleZone,
    companies,
    floors,
    floorsLoading,
    saveMutation,
    activateMutation,
    deactivateMutation,
    deleteMutation,
    addPhotosMutation,
    deletePhotoMutation,
    errorMsg,
    setErrorMsg,
    deleteModal,
    setDeleteModal,
    activateModal,
    setActivateModal,
    deactivateModal,
    setDeactivateModal,
  } = useResourceDetail();

  if (!Number.isFinite(resourceId)) {
    return (
      <div className="space-y-5">
        <p className="text-sm text-red-400">{t('resources.detail.invalidId')}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <p className="text-sm text-secondary">{t('common.loading')}</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-5">
        <p className="text-sm text-red-400">{t('resources.detail.notFound')}</p>
        <Link
          to="/resources"
          className="font-medium text-brand hover:text-brand-hover transition-colors underline"
        >
          {t('resources.detail.toList')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link
        to="/resources"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('resources.detail.backToList')}
      </Link>

      {/* Schedule section */}
      <ScheduleSection
        scheduleDay={scheduleDay}
        weekAnchors={weekAnchors}
        scheduleSlots={scheduleSlots}
        scheduleLoading={scheduleLoading}
        onDayChange={setScheduleDay}
      />

      {/* Block section */}
      <BlockSection
        blockForm={blockForm}
        blockFormError={blockFormError}
        blocks={blocks}
        blocksLoading={blocksLoading}
        activeBlock={activeBlock}
        blockMutationPending={blockMutationPending}
        unblockPending={unblockMutation.isPending}
        onBlockFormChange={updateBlockForm}
        onSubmitBlock={submitBlockForm}
        onUnblock={(blockId) => unblockMutation.mutate(blockId)}
      />

      {/* Edit card */}
      <div className="rounded-2xl border border-default bg-surface shadow-xl overflow-hidden">
        {/* Card header */}
        <div className="px-6 pt-5 pb-4 border-b border-[color:var(--border-faint)]">
          <h2 className="text-base font-semibold text-primary tracking-[-0.015em]">{data.name}</h2>
          <p className="text-xs text-muted mt-0.5">
            {t(RESOURCE_TYPE_LABEL_KEYS[data.type])} · {t('resources.detail.floorLabel', { floor: data.floor_number })}
          </p>
          {activeBlock && (
            <p className="mt-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full inline-block px-2.5 py-0.5">
              {t('resources.detail.activeBlock', {
                range: fmtBlockRange(activeBlock.start_time, activeBlock.end_time),
              })}
              {activeBlock.reason ? ` · ${activeBlock.reason}` : ''}
            </p>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setErrorMsg(null);
            saveMutation.mutate();
          }}
        >
          {/* Error banner */}
          {errorMsg && (
            <div role="alert" className="mx-6 mt-5 rounded-[var(--radius-sm)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Form body */}
          <div className="px-6 py-5 space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-secondary">{t('resources.detail.typeLabel')}</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ResourceType)}
                className={inputCls}
              >
                {Object.values(RESOURCE_TYPES).map((resourceType) => (
                  <option key={resourceType} value={resourceType}>
                    {t(RESOURCE_TYPE_LABEL_KEYS[resourceType])}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-secondary">{t('resources.detail.nameLabel')}</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-secondary">{t('resources.detail.floorFieldLabel')}</label>
                <select
                  required
                  value={String(floor)}
                  disabled={floorsLoading}
                  onChange={(e) => setFloor(Number(e.target.value))}
                  className={inputCls}
                >
                  <option value="">{t('resources.create.floorSelectDefault')}</option>
                  {floors.map((f) => (
                    <option key={f.id} value={String(f.id)}>
                      {f.name
                        ? t('resources.create.floorOptionWithName', { number: f.number, name: f.name })
                        : t('resources.create.floorOptionNoName', { number: f.number })}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-secondary">{t('resources.detail.capacityLabel')}</label>
                <input
                  type="number"
                  min={1}
                  required={type === RESOURCE_TYPES.MEETING_ROOM}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-secondary">{t('resources.detail.zoneLabel')}</label>
              <input
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-secondary">{t('resources.detail.descriptionLabel')}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={textareaCls}
              />
            </div>

            {/* Photos */}
            <PhotoUploadDetail
              existingPhotos={data.photos ?? []}
              newPhotoFiles={newPhotoFiles}
              uploadPending={addPhotosMutation.isPending}
              deletePending={deletePhotoMutation.isPending}
              onAddNewFiles={(files) => setNewPhotoFiles((prev) => [...prev, ...files])}
              onRemoveNewFile={(idx) => setNewPhotoFiles((prev) => prev.filter((_, i) => i !== idx))}
              onUploadNew={() => addPhotosMutation.mutate(newPhotoFiles)}
              onDeleteExisting={(photoId) => deletePhotoMutation.mutate(photoId)}
            />

            <label className="inline-flex items-center gap-2 text-xs text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              {t('resources.detail.activeLabel')}
            </label>

            {type === RESOURCE_TYPES.DESK && (
              <div className="rounded-xl border border-[color:var(--border-faint)] bg-raised px-4 py-3 space-y-3">
                <p className="text-xs font-semibold text-secondary mb-2">{t('resources.detail.deskSettings')}</p>
                <label className="inline-flex items-center gap-2 text-xs text-secondary cursor-pointer">
                  <input type="checkbox" checked={hasMonitor} onChange={(e) => setHasMonitor(e.target.checked)} />
                  {t('resources.detail.monitorLabel')}
                </label>
                <label className="inline-flex items-center gap-2 text-xs text-secondary cursor-pointer">
                  <input type="checkbox" checked={hasDock} onChange={(e) => setHasDock(e.target.checked)} />
                  {t('resources.detail.dockLabel')}
                </label>
                <label className="inline-flex items-center gap-2 text-xs text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasPowerOutlet}
                    onChange={(e) => setHasPowerOutlet(e.target.checked)}
                  />
                  {t('resources.detail.outletLabel')}
                </label>
                <label className="inline-flex items-center gap-2 text-xs text-secondary cursor-pointer">
                  <input type="checkbox" checked={isHotDesk} onChange={(e) => setIsHotDesk(e.target.checked)} />
                  {t('resources.detail.hotDeskLabel')}
                </label>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-secondary">{t('common.company')}</label>
                  <select
                    value={assignedCompanyId}
                    onChange={(e) => setAssignedCompanyId(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">{t('resources.detail.companyNone')}</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {type === RESOURCE_TYPES.MEETING_ROOM && (
              <div className="rounded-xl border border-[color:var(--border-faint)] bg-raised px-4 py-3 space-y-4">
                <p className="text-xs font-semibold text-secondary mb-2">{t('resources.detail.meetingRoomSettings')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {RESOURCE_EQUIPMENT_KEYS.map((key) => (
                    <label key={key} className="inline-flex items-center gap-2 text-xs text-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={equipment[key as ResourceEquipmentKey]}
                        onChange={() => toggleEquipment(key as ResourceEquipmentKey)}
                      />
                      {t(RESOURCE_EQUIPMENT_LABEL_KEYS[key as ResourceEquipmentKey])}
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-secondary">{t('resources.detail.minMinutesLabel')}</label>
                    <input
                      type="number"
                      min={1}
                      value={minDuration}
                      onChange={(e) => setMinDuration(Number(e.target.value))}
                      className={inputCls}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-secondary">{t('resources.detail.maxMinutesLabel')}</label>
                    <input
                      type="number"
                      min={1}
                      value={maxDuration}
                      onChange={(e) => setMaxDuration(Number(e.target.value))}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            )}

            {type === RESOURCE_TYPES.PARKING && (
              <div className="rounded-xl border border-[color:var(--border-faint)] bg-raised px-4 py-3 space-y-3">
                <p className="text-xs font-semibold text-secondary mb-2">{t('resources.detail.parkingSettings')}</p>
                <select
                  value={parkingType}
                  onChange={(e) => setParkingType(e.target.value as 'regular' | 'vip')}
                  className={inputCls}
                >
                  <option value={PARKING_TYPES.REGULAR}>{t('resources.detail.parkingRegular')}</option>
                  <option value={PARKING_TYPES.VIP}>VIP</option>
                </select>
                <select
                  value={assignedCompanyId}
                  onChange={(e) => setAssignedCompanyId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">{t('resources.detail.companyNotAssigned')}</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {type === RESOURCE_TYPES.CAPSULE && (
              <div className="rounded-xl border border-[color:var(--border-faint)] bg-raised px-4 py-3 space-y-3">
                <p className="text-xs font-semibold text-secondary mb-2">{t('resources.detail.capsuleSettings')}</p>
                <select
                  value={capsuleZone}
                  onChange={(e) => setCapsuleZone(e.target.value as 'quiet' | 'regular')}
                  className={cn(inputCls, 'mt-2')}
                >
                  <option value={CAPSULE_ZONES.QUIET}>{t('resources.detail.capsuleQuiet')}</option>
                  <option value={CAPSULE_ZONES.REGULAR}>{t('resources.detail.capsuleRegular')}</option>
                </select>
              </div>
            )}

            <div className="rounded-xl border border-[color:var(--border-faint)] bg-raised px-4 py-3 space-y-3">
              <p className="text-xs font-semibold text-secondary mb-2">{t('resources.detail.bookingPolicyLabel')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="advance_booking_days" className="text-xs font-medium text-secondary">
                    {t('resources.detail.advanceDaysLabel')}
                  </label>
                  <input
                    type="number"
                    id="advance_booking_days"
                    min={1}
                    value={advanceBookingDays}
                    onChange={(e) => setAdvanceBookingDays(Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="min_cancel_minutes" className="text-xs font-medium text-secondary">
                    {t('resources.detail.minCancelLabel')}
                  </label>
                  <input
                    type="number"
                    id="min_cancel_minutes"
                    min={1}
                    value={minCancelMinutes}
                    onChange={(e) => setMinCancelMinutes(Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center gap-2 border-t border-[color:var(--border-faint)] px-6 pt-4 pb-5">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="inline-flex items-center gap-1.5 h-8 px-4 text-sm font-medium rounded-[var(--radius-sm)] text-white bg-[color:var(--brand)] hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Save size={14} />
              {saveMutation.isPending ? t('common.saving') : t('common.save')}
            </button>

            {!isActive && (
              <button
                type="button"
                onClick={() => { setErrorMsg(null); setActivateModal(true); }}
                className="h-8 px-4 text-sm font-medium rounded-[var(--radius-sm)] border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                {t('common.activate')}
              </button>
            )}

            {isActive && (
              <button
                type="button"
                onClick={() => { setErrorMsg(null); setDeactivateModal(true); }}
                className="h-8 px-4 text-sm font-medium rounded-[var(--radius-sm)] border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
              >
                {t('common.deactivate')}
              </button>
            )}

            <button
              type="button"
              onClick={() => { setErrorMsg(null); setDeleteModal(true); }}
              className="ml-auto h-8 px-4 text-sm font-medium rounded-[var(--radius-sm)] border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            >
              {t('common.delete')}
            </button>
          </div>
        </form>
      </div>

      <ConfirmModal
        isOpen={activateModal}
        onClose={() => !activateMutation.isPending && setActivateModal(false)}
        onConfirm={() => activateMutation.mutate()}
        title={t('resources.detail.activateModalTitle')}
        description={t('resources.detail.activateModalDesc')}
        variant="warning"
        confirmLabel={t('common.activate')}
        isLoading={activateMutation.isPending}
      />

      <ConfirmModal
        isOpen={deactivateModal}
        onClose={() => !deactivateMutation.isPending && setDeactivateModal(false)}
        onConfirm={() => deactivateMutation.mutate()}
        title={t('resources.detail.deactivateModalTitle')}
        description={t('resources.detail.deactivateModalDesc')}
        variant="warning"
        confirmLabel={t('common.deactivate')}
        isLoading={deactivateMutation.isPending}
      />

      <ConfirmModal
        isOpen={deleteModal}
        onClose={() => !deleteMutation.isPending && setDeleteModal(false)}
        onConfirm={() => deleteMutation.mutate()}
        title={t('resources.detail.deleteModalTitle')}
        description={t('resources.detail.deleteModalDesc')}
        variant="danger"
        confirmLabel={t('common.delete')}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
