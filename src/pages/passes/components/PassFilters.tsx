import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { PASS_STATUSES, PASS_STATUS_LABEL_KEYS, type PassStatus } from '@/shared/config/constants';

interface PassFiltersProps {
  isAdminView: boolean;
  isSuperadmin: boolean;
  statusFilter: PassStatus | '';
  companyNameFilter: string;
  createdByEmailFilter: string;
  dateFromFilter: string;
  dateToFilter: string;
  hasActiveFilters: boolean;
  onStatusChange: (v: PassStatus | '') => void;
  onCompanyNameChange: (v: string) => void;
  onCreatedByEmailChange: (v: string) => void;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onReset: () => void;
}

export function PassFilters({
  isAdminView,
  isSuperadmin,
  statusFilter,
  companyNameFilter,
  createdByEmailFilter,
  dateFromFilter,
  dateToFilter,
  hasActiveFilters,
  onStatusChange,
  onCompanyNameChange,
  onCreatedByEmailChange,
  onDateFromChange,
  onDateToChange,
  onReset,
}: PassFiltersProps) {
  const { t } = useTranslation();
  const statusOptions = useMemo(
    () => [
      { label: t('passes.filters.all'), value: '' as const },
      { label: t('passes.filters.active'), value: PASS_STATUSES.ACTIVE },
      { label: t(PASS_STATUS_LABEL_KEYS[PASS_STATUSES.USED]), value: PASS_STATUSES.USED },
      { label: t('passes.filters.expired'), value: PASS_STATUSES.EXPIRED },
      { label: t('passes.filters.revoked'), value: PASS_STATUSES.REVOKED },
    ],
    [t],
  );

  const inputClass = 'mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary';

  return (
    <div className="rounded-xl border border-default bg-raised p-4">
      <div className={cn(
        'grid gap-3 sm:grid-cols-2',
        isAdminView ? 'lg:grid-cols-5' : 'lg:grid-cols-3',
      )}>
        {/* Status — shown to all roles */}
        <label className="text-sm text-secondary">
          {t('common.status')}
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value as PassStatus | '')}
            className={inputClass}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>

        {/* Creator email — admin only */}
        {isAdminView && (
          <label className="text-sm text-secondary">
            {t('passes.filters.createdByEmail')}
            <input
              type="email"
              value={createdByEmailFilter}
              onChange={(e) => onCreatedByEmailChange(e.target.value)}
              className={inputClass}
              placeholder="creator@company.com"
            />
          </label>
        )}

        {/* Company name — superadmin only */}
        {isSuperadmin && (
          <label className="text-sm text-secondary">
            {t('passes.companyFilter')}
            <input
              type="text"
              value={companyNameFilter}
              onChange={(e) => onCompanyNameChange(e.target.value)}
              className={inputClass}
            />
          </label>
        )}

        {/* Date from — shown to all roles */}
        <label className="text-sm text-secondary">
          {t('common.dateFrom')}
          <input
            type="date"
            value={dateFromFilter}
            onChange={(e) => onDateFromChange(e.target.value)}
            className={inputClass}
          />
        </label>

        {/* Date to — shown to all roles */}
        <label className="text-sm text-secondary">
          {t('common.dateTo')}
          <input
            type="date"
            value={dateToFilter}
            onChange={(e) => onDateToChange(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      {hasActiveFilters && (
        <div className="mt-3">
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg border border-default px-3 py-2 text-sm text-secondary hover:bg-hover"
          >
            {t('common.resetFilters')}
          </button>
        </div>
      )}
    </div>
  );
}
