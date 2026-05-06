import { PASS_STATUSES, type PassStatus } from '@/shared/config/constants';

const STATUS_OPTIONS: Array<{ label: string; value: PassStatus | '' }> = [
  { label: 'Все', value: '' },
  { label: 'Активные', value: PASS_STATUSES.ACTIVE },
  { label: 'Использованные', value: PASS_STATUSES.USED },
  { label: 'Истекшие', value: PASS_STATUSES.EXPIRED },
  { label: 'Отозванные', value: PASS_STATUSES.REVOKED },
];

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
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {isAdminView ? (
          <label className="text-sm text-gray-300">
            Статус
            <select
              value={statusFilter}
              onChange={(event) => onStatusChange(event.target.value as PassStatus | '')}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
            >
              {STATUS_OPTIONS.map(option => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {isAdminView ? (
          <label className="text-sm text-gray-300">
            Email создателя
            <input
              type="email"
              value={createdByEmailFilter}
              onChange={(event) => onCreatedByEmailChange(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
              placeholder="creator@company.com"
            />
          </label>
        ) : null}

        {isSuperadmin ? (
          <label className="text-sm text-gray-300">
            Компания
            <input
              type="text"
              value={companyNameFilter}
              onChange={(event) => onCompanyNameChange(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
              placeholder="Название компании"
            />
          </label>
        ) : null}

        {isAdminView ? (
          <label className="text-sm text-gray-300">
            Дата от
            <input
              type="date"
              value={dateFromFilter}
              onChange={(event) => onDateFromChange(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
            />
          </label>
        ) : null}

        {isAdminView ? (
          <label className="text-sm text-gray-300">
            Дата до
            <input
              type="date"
              value={dateToFilter}
              onChange={(event) => onDateToChange(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
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
            className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Сбросить фильтры
          </button>
        </div>
      ) : null}
    </div>
  );
}
