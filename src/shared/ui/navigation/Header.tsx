import { Link } from 'react-router';
import { Bell, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/shared/store/auth';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';

export function Header() {
  const user = useAuthStore((s) => s.user);

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => apiClient.get<{ count: number }>(API.notifications.unreadCount).then(r => r.data),
    refetchInterval: 30_000,
  });

  const unreadCount = unreadData?.count ?? 0;
  const badgeLabel = unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <header className="h-14 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm flex items-center justify-end gap-4 px-6">
      <Link
        to="/notifications"
        className="text-gray-400 hover:text-white transition-colors relative"
        aria-label={unreadCount > 0 ? `Уведомления (${unreadCount} непрочитанных)` : 'Уведомления'}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center leading-none">
            {badgeLabel}
          </span>
        )}
      </Link>
      <Link
        to="/profile"
        className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
      >
        <User size={20} />
        <span className="hidden sm:inline">{user?.first_name || 'Профиль'}</span>
      </Link>
    </header>
  );
}
