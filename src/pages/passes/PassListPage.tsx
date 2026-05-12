import { Link } from 'react-router';

import { USER_ROLES } from '@/shared/config/constants';
import { useUser } from '@/shared/hooks/useAuth';
import { PassFilters } from '@/pages/passes/components/PassFilters';
import { PassRow } from '@/pages/passes/components/PassRow';
import { PassSkeleton } from '@/pages/passes/components/PassSkeleton';
import { usePasses } from '@/pages/passes/hooks/usePasses';

export default function PassListPage() {
  const user = useUser();
  const isAdminView = user?.role === USER_ROLES.SUPERADMIN || user?.role === USER_ROLES.COMPANY_ADMIN;
  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;

  const {
    passes,
    isLoading,
    isError,
    statusFilter,
    setStatusFilter,
    companyNameFilter,
    setCompanyNameFilter,
    createdByEmailFilter,
    setCreatedByEmailFilter,
    dateFromFilter,
    setDateFromFilter,
    dateToFilter,
    setDateToFilter,
    hasActiveFilters,
    resetFilters,
    totalCount,
  } = usePasses();

  return (
    <main className="mx-auto max-w-5xl space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Гостевые пропуска</h1>
          <p className="text-sm text-secondary">Ваши цифровые пропуска с QR-кодом.</p>
        </div>
        <Link
          to="/passes/new"
          className="inline-flex items-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
        >
          Создать пропуск
        </Link>
      </div>

      <PassFilters
        isAdminView={isAdminView}
        isSuperadmin={isSuperadmin}
        statusFilter={statusFilter}
        companyNameFilter={companyNameFilter}
        createdByEmailFilter={createdByEmailFilter}
        dateFromFilter={dateFromFilter}
        dateToFilter={dateToFilter}
        hasActiveFilters={hasActiveFilters}
        onStatusChange={setStatusFilter}
        onCompanyNameChange={setCompanyNameFilter}
        onCreatedByEmailChange={setCreatedByEmailFilter}
        onDateFromChange={setDateFromFilter}
        onDateToChange={setDateToFilter}
        onReset={resetFilters}
      />

      {isLoading ? <PassSkeleton /> : null}
      {isError ? <div className="text-sm text-danger">Не удалось загрузить список пропусков.</div> : null}

      {!isLoading && !isError ? (
        <div className="overflow-hidden rounded-xl border border-default bg-raised">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] divide-y divide-[color:var(--border)] text-sm">
              <thead className="bg-surface text-left text-secondary">
                <tr>
                  <th className="px-4 py-3">Гость</th>
                  <th className="px-4 py-3">Владелец</th>
                  <th className="px-4 py-3">Цель</th>
                  <th className="px-4 py-3">Период</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3 text-right">Детали</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {passes.map(pass => (
                  <PassRow key={pass.id} pass={pass} isSuperadmin={isSuperadmin} />
                ))}
              </tbody>
            </table>
          </div>
          {totalCount === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-secondary">Пропусков пока нет.</div>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
