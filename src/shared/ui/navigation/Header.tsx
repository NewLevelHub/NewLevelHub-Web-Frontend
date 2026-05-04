import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router';
import { Bell, User, Menu } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/shared/store/auth';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { cn } from '@/shared/lib/cn';
import type { Notification, PaginatedResponse } from '@/shared/types';

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин. назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч. назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} д. назад`;
  return new Date(dateStr).toLocaleDateString('ru-RU');
}

interface HeaderProps {
  onOpenMobileNav: () => void;
  isMobileNavOpen: boolean;
}

export function Header({ onOpenMobileNav, isMobileNavOpen }: HeaderProps) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
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
    if (!n.is_read) {
      markReadMutation.mutate(n.id);
    }
    setOpen(false);
    if (n.link) {
      navigate(n.link);
    }
  }

  return (
    <header className="h-14 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm flex items-center justify-between md:justify-end gap-3 px-3 sm:px-4 md:px-6">
      <button
        type="button"
        onClick={onOpenMobileNav}
        className="inline-flex items-center justify-center rounded-md p-2 text-gray-300 hover:bg-gray-800 md:hidden"
        aria-label="Открыть боковое меню"
        aria-controls="app-sidebar"
        aria-expanded={isMobileNavOpen}
      >
        <Menu size={18} />
      </button>
      <div className="flex items-center gap-3 sm:gap-4">
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen(prev => !prev)}
          className="text-gray-400 hover:text-white transition-colors relative"
          aria-label={
            unreadCount > 0
              ? `Уведомления (${unreadCount} непрочитанных)`
              : 'Уведомления'
          }
          aria-expanded={open}
          aria-haspopup="true"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center leading-none">
              {badgeLabel}
            </span>
          )}
        </button>

        {open && createPortal(
          <div
            ref={dropdownRef}
            style={{ top: dropdownPos.top, right: dropdownPos.right }}
            className="fixed w-[calc(100vw-1rem)] max-w-sm max-h-[28rem] overflow-y-auto rounded-xl border border-gray-700 bg-gray-900 shadow-xl z-[9999]"
            role="dialog"
            aria-label="Уведомления"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <span className="text-sm font-semibold text-white">Уведомления</span>
              {hasUnread && (
                <button
                  type="button"
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isPending}
                  className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors"
                >
                  Прочитать все
                </button>
              )}
            </div>

            {recentLoading ? (
              <div className="flex flex-col gap-3 px-4 py-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse space-y-1.5">
                    <div className="h-3 w-3/4 rounded bg-gray-700" />
                    <div className="h-3 w-1/2 rounded bg-gray-800" />
                  </div>
                ))}
              </div>
            ) : recentItems.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-500">Нет уведомлений</p>
            ) : (
              <ul>
                {recentItems.map(n => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleItemClick(n)}
                      className={cn(
                        'w-full text-left px-4 py-3 flex items-start gap-2 transition-colors border-b border-gray-800 last:border-b-0',
                        n.is_read
                          ? 'hover:bg-gray-800'
                          : 'hover:bg-gray-800/80',
                      )}
                    >
                      {!n.is_read && (
                        <span
                          className="mt-1.5 shrink-0 w-2 h-2 rounded-full bg-blue-500"
                          aria-label="Непрочитанное"
                        />
                      )}
                      <div className={cn('flex-1 min-w-0', n.is_read && 'ml-4')}>
                        <p className="text-sm font-medium text-white truncate">{n.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-3 whitespace-pre-line">
                          {n.message ?? n.body}
                        </p>
                        <p className="text-[11px] text-gray-600 mt-1">
                          {formatRelativeTime(n.created_at)}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t border-gray-700 px-4 py-2.5">
              <Link
                to="/notifications"
                onClick={() => setOpen(false)}
                className="block text-center text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Смотреть все уведомления
              </Link>
            </div>
          </div>,
          document.body,
        )}
      </div>

      <Link
        to="/profile"
        className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
      >
        <User size={20} />
        <span className="hidden sm:inline">{user?.first_name || 'Профиль'}</span>
      </Link>
      </div>
    </header>
  );
}
