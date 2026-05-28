import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router';
import { Bell, User, Menu } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/shared/store/auth';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { cn } from '@/shared/lib/cn';
import { dateLocaleTag } from '@/shared/lib/localeFormat';
import type { Notification, PaginatedResponse } from '@/shared/types';

interface HeaderProps {
  onOpenMobileNav: () => void;
  isMobileNavOpen: boolean;
}

export function Header({ onOpenMobileNav, isMobileNavOpen }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  function formatRelativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return t('common.timeJustNow');
    if (minutes < 60) return t('common.timeMinutesAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('common.timeHoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 7) return t('common.timeDaysAgo', { count: days });
    return new Date(dateStr).toLocaleDateString(dateLocaleTag(i18n.language));
  }
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () =>
      apiClient.get<{ count: number }>(API.notifications.unreadCount).then(r => r.data),
    refetchInterval: 30_000,
  });

  const { data: recentData, isLoading: recentLoading } = useQuery({
    queryKey: ['notifications-recent'],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<Notification>>(API.notifications.list, {
          params: { page_size: 5 },
        })
        .then(r => r.data),
    enabled: open,
    refetchInterval: open ? 12_000 : false,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => apiClient.post(API.notifications.markRead(String(id))),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications-recent'] });
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      await queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiClient.post(API.notifications.markAllRead),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications-recent'] });
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      await queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  useEffect(() => {
    if (!open) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setDropdownPos({
        top: rect.bottom + window.scrollY + 8,
        right: window.innerWidth - rect.right,
      });
    }
    function handleOutsideClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  const unreadCount = unreadData?.count ?? 0;
  const badgeLabel = unreadCount > 9 ? '9+' : String(unreadCount);
  const recentItems = recentData?.results ?? [];
  const hasUnread = recentItems.some(n => !n.is_read);

  function handleItemClick(n: Notification) {
    if (!n.is_read) markReadMutation.mutate(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  return (
    <header className="relative z-[30] flex h-14 items-center justify-between gap-3 border-b border-default bg-surface px-3 sm:px-4 md:justify-end md:px-6">
      <button
        type="button"
        onClick={onOpenMobileNav}
        className="inline-flex items-center justify-center rounded-md p-2 text-secondary hover:bg-hover transition-colors md:hidden"
        aria-label={t('common.openSidebar')}
        aria-controls="app-sidebar"
        aria-expanded={isMobileNavOpen}
      >
        <Menu size={18} />
      </button>

      <div className="flex items-center gap-1 sm:gap-1.5">
        {/* Notifications */}
        <div className="relative">
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setOpen(prev => !prev)}
            className="relative rounded-md p-2 text-secondary hover:bg-hover hover:text-primary transition-colors"
            aria-label={
              unreadCount > 0
                ? t('common.notificationsUnread', { count: unreadCount })
                : t('common.notifications')
            }
            aria-expanded={open}
            aria-haspopup="true"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-[7px] w-[7px] items-center justify-center rounded-full bg-red-500">
                <span className="sr-only">{badgeLabel}</span>
              </span>
            )}
          </button>

          {open && createPortal(
            <div
              ref={dropdownRef}
              style={{ top: dropdownPos.top, right: dropdownPos.right }}
              className="fixed z-[9999] w-[calc(100vw-1rem)] max-w-sm max-h-[28rem] overflow-y-auto rounded-xl border border-default bg-surface shadow-lg"
              role="dialog"
              aria-label={t('common.notifications')}
            >
              <div className="flex items-center justify-between border-b border-default px-4 py-3">
                <span className="text-sm font-semibold text-primary">{t('common.notifications')}</span>
                {hasUnread && (
                  <button
                    type="button"
                    onClick={() => markAllReadMutation.mutate()}
                    disabled={markAllReadMutation.isPending}
                    className="text-xs text-brand hover:text-brand-hover disabled:opacity-50 transition-colors"
                  >
                    {t('header.markAllRead')}
                  </button>
                )}
              </div>

              {recentLoading ? (
                <div className="flex flex-col gap-3 px-4 py-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse space-y-1.5">
                      <div className="h-3 w-3/4 rounded bg-raised" />
                      <div className="h-3 w-1/2 rounded bg-hover" />
                    </div>
                  ))}
                </div>
              ) : recentItems.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted">{t('header.noNotifications')}</p>
              ) : (
                <ul>
                  {recentItems.map(n => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => handleItemClick(n)}
                        className="w-full text-left px-4 py-3 flex items-start gap-2.5 border-b border-default last:border-b-0 hover:bg-raised transition-colors"
                      >
                        {!n.is_read && (
                          <span
                            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500"
                            aria-label={t('common.unreadNotification')}
                          />
                        )}
                        <div className={cn('flex-1 min-w-0', n.is_read && 'ml-4')}>
                          <p className="truncate text-sm font-medium text-primary">{n.title}</p>
                          <p className="mt-0.5 line-clamp-3 whitespace-pre-line text-xs text-secondary">
                            {n.message ?? n.body}
                          </p>
                          <p className="mt-1 text-[11px] text-muted">
                            {formatRelativeTime(n.created_at)}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="border-t border-default px-4 py-2.5">
                <Link
                  to="/notifications"
                  onClick={() => setOpen(false)}
                  className="block text-center text-xs text-brand hover:text-brand-hover transition-colors"
                >
                  {t('header.viewAllNotifications')}
                </Link>
              </div>
            </div>,
            document.body,
          )}
        </div>

        {/* Profile */}
        <Link
          to="/profile"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-secondary hover:bg-hover hover:text-primary transition-colors"
        >
          <User size={17} />
          <span className="hidden sm:inline">{user?.first_name || t('common.profile')}</span>
        </Link>
      </div>
    </header>
  );
}

