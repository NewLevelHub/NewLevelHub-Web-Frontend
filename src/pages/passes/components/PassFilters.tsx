import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  return (
    <div className="rounded-xl border border-default bg-raised p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {isAdminView ? (
          <label className="text-sm text-secondary">{t('common.status')}<select
              value={statusFilter}
              onChange={(event) => onStatusChange(event.target.value as PassStatus | '')}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
            >
              {statusOptions.map(option => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {isAdminView ? (
          <label className="text-sm text-secondary">
            Email создателя
            <input
              type="email"
              value={createdByEmailFilter}
              onChange={(event) => onCreatedByEmailChange(event.target.value)}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
              placeholder="creator@company.com"
            />
          </label>
        ) : null}

        {isSuperadmin ? (
          <label className="text-sm text-secondary">{t('common.company')}<input
              type="text"
              value={companyNameFilter}
              onChange={(event) => onCompanyNameChange(event.target.value)}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
              placeholder="Название компании"
            />
          </label>
        ) : null}

        {isAdminView ? (
          <label className="text-sm text-secondary">
            Дата от
            <input
              type="date"
              value={dateFromFilter}
              onChange={(event) => onDateFromChange(event.target.value)}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
            />
          </label>
        ) : null}

        {isAdminView ? (
          <label className="text-sm text-secondary">
            Дата до
            <input
              type="date"
              value={dateToFilter}
              onChange={(event) => onDateToChange(event.target.value)}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
            />
          </label>
        ) : null}
      </div>

      {isAdminView ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={onReset}
            disabled={!hasActiveFilters}
            className="rounded-lg border border-default px-3 py-2 text-sm text-secondary hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
          >{t('common.resetFilters')}</button>
        </div>
      ) : null}
    </div>
  );
}
