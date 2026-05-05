import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { LayoutGrid, Calendar, AlertCircle, Inbox, Search, Building2 } from 'lucide-react';
import { API } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import { useUser } from '@/shared/hooks/useAuth';
import { companiesCacheRoot } from '@/shared/lib/companyQueryKeys';
import { cn } from '@/shared/lib/cn';
import type { CrmBoard, Company } from '@/shared/types';

// ─── Board Card ───────────────────────────────────────────────────────────────

interface AdminBoardCardProps {
  board: CrmBoard;
  companyName: string | undefined;
  onClick: (board: CrmBoard) => void;
}

function AdminBoardCard({ board, companyName, onClick }: AdminBoardCardProps) {
  const formattedDate = new Date(board.created_at).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Открыть доску ${board.name}`}
      onClick={() => onClick(board)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(board);
        }
      }}
      className={cn(
        'group relative flex flex-col rounded-xl border border-gray-800 bg-gray-900',
        'p-5 cursor-pointer transition-all duration-200',
        'hover:border-gray-600 hover:bg-gray-800/60 hover:shadow-lg',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
      )}
    >
      {/* Icon + title */}
      <div className="flex items-start gap-3 mb-3">
        <div className="mt-0.5 rounded-lg bg-blue-600/20 p-2 shrink-0">
          <LayoutGrid size={18} className="text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-white text-sm leading-tight truncate">
            {board.name}
          </h3>
          {board.description && (
            <p className="mt-1 text-xs text-gray-400 line-clamp-2">{board.description}</p>
          )}
        </div>
      </div>

      {/* Company badge */}
      {companyName && (
        <div className="mb-2 flex items-center gap-1.5">
          <Building2 size={11} className="text-gray-500 shrink-0" />
          <span className="text-xs text-gray-500 truncate">{companyName}</span>
        </div>
      )}

      {/* Date */}
      <div className="mt-auto flex items-center gap-1.5 text-xs text-gray-500">
        <Calendar size={12} />
        <span>{formattedDate}</span>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-48 rounded-lg bg-gray-800 animate-pulse" />
      </div>

      {/* Filter bar skeleton */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="h-9 w-full sm:w-56 rounded-lg bg-gray-800 animate-pulse" />
        <div className="h-9 w-full sm:w-64 rounded-lg bg-gray-800 animate-pulse" />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-gray-800 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// ─── AdminBoardsPage ──────────────────────────────────────────────────────────

export default function AdminBoardsPage() {
  const user = useUser();
  const navigate = useNavigate();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch companies for filter dropdown
  const { data: companies } = useQuery({
    queryKey: [...companiesCacheRoot(user?.id)],
    queryFn: async () => {
      const { data } = await apiClient.get<Company[] | { results: Company[] }>(API.companies.list);
      return Array.isArray(data) ? data : data.results;
    },
  });

  // Fetch boards; re-fetches when selectedCompanyId changes
  const {
    data: boards,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['crm', 'boards', 'admin', selectedCompanyId],
    queryFn: async () => {
      const url = selectedCompanyId
        ? `${API.crm.boards}?company_id=${selectedCompanyId}`
        : API.crm.boards;
      const { data } = await apiClient.get<CrmBoard[] | { results: CrmBoard[] }>(url);
      return Array.isArray(data) ? data : data.results;
    },
  });

  // Company lookup map for card display
  const companyMap = new Map<number, string>(
    companies?.map((c) => [c.id, c.name]) ?? [],
  );

  // Client-side name filter
  const filtered = boards?.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleBoardClick = (board: CrmBoard) => {
    void navigate(`/crm/boards/${board.id}`);
  };

  if (isLoading) return <LoadingSkeleton />;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <AlertCircle size={40} className="text-red-400" />
        <p className="text-gray-400">
          Не удалось загрузить доски. Попробуйте обновить страницу.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-white">CRM — Все доски</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Просмотр канбан-досок всех компаний
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Company filter */}
        <div className="relative">
          <Building2
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
          />
          <select
            value={selectedCompanyId ?? ''}
            onChange={(e) => setSelectedCompanyId(e.target.value || null)}
            aria-label="Фильтр по компании"
            className={cn(
              'h-9 rounded-lg border border-gray-700 bg-gray-800 pl-9 pr-8 text-sm text-white',
              'appearance-none cursor-pointer transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              'hover:border-gray-600',
            )}
          >
            <option value="">Все компании</option>
            {companies?.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
          {/* Custom chevron */}
          <svg
            className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Board name search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию доски..."
            aria-label="Поиск по названию доски"
            className={cn(
              'h-9 w-full rounded-lg border border-gray-700 bg-gray-800 pl-9 pr-3 text-sm text-white',
              'placeholder-gray-500 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              'hover:border-gray-600',
            )}
          />
        </div>

        {/* Result count badge */}
        {filtered !== undefined && (
          <div className="flex items-center self-center sm:self-auto">
            <span className="text-xs text-gray-500">
              {filtered.length}{' '}
              {filtered.length === 1 ? 'доска' : filtered.length >= 2 && filtered.length <= 4 ? 'доски' : 'досок'}
            </span>
          </div>
        )}
      </div>

      {/* Empty state */}
      {filtered?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="rounded-full bg-gray-800 p-5">
            <Inbox size={32} className="text-gray-500" />
          </div>
          <div className="text-center">
            <p className="font-medium text-gray-300">Нет досок</p>
            <p className="text-sm text-gray-500 mt-1">
              {searchQuery
                ? 'Нет досок, совпадающих с поисковым запросом.'
                : selectedCompanyId
                  ? 'У выбранной компании нет досок.'
                  : 'Ни одна компания ещё не создала доску.'}
            </p>
          </div>
        </div>
      )}

      {/* Board grid */}
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
