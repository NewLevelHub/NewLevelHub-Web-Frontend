import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pin, Plus } from 'lucide-react';

import { USER_ROLES } from '@/shared/config/constants';
import { useUser } from '@/shared/hooks/useAuth';
import { getApiError } from '@/shared/lib/getApiError';

import { AnnouncementCreateModal } from '@/pages/announcements/components/AnnouncementCreateModal';
import { AnnouncementEmptyState } from '@/pages/announcements/components/AnnouncementEmptyState';
import { AnnouncementFilters } from '@/pages/announcements/components/AnnouncementFilters';
import { AnnouncementItem } from '@/pages/announcements/components/AnnouncementItem';
import { AnnouncementSkeleton } from '@/pages/announcements/components/AnnouncementSkeleton';
import { useAnnouncements } from '@/pages/announcements/hooks/useAnnouncements';

export default function AnnouncementListPage() {
  const { t } = useTranslation();
  const user = useUser();

  const isAdmin =
    user?.role === USER_ROLES.SUPERADMIN || user?.role === USER_ROLES.COMPANY_ADMIN;
  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;

  const [createOpen, setCreateOpen] = useState(false);
  const [createLevel, setCreateLevel] = useState<'building' | 'company'>('building');

  const {
    category,
    setCategory,
    scope,
    setScope,
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
    readAllMutation,
    handleMarkRead,
    deleteError,
    canDelete,
  } = useAnnouncements();

  const pinned = useMemo(() => visibleItems.filter((a) => a.is_pinned), [visibleItems]);
  const regular = useMemo(() => visibleItems.filter((a) => !a.is_pinned), [visibleItems]);
  const unreadCount = useMemo(() => visibleItems.filter((a) => !a.is_read).length, [visibleItems]);

  function getSubtitle() {
    if (isSuperadmin) return t('announcements.subtitleSA');
    if (user?.role === USER_ROLES.COMPANY_ADMIN) return t('announcements.subtitleCA');
    return t('announcements.subtitleEmployee');
  }

  function handleMarkAllRead() {
    readAllMutation.mutate();
  }

  return (
    <section className="w-full space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-primary">{t('announcements.pageTitle')}</h1>
            <p className="text-sm text-secondary">{getSubtitle()}</p>
          </div>
          {unreadCount > 0 ? (
            <span
              style={{
                background: 'var(--danger)',
                color: '#fff',
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 20,
                fontWeight: 700,
              }}
            >
              {t('announcements.newCount', { count: unreadCount })}
            </span>
          ) : null}
        </div>
        {isSuperadmin ? (
          <button
            type="button"
            onClick={() => { setCreateLevel('company'); setCreateOpen(true); }}
            className="inline-flex items-center gap-1.5 h-[34px] px-3 text-[13px] font-medium bg-[color:var(--brand)] text-white rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity"
          >
            <Plus size={14} aria-hidden="true" />
            {t('announcements.createBtnCompany')}
          </button>
        ) : isAdmin ? (
          <button
            type="button"
            onClick={() => { setCreateLevel('company'); setCreateOpen(true); }}
            className="inline-flex items-center gap-1.5 h-[34px] px-3 text-[13px] font-medium bg-[color:var(--brand)] text-white rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity"
          >
            <Plus size={14} aria-hidden="true" />
            {t('announcements.createButton')}
          </button>
        ) : null}
      </header>

      <AnnouncementFilters
        scope={scope}
        onScopeChange={setScope}
        category={category}
        onCategoryChange={setCategory}
        onMarkAllRead={handleMarkAllRead}
        isMarkingAllRead={readAllMutation.isPending}
      />

      {deleteError ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 dark:border-red-900/40 bg-danger-subtle px-3 py-2 text-sm text-danger-badge"
        >
          {deleteError}
        </p>
      ) : null}

      {isLoading ? (
        <AnnouncementSkeleton />
      ) : isError || (!isLoading && visibleItems.length === 0) ? (
        <AnnouncementEmptyState
          isError={isError}
          errorMessage={isError ? getApiError(error).message : null}
        />
      ) : (
        <div className="space-y-6">
          {/* Pinned section */}
          {pinned.length > 0 ? (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 10,
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                <Pin size={12} aria-hidden="true" />
                {t('announcements.pinned')}
              </div>
              <ul className="space-y-3">
                {pinned.map((a) => (
                  <AnnouncementItem
                    key={a.id}
                    announcement={a}
                    canDelete={canDelete(a)}
                    onMarkRead={handleMarkRead}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    isMarkingRead={markReadMutation.isPending}
                    isDeleting={deleteMutation.isPending}
                    currentUserId={user?.id}
                    isSuperadmin={isSuperadmin}
                  />
                ))}
              </ul>
            </div>
          ) : null}

          {/* Regular list */}
          {regular.length > 0 ? (
            <ul className="space-y-3">
              {regular.map((a) => (
                <AnnouncementItem
                  key={a.id}
                  announcement={a}
                  canDelete={canDelete(a)}
                  onMarkRead={handleMarkRead}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  isMarkingRead={markReadMutation.isPending}
                  isDeleting={deleteMutation.isPending}
                  currentUserId={user?.id}
                  isSuperadmin={isSuperadmin}
                />
              ))}
            </ul>
          ) : null}
        </div>
      )}

      <div ref={sentinelCallbackRef} />

      {isFetchingNextPage ? (
        <p className="text-center text-sm text-muted">{t('common.loading')}</p>
      ) : null}

      {!isLoading && !isFetchingNextPage && hasNextPage ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => void fetchNextPage()}
            className="rounded-lg border border-default px-4 py-2 text-sm text-secondary hover:bg-hover"
          >
            {t('announcements.loadMore')}
          </button>
        </div>
      ) : null}

      {createOpen ? (
        <AnnouncementCreateModal
          open={createOpen}
          initialLevel={createLevel}
          onClose={() => setCreateOpen(false)}
        />
      ) : null}
    </section>
  );
}
