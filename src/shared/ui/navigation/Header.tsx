import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router';
import { Bell, User, Menu } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/shared/store/auth';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { dateLocaleTag } from '@/shared/lib/localeFormat';
import { NotifIcon } from '@/pages/notifications/components/NotificationTypeIcon';
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
    <header className="relative z-[30] flex h-14 items-center justify-between gap-3 border-b border-default bg-surface px-3 sm:px-4 md:px-6">
      <div className="flex items-center gap-3">
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
        {user?.company?.logo && user.company.plan === 'premium' && (
          <img
            src={user.company.logo}
            alt={t('header.companyLogoAlt')}
            className="h-8 w-auto object-contain"
          />
        )}
      </div>

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
              <span className="absolute right-1 top-1 flex h-[7px] w-[7px] items-center justify-center rounded-full bg-[color:var(--danger)]">
                <span className="sr-only">{badgeLabel}</span>
              </span>
            )}
          </button>

          {open && createPortal(
            <div
              ref={dropdownRef}
              style={{
                position: 'fixed',
                top: dropdownPos.top,
                right: dropdownPos.right,
                zIndex: 9999,
                width: 380,
                maxWidth: 'calc(100vw - 1rem)',
                maxHeight: 520,
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-pop)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
              role="dialog"
              aria-label={t('common.notifications')}
            >
              {/* Header — fixed, never scrolls */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px 10px',
                borderBottom: '1px solid var(--border)',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {t('common.notifications')}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => markAllReadMutation.mutate()}
                      disabled={markAllReadMutation.isPending}
                      style={{
                        fontSize: 11, fontWeight: 500,
                        color: 'var(--brand)',
                        background: 'none', border: 'none',
                        cursor: 'pointer', padding: 0,
                        opacity: markAllReadMutation.isPending ? 0.5 : 1,
                      }}
                    >
                      {t('header.markAllRead')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    style={{
                      width: 22, height: 22, borderRadius: 5, border: 'none',
                      background: 'transparent', cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    aria-label={t('common.close')}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M18 6 6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Scrollable list */}
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {recentLoading ? (
                  <div style={{ padding: '16px' }}>
                    {[...Array(3)].map((_, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--border-faint)' }}>
                        <div className="animate-pulse" style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--bg-raised)', flexShrink: 0 }} />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div className="animate-pulse" style={{ height: 11, width: '60%', borderRadius: 4, background: 'var(--bg-raised)' }} />
                          <div className="animate-pulse" style={{ height: 10, width: '80%', borderRadius: 4, background: 'var(--bg-raised)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentItems.length === 0 ? (
                  <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    {t('header.noNotifications')}
                  </div>
                ) : (
                  recentItems.map(n => (
                    <div
                      key={n.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleItemClick(n)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleItemClick(n); }}
                      aria-label={n.title}
                      style={{
                        display: 'flex', gap: 10, alignItems: 'flex-start',
                        padding: '10px 16px',
                        borderBottom: '1px solid var(--border-faint)',
                        background: n.is_read ? 'transparent' : 'var(--bg-hover)',
                        cursor: 'pointer', position: 'relative',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-raised)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = n.is_read ? 'transparent' : 'var(--bg-hover)'; }}
                    >
                      {!n.is_read && (
                        <div aria-hidden="true" style={{
                          position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)',
                          width: 5, height: 5, borderRadius: '50%', background: 'var(--brand)',
                        }} />
                      )}
                      <NotifIcon type={n.type ?? n.notification_type ?? ''} size={14} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 12, fontWeight: n.is_read ? 400 : 600,
                          color: 'var(--text-primary)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {n.title}
                        </div>
                        <div style={{
                          fontSize: 11, color: 'var(--text-muted)', marginTop: 2,
                          display: '-webkit-box', WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {n.message ?? n.body}
                        </div>
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--text-subtle)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {formatRelativeTime(n.created_at)}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Footer — fixed, never scrolls */}
              <div style={{
                padding: '10px 16px',
                borderTop: '1px solid var(--border)',
                flexShrink: 0,
              }}>
                <Link
                  to="/notifications"
                  onClick={() => setOpen(false)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'center',
                    fontSize: 12, fontWeight: 500,
                    color: 'var(--text-secondary)',
                    padding: '6px 0',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'transparent',
                    textDecoration: 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--bg-raised)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
                >
                  {t('header.viewAllNotifications')} →
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

