import { useTranslation } from 'react-i18next';
import { Building2, Search, Inbox, AlertCircle } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { AdminBoardCard } from '@/pages/crm/components/AdminBoardCard';
import { useAdminBoards } from '@/pages/crm/hooks/useAdminBoards';

export type AdminBoardsViewProps = ReturnType<typeof useAdminBoards>;

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-7 w-48 rounded-lg bg-raised animate-pulse" />
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="h-9 w-full sm:w-56 rounded-lg bg-raised animate-pulse" />
        <div className="h-9 w-full sm:w-64 rounded-lg bg-raised animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-raised animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export function AdminBoardsView(props: AdminBoardsViewProps) {
  const { t } = useTranslation();
  const {
    companies,
    selectedCompanyId,
    setSelectedCompanyId,
    searchQuery,
    setSearchQuery,
    companyMap,
    filtered,
    isLoading,
    isError,
    handleBoardClick,
  } = props;

  if (isLoading) return <LoadingSkeleton />;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <AlertCircle size={40} className="text-red-400" />
        <p className="text-secondary">Не удалось загрузить доски. Попробуйте обновить страницу.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-primary">CRM — Все доски</h1>
        <p className="text-sm text-muted mt-0.5">Просмотр канбан-досок всех компаний</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative">
          <Building2
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          />
          <select
            value={selectedCompanyId ?? ''}
            onChange={(e) => setSelectedCompanyId(e.target.value || null)}
            aria-label="Фильтр по компании"
            className={cn(
              'h-9 rounded-lg border border-default bg-raised pl-9 pr-8 text-sm text-primary',
              'appearance-none cursor-pointer transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              'hover:border-strong',
            )}
          >
            <option value="">{t('common.allCompanies')}</option>
            {companies?.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
          <svg
            className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2 4l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию доски..."
            aria-label="Поиск по названию доски"
            className={cn(
              'h-9 w-full rounded-lg border border-default bg-raised pl-9 pr-3 text-sm text-primary',
              'placeholder-gray-500 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              'hover:border-strong',
            )}
          />
        </div>

        {filtered !== undefined && (
          <div className="flex items-center self-center sm:self-auto">
            <span className="text-xs text-muted">
              {filtered.length}{' '}
              {filtered.length === 1
                ? 'доска'
                : filtered.length >= 2 && filtered.length <= 4
                  ? 'доски'
                  : 'досок'}
            </span>
          </div>
        )}
      </div>

      {filtered?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="rounded-full bg-raised p-5">
            <Inbox size={32} className="text-muted" />
          </div>
          <div className="text-center">
            <p className="font-medium text-secondary">{t('common.noBoards')}</p>
            <p className="text-sm text-muted mt-1">
              {searchQuery
                ? 'Нет досок, совпадающих с поисковым запросом.'
                : selectedCompanyId
                  ? 'У выбранной компании нет досок.'
                  : 'Ни одна компания ещё не создала доску.'}
            </p>
          </div>
        </div>
      )}

      {filtered && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((board) => (
            <AdminBoardCard
              key={board.id}
              board={board}
              companyName={companyMap.get(board.company)}
              onClick={handleBoardClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
