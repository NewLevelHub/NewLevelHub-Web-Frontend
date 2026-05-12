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
      if (event.key === 'Escape') onCloseMobile();
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
      if (event.shiftKey && active === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
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
      {/* Mobile overlay */}
      <button
        type="button"
        aria-hidden={!mobileOpen}
        tabIndex={mobileOpen ? 0 : -1}
        onClick={onCloseMobile}
        className={cn(
          'fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity md:hidden',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />

      <aside
        id="app-sidebar"
        ref={panelRef}
        tabIndex={-1}
        aria-label="Боковая навигация"
        className={cn(
          'fixed left-0 top-0 bottom-0 z-50 flex w-60 flex-col transition-transform duration-200',
          'bg-sidebar border-r border-default',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'md:translate-x-0',
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-default">
          <Link
            to="/dashboard"
            className="text-[15px] font-semibold text-primary tracking-tight"
          >
            NewLevelHub
          </Link>
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden rounded-md p-1.5 text-secondary hover:bg-hover transition-colors"
            aria-label="Закрыть боковое меню"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {sections.map((section, si) => (
            <SidebarSection
              key={si}
              section={section}
              currentPath={location.pathname}
              onItemClick={onCloseMobile}
            />
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-default p-3">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-[13px] font-semibold text-white">
              {user.first_name?.[0] ?? user.email[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-[13px] font-medium text-primary leading-tight">
                {user.full_name || user.email}
              </p>
              <p className="text-[11px] text-muted capitalize leading-tight">
                {user.role.replace('_', ' ')}
              </p>
            </div>
            <Link
              to="/notifications"
              className="shrink-0 rounded-md p-1.5 text-secondary hover:bg-hover hover:text-primary transition-colors"
              aria-label="Уведомления"
            >
              <Bell size={16} />
            </Link>
          </div>
          <button
            onClick={() => logout()}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-secondary hover:bg-hover hover:text-primary transition-colors"
          >
            <LogOut size={15} />
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
  const matchedPaths = section.items
    .map((item) => item.path)
    .filter((path) => {
      if (path === '/') return currentPath === '/';
      return currentPath === path || currentPath.startsWith(`${path}/`);
    });

  const activePath = matchedPaths.sort((a, b) => b.length - a.length)[0];

  return (
    <div className="mb-1">
      {section.title && (
        <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-muted">
          {section.title}
        </p>
      )}
      {section.items.map((item) => {
        const isActive = activePath === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onItemClick}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors',
              isActive
                ? 'bg-active-tint text-brand border-l-2 border-[color:var(--nav-active-border)] pl-[calc(0.75rem-2px)]'
                : 'text-secondary hover:bg-hover hover:text-primary border-l-2 border-transparent pl-[calc(0.75rem-2px)]',
            )}
          >
            <item.icon size={16} className={isActive ? 'text-brand' : 'text-muted'} />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
