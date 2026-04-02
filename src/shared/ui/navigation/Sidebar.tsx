import { Link, useLocation } from 'react-router';
import { LogOut, Bell } from 'lucide-react';
import { useAuthStore } from '@/shared/store/auth';
import { sidebarConfig, type NavSection } from './sidebar-config';
import { cn } from '@/shared/lib/cn';

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuthStore();

  if (!user) return null;

  const sections = sidebarConfig[user.role] ?? [];

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-gray-950 border-r border-gray-800 flex flex-col z-50">
      <div className="p-5 border-b border-gray-800">
        <Link to="/" className="text-lg font-bold text-white tracking-tight">
          NewLevelHub
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {sections.map((section, si) => (
          <SidebarSection key={si} section={section} currentPath={location.pathname} />
        ))}
      </nav>

      <div className="border-t border-gray-800 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm text-white font-medium">
            {user.first_name?.[0] ?? user.email[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{user.full_name || user.email}</p>
            <p className="text-xs text-gray-500 capitalize">{user.role.replace('_', ' ')}</p>
          </div>
          <Link to="/notifications" className="text-gray-400 hover:text-white transition-colors">
            <Bell size={18} />
          </Link>
        </div>
        <button
          onClick={() => logout()}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors w-full"
        >
          <LogOut size={16} />
          Выйти
        </button>
      </div>
    </aside>
  );
}

function SidebarSection({
  section,
  currentPath,
}: {
  section: NavSection;
  currentPath: string;
}) {
  return (
    <div className="mb-2">
      {section.title && (
        <p className="px-5 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {section.title}
        </p>
      )}
      {section.items.map((item) => {
        const isActive =
          currentPath === item.path ||
          (item.path !== '/' && currentPath.startsWith(item.path));
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'flex items-center gap-3 px-5 py-2 text-sm transition-colors',
              isActive
                ? 'text-white bg-gray-800/60 border-r-2 border-blue-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/30',
            )}
          >
            <item.icon size={18} />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
