import { Link } from 'react-router';
import { Bell, User } from 'lucide-react';
import { useAuthStore } from '@/shared/store/auth';

export function Header() {
  const user = useAuthStore((s) => s.user);

  return (
    <header className="h-14 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm flex items-center justify-end gap-4 px-6">
      <Link
        to="/notifications"
        className="text-gray-400 hover:text-white transition-colors relative"
      >
        <Bell size={20} />
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
