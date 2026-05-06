import { Link } from 'react-router';

import { USER_ROLES } from '@/shared/config/constants';
import { useUser } from '@/shared/hooks/useAuth';
import { getApiErrorMessage } from '@/shared/lib/apiError';

import { AnnouncementEmptyState } from '@/pages/announcements/components/AnnouncementEmptyState';
import { AnnouncementFilters } from '@/pages/announcements/components/AnnouncementFilters';
import { AnnouncementItem } from '@/pages/announcements/components/AnnouncementItem';
import { AnnouncementSkeleton } from '@/pages/announcements/components/AnnouncementSkeleton';
import { useAnnouncements } from '@/pages/announcements/hooks/useAnnouncements';

export default function AnnouncementListPage() {
  const user = useUser();
  const isAdmin =
    user?.role === USER_ROLES.SUPERADMIN || user?.role === USER_ROLES.COMPANY_ADMIN;

  const {
    category,
    setCategory,
    visibleItems,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    sentinelCallbackRef,
    deleteMutation,
    markReadMutation,
    handleMarkRead,
    deleteError,
    canDelete,
  } = useAnnouncements();

  return (
    <section className="w-full space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Объявления</h1>
          <p className="text-sm text-gray-400">
            Лента БЦ и вашей компании. Закреплённые сверху, затем по дате публикации.
          </p>
        </div>
        {isAdmin ? (
          <Link
            to="/announcements/new"
            className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Создать объявление
          </Link>
        ) : null}
      </header>

      <AnnouncementFilters category={category} onCategoryChange={setCategory} />

      {deleteError ? (
        <p
          role="alert"
          className="rounded-lg border border-red-800/60 bg-red-950/40 px-3 py-2 text-sm text-red-200"
        >
          {deleteError}
        </p>
      ) : null}

      {isLoading ? (
        <AnnouncementSkeleton />
      ) : isError || (!isLoading && visibleItems.length === 0) ? (
        <AnnouncementEmptyState
          isError={isError}
          errorMessage={
            isError ? getApiErrorMessage(error, 'Не удалось загрузить ленту объявлений.') : null
          }
        />
      ) : (
        <ul className="space-y-3">
          {visibleItems.map((a) => (
            <AnnouncementItem
              key={a.id}
              announcement={a}
              canDelete={canDelete(a)}
              onMarkRead={handleMarkRead}
              onDelete={(id) => deleteMutation.mutate(id)}
              isMarkingRead={markReadMutation.isPending}
              isDeleting={deleteMutation.isPending}
              currentUserId={user?.id}
              isSuperadmin={user?.role === USER_ROLES.SUPERADMIN}
            />
          ))}
        </ul>
      )}

      <div ref={sentinelCallbackRef} />

      {isFetchingNextPage ? (
        <p className="text-center text-sm text-gray-500">Загрузка…</p>
      ) : null}

      {!isLoading && !isFetchingNextPage && hasNextPage ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => void fetchNextPage()}
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800"
          >
            Загрузить ещё
          </button>
        </div>
      ) : null}
    </section>
  );
}
