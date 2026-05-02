import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Pin, Trash2, Building2, AlertTriangle, Calendar, Eye } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_CATEGORY_LABELS,
  USER_ROLES,
  type AnnouncementCategory,
} from '@/shared/config/constants';
import { useUser } from '@/shared/hooks/useAuth';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { cn } from '@/shared/lib/cn';
import type { Announcement, CursorPaginatedResponse } from '@/shared/types';

type CategoryFilter = AnnouncementCategory | 'all';

const CATEGORY_FILTERS: Array<{ value: CategoryFilter; label: string }> = [
  { value: 'all', label: 'Все' },
  { value: ANNOUNCEMENT_CATEGORIES.INFO, label: ANNOUNCEMENT_CATEGORY_LABELS.info },
  { value: ANNOUNCEMENT_CATEGORIES.IMPORTANT, label: ANNOUNCEMENT_CATEGORY_LABELS.important },
  { value: ANNOUNCEMENT_CATEGORIES.EVENT, label: ANNOUNCEMENT_CATEGORY_LABELS.event },
];

const CATEGORY_ICON: Record<AnnouncementCategory, React.ComponentType<{ size?: number; className?: string }>> = {
  info: Megaphone,
  important: AlertTriangle,
  event: Calendar,
};

const CATEGORY_BADGE_CLASS: Record<AnnouncementCategory, string> = {
  info: 'bg-blue-900/40 text-blue-200 border-blue-800/60',
  important: 'bg-red-900/40 text-red-200 border-red-800/60',
  event: 'bg-emerald-900/40 text-emerald-200 border-emerald-800/60',
};

type FetchPage = (cursor: string | null) => Promise<CursorPaginatedResponse<Announcement>>;

function buildListUrl(cursor: string | null, category: CategoryFilter) {
  if (cursor) return cursor;
  const params = new URLSearchParams();
  if (category !== 'all') params.set('category', category);
  const qs = params.toString();
  return qs ? `${API.announcements.list}?${qs}` : API.announcements.list;
}

export default function AnnouncementListPage() {
  const queryClient = useQueryClient();
  const user = useUser();
  const isAdmin = user?.role === USER_ROLES.SUPERADMIN || user?.role === USER_ROLES.COMPANY_ADMIN;

  const [items, setItems] = useState<Announcement[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryFilter>('all');

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);

  const fetchPage: FetchPage = useCallback(async (cursor) => {
    const url = buildListUrl(cursor, category);
    const response = await apiClient.get<CursorPaginatedResponse<Announcement>>(url);
    return response.data;
  }, [category]);

  // Initial load + reload on filter change.
  useEffect(() => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    setItems([]);
    setNextCursor(null);
    fetchPage(null)
      .then((page) => {
        if (requestIdRef.current !== requestId) return;
        setItems(page.results);
        setNextCursor(page.next);
      })
      .catch((e: unknown) => {
        if (requestIdRef.current !== requestId) return;
        setError(getApiErrorMessage(e, 'Не удалось загрузить ленту объявлений.'));
      })
      .finally(() => {
        if (requestIdRef.current !== requestId) return;
        setLoading(false);
      });
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchPage(nextCursor);
      setItems((prev) => [...prev, ...page.results]);
      setNextCursor(page.next);
    } catch (e) {
      setError(getApiErrorMessage(e, 'Не удалось загрузить следующую страницу.'));
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, loadingMore, nextCursor]);

  // Infinite scroll: trigger loadMore when sentinel enters the viewport.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        void loadMore();
      }
    }, { rootMargin: '200px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(API.announcements.detail(String(id))),
    onSuccess: async (_, id) => {
      setItems((prev) => prev.filter((row) => row.id !== id));
      await queryClient.invalidateQueries({ queryKey: ['announcements-widget'] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) =>
      apiClient.post<Announcement>(API.announcements.markRead(String(id))),
    onSuccess: (response, id) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, ...response.data } : item,
        ),
      );
    },
  });

  const handleMarkRead = useCallback(
    (a: Announcement) => {
      if (!a.is_read) {
        markReadMutation.mutate(a.id);
      }
    },
    [markReadMutation],
  );

  const deleteError = deleteMutation.error
    ? getApiErrorMessage(deleteMutation.error, 'Не удалось удалить объявление.')
    : null;

  const canDelete = useCallback(
    (a: Announcement) => {
      if (!user) return false;
      if (user.role === USER_ROLES.SUPERADMIN) return true;
      return a.author === user.id;
    },
    [user],
  );

  const visibleItems = useMemo(() => items, [items]);

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

      <nav className="flex flex-wrap gap-2" aria-label="Фильтр по категории">
        {CATEGORY_FILTERS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setCategory(opt.value)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm transition-colors',
              category === opt.value
                ? 'border-indigo-500 bg-indigo-600/20 text-indigo-200'
                : 'border-gray-700 text-gray-300 hover:bg-gray-800',
            )}
          >
            {opt.label}
          </button>
        ))}
      </nav>

      {deleteError ? (
        <p role="alert" className="rounded-lg border border-red-800/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {deleteError}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-500">Загрузка…</p>
      ) : error ? (
        <p role="alert" className="rounded-lg border border-red-800/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : visibleItems.length === 0 ? (
        <p className="text-sm text-gray-500">Объявлений пока нет.</p>
      ) : (
        <ul className="space-y-3">
          {visibleItems.map((a) => {
            const Icon = CATEGORY_ICON[a.category] ?? Megaphone;
            const isBuilding = a.scope === 'building' || a.company_id === null;
            const isAuthor = user && (user.role === USER_ROLES.SUPERADMIN || a.author === user.id);
            return (
              <li
                key={a.id}
                className={cn(
                  'rounded-xl border bg-gray-900/80 px-4 py-4 shadow-sm transition-colors',
                  a.is_pinned ? 'border-indigo-700/70' : 'border-gray-800',
                  !a.is_read && 'ring-1 ring-indigo-500/30',
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      'mt-0.5 inline-flex items-center justify-center rounded-lg border px-2 py-1 text-xs',
                      CATEGORY_BADGE_CLASS[a.category],
                    )}
                    aria-label={ANNOUNCEMENT_CATEGORY_LABELS[a.category]}
                  >
                    <Icon size={14} aria-hidden="true" />
                    <span className="ml-1">{ANNOUNCEMENT_CATEGORY_LABELS[a.category]}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {a.is_pinned ? (
                        <Pin size={14} aria-hidden="true" className="text-indigo-300" />
                      ) : null}
                      {!a.is_read ? (
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-full bg-indigo-400"
                          aria-label="Непрочитано"
                        />
                      ) : null}
                      <h2 className={cn('font-semibold', a.is_read ? 'text-gray-300' : 'text-white')}>
                        {a.title}
                      </h2>
                      {isBuilding ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-gray-700 px-2 py-0.5 text-xs text-gray-300">
                          <Building2 size={12} aria-hidden="true" />
                          БЦ
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm text-gray-200">{a.text}</p>
                    {a.image ? (
                      <img
                        src={a.image}
                        alt=""
                        className="mt-3 max-h-80 w-full rounded-lg border border-gray-800 object-cover"
                      />
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-gray-500">
                        {a.author_name ? `${a.author_name} · ` : ''}
                        {new Date(a.created_at).toLocaleString()}
                      </p>
                      <div className="flex items-center gap-3">
                        {isAuthor ? (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <Eye size={12} aria-hidden="true" />
                            {a.read_count}
                          </span>
                        ) : null}
                        {!a.is_read ? (
                          <button
                            type="button"
                            onClick={() => handleMarkRead(a)}
                            disabled={markReadMutation.isPending}
                            className="text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-40"
                          >
                            Отметить прочитанным
                          </button>
                        ) : (
                          <span className="text-xs text-gray-600">Прочитано</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {canDelete(a) ? (
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(a.id)}
                      disabled={deleteMutation.isPending}
                      className="shrink-0 rounded p-1 text-gray-400 hover:bg-red-950/50 hover:text-red-300 disabled:opacity-40"
                      aria-label="Удалить объявление"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div ref={sentinelRef} />

      {loadingMore ? <p className="text-center text-sm text-gray-500">Загрузка…</p> : null}
      {!loading && !loadingMore && nextCursor ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => void loadMore()}
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800"
          >
            Загрузить ещё
          </button>
        </div>
      ) : null}
    </section>
  );
}
