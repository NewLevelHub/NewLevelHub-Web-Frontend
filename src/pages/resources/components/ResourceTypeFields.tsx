import { useTranslation } from 'react-i18next';

import {
  CAPSULE_ZONES,
  PARKING_TYPES,
  RESOURCE_EQUIPMENT_KEYS,
  RESOURCE_EQUIPMENT_LABEL_KEYS,
  type CapsuleZone,
  type ParkingType,
  type ResourceEquipmentKey,
} from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { inputCls } from '@/pages/resources/utils';
import type { Company } from '@/shared/types';

// ─── Shared sub-components ────────────────────────────────────────────────────

function CheckboxRow({
  id,
  checked,
  onChange,
  label,
}: {
  id?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label
      htmlFor={id}
      className="inline-flex items-center gap-2 text-xs text-secondary cursor-pointer"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-default text-[color:var(--brand)]"
      />
      {label}
    </label>
  );
}

function CompanySelect({
  id,
  value,
  onChange,
  companies,
  hasError,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  companies: Company[];
  hasError?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-secondary">
        {t('resources.create.assignCompanyLabel')}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputCls, hasError && 'border-red-400 focus:ring-red-500/20')}
      >
        <option value="">{t('resources.create.noAssignCompany')}</option>
        {companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.name}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── DeskFields ───────────────────────────────────────────────────────────────

export type DeskFieldsProps = {
  hasMonitor: boolean;
  hasDock: boolean;
  hasPowerOutlet: boolean;
  isHotDesk: boolean;
  assignedCompanyId: string;
  companies: Company[];
  fieldErrors: Record<string, string>;
  onMonitorChange: (v: boolean) => void;
  onDockChange: (v: boolean) => void;
  onPowerOutletChange: (v: boolean) => void;
  onHotDeskChange: (v: boolean) => void;
  onAssignedCompanyChange: (v: string) => void;
};

export function DeskFields({
  hasMonitor,
  hasDock,
  hasPowerOutlet,
  isHotDesk,
  assignedCompanyId,
  companies,
  fieldErrors,
  onMonitorChange,
  onDockChange,
  onPowerOutletChange,
  onHotDeskChange,
  onAssignedCompanyChange,
}: DeskFieldsProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-[color:var(--border-faint)] bg-raised px-4 py-3 space-y-3">
      <p className="text-xs font-semibold text-secondary mb-2">
        {t('resources.create.deskSettings')}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <CheckboxRow
          checked={hasMonitor}
          onChange={onMonitorChange}
          label={t('resources.create.monitorLabel')}
        />
        <CheckboxRow
          checked={hasDock}
          onChange={onDockChange}
          label={t('resources.create.dockLabel')}
        />
        <CheckboxRow
          checked={hasPowerOutlet}
          onChange={onPowerOutletChange}
          label={t('resources.create.outletLabel')}
        />
        <CheckboxRow
          checked={isHotDesk}
          onChange={onHotDeskChange}
          label={t('resources.create.hotDeskLabel')}
        />
      </div>
      <CompanySelect
        id="desk_assigned_company"
        value={assignedCompanyId}
        onChange={onAssignedCompanyChange}
        companies={companies}
        hasError={!!fieldErrors.assigned_company}
      />
    </div>
  );
}

// ─── MeetingRoomFields ────────────────────────────────────────────────────────

export type MeetingRoomFieldsProps = {
  equipment: Record<ResourceEquipmentKey, boolean>;
  minDurationMinutes: string;
  maxDurationMinutes: string;
  assignedCompanyId: string;
  companies: Company[];
  fieldErrors: Record<string, string>;
  onEquipmentToggle: (key: ResourceEquipmentKey) => void;
  onMinDurationChange: (v: string) => void;
  onMaxDurationChange: (v: string) => void;
  onAssignedCompanyChange: (v: string) => void;
};

export function MeetingRoomFields({
  equipment,
  minDurationMinutes,
  maxDurationMinutes,
  assignedCompanyId,
  companies,
  fieldErrors,
  onEquipmentToggle,
  onMinDurationChange,
  onMaxDurationChange,
  onAssignedCompanyChange,
}: MeetingRoomFieldsProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-[color:var(--border-faint)] bg-raised px-4 py-3 space-y-3">
      <p className="text-xs font-semibold text-secondary mb-2">
        {t('resources.create.meetingSettings')}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {RESOURCE_EQUIPMENT_KEYS.map((key) => (
          <label key={key} className="inline-flex items-center gap-2 text-xs text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={equipment[key]}
              onChange={() => onEquipmentToggle(key)}
              className="h-3.5 w-3.5 rounded border-default text-[color:var(--brand)]"
            />
            {t(RESOURCE_EQUIPMENT_LABEL_KEYS[key])}
          </label>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="min_duration_minutes" className="text-xs font-medium text-secondary">
            {t('resources.create.minDurationLabel')}
          </label>
          <input
            id="min_duration_minutes"
            type="number"
            min={1}
            value={minDurationMinutes}
            onChange={(e) => onMinDurationChange(e.target.value)}
            className={cn(inputCls, !!fieldErrors.min_duration_minutes && 'border-red-400 focus:ring-red-500/20')}
          />
          {fieldErrors.min_duration_minutes && (
            <p className="text-xs text-red-600 mt-0.5">{fieldErrors.min_duration_minutes}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="max_duration_minutes" className="text-xs font-medium text-secondary">
            {t('resources.create.maxDurationLabel')}
          </label>
          <input
            id="max_duration_minutes"
            type="number"
            min={1}
            value={maxDurationMinutes}
            onChange={(e) => onMaxDurationChange(e.target.value)}
            className={cn(inputCls, !!fieldErrors.max_duration_minutes && 'border-red-400 focus:ring-red-500/20')}
          />
          {fieldErrors.max_duration_minutes && (
            <p className="text-xs text-red-600 mt-0.5">{fieldErrors.max_duration_minutes}</p>
          )}
        </div>
      </div>
      <CompanySelect
        id="meeting_room_assigned_company"
        value={assignedCompanyId}
        onChange={onAssignedCompanyChange}
        companies={companies}
        hasError={!!fieldErrors.assigned_company}
      />
    </div>
  );
}

// ─── ParkingFields ────────────────────────────────────────────────────────────

export type ParkingFieldsProps = {
  parkingType: ParkingType;
  assignedCompanyId: string;
  companies: Company[];
  fieldErrors: Record<string, string>;
  onParkingTypeChange: (v: ParkingType) => void;
  onAssignedCompanyChange: (v: string) => void;
};

export function ParkingFields({
  parkingType,
  assignedCompanyId,
  companies,
  fieldErrors,
  onParkingTypeChange,
  onAssignedCompanyChange,
}: ParkingFieldsProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-[color:var(--border-faint)] bg-raised px-4 py-3 space-y-3">
      <p className="text-xs font-semibold text-secondary mb-2">
        {t('resources.create.parkingSettings')}
      </p>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="parking_type" className="text-xs font-medium text-secondary">
          {t('resources.create.parkingTypeLabel')}
        </label>
        <select
          id="parking_type"
          value={parkingType}
          onChange={(e) => onParkingTypeChange(e.target.value as ParkingType)}
          className={cn(inputCls, !!fieldErrors.parking_type && 'border-red-400 focus:ring-red-500/20')}
        >
          <option value={PARKING_TYPES.REGULAR}>{t('resources.create.parkingRegular')}</option>
          <option value={PARKING_TYPES.VIP}>VIP</option>
        </select>
        {fieldErrors.parking_type && (
          <p className="text-xs text-red-600 mt-0.5">{fieldErrors.parking_type}</p>
        )}
      </div>
      <CompanySelect
        id="parking_assigned_company"
        value={assignedCompanyId}
        onChange={onAssignedCompanyChange}
        companies={companies}
        hasError={!!fieldErrors.assigned_company}
      />
    </div>
  );
}

// ─── CapsuleFields ────────────────────────────────────────────────────────────

export type CapsuleFieldsProps = {
  capsuleZone: CapsuleZone;
  assignedCompanyId: string;
  companies: Company[];
  fieldErrors: Record<string, string>;
  onCapsuleZoneChange: (v: CapsuleZone) => void;
  onAssignedCompanyChange: (v: string) => void;
};

export function CapsuleFields({
  capsuleZone,
  assignedCompanyId,
  companies,
  fieldErrors,
  onCapsuleZoneChange,
  onAssignedCompanyChange,
}: CapsuleFieldsProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-[color:var(--border-faint)] bg-raised px-4 py-3 space-y-3">
      <p className="text-xs font-semibold text-secondary mb-2">
        {t('resources.create.capsuleSettings')}
      </p>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="capsule_zone" className="text-xs font-medium text-secondary">
          {t('resources.create.capsuleZoneLabel')}
        </label>
        <select
          id="capsule_zone"
          value={capsuleZone}
          onChange={(e) => onCapsuleZoneChange(e.target.value as CapsuleZone)}
          className={cn(inputCls, !!fieldErrors.capsule_zone && 'border-red-400 focus:ring-red-500/20')}
        >
          <option value={CAPSULE_ZONES.QUIET}>{t('resources.create.capsuleQuiet')}</option>
          <option value={CAPSULE_ZONES.REGULAR}>{t('resources.create.capsuleRegular')}</option>
        </select>
        {fieldErrors.capsule_zone && (
          <p className="text-xs text-red-600 mt-0.5">{fieldErrors.capsule_zone}</p>
        )}
      </div>
      <CompanySelect
        id="capsule_assigned_company"
        value={assignedCompanyId}
        onChange={onAssignedCompanyChange}
        companies={companies}
        hasError={!!fieldErrors.assigned_company}
      />
    </div>
  );
}
