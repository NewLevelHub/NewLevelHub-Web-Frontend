import { Link, useLocation } from 'react-router';
import { useEffect, useRef } from 'react';
import { LogOut, Bell, X } from 'lucide-react';
import { useAuthStore } from '@/shared/store/auth';
import { sidebarConfig, type NavSection } from './sidebar-config';
import { cn } from '@/shared/lib/cn';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const panelRef = useRef<HTMLElement | null>(null);

  if (!user) return null;

  const sections = sidebarConfig[user.role] ?? [];

  useEffect(() => {
    if (!mobileOpen) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseMobile();
      }
    };
    const handleTabTrap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleEsc);
    document.addEventListener('keydown', handleTabTrap);
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.removeEventListener('keydown', handleTabTrap);
    };
  }, [mobileOpen, onCloseMobile]);

  useEffect(() => {
    if (!mobileOpen || !panelRef.current) return;
    panelRef.current.focus();
  }, [mobileOpen]);

  return (
    <>
      <button
        type="button"
        aria-hidden={!mobileOpen}
        tabIndex={mobileOpen ? 0 : -1}
        onClick={onCloseMobile}
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />
      <aside
        id="app-sidebar"
        ref={panelRef}
        tabIndex={-1}
        aria-label="Боковая навигация"
        className={cn(
          'fixed left-0 top-0 bottom-0 w-64 bg-gray-950 border-r border-gray-800 flex flex-col z-50 transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'md:w-60 md:translate-x-0',
        )}
      >
        <div className="p-4 md:p-5 border-b border-gray-800 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-white tracking-tight">
            NewLevelHub
          </Link>
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden inline-flex items-center justify-center rounded-md p-1.5 text-gray-300 hover:bg-gray-800"
            aria-label="Закрыть боковое меню"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {sections.map((section, si) => (
            <SidebarSection
              key={si}
              section={section}
              currentPath={location.pathname}
              onItemClick={onCloseMobile}
            />
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
    </>
  );
}

function SidebarSection({
  section,
  currentPath,
  onItemClick,
}: {
  section: NavSection;
  currentPath: string;
  onItemClick: () => void;
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
            onClick={onItemClick}
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
