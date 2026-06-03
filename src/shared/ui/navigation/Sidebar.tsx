import { Link, useLocation } from 'react-router';
import { useEffect, useRef } from 'react';
import { LogOut, Sun, Moon, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/shared/store/auth';
import { useTheme } from '@/shared/hooks/useTheme';
import { sidebarConfig, type NavSection } from './sidebar-config';
import { cn } from '@/shared/lib/cn';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function Sidebar({ mobileOpen, onCloseMobile, collapsed, onToggleCollapsed }: SidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { t, i18n } = useTranslation();
  const { theme, toggle } = useTheme();
  const panelRef = useRef<HTMLElement | null>(null);

  if (!user) return null;

  const sections = sidebarConfig[user.role] ?? [];
  const currentLang = i18n.language === 'en' ? 'en' : 'ru';

  function handleLanguageSwitch(lang: 'ru' | 'en') {
    if (currentLang === lang) return;
    i18n.changeLanguage(lang);
    localStorage.setItem('nlh_locale', lang);
  }

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

  const initials = (user.first_name?.[0] ?? user.email[0] ?? '').toUpperCase();

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
        aria-label={t('sidebar.nav')}
        className={cn(
          'fixed left-0 top-0 bottom-0 z-50 flex flex-col transition-[width,transform] duration-200',
          'bg-sidebar border-r border-default [-webkit-text-size-adjust:100%] [text-size-adjust:100%]',
          collapsed ? 'w-16' : 'w-60',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'md:translate-x-0',
        )}
      >
        {/* Zone 1 — Brand */}
        {collapsed ? (
          <div className="flex flex-col items-center pt-4 pb-3 gap-2">
            <Link to="/dashboard" className="flex items-center justify-center">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white text-[13px] font-bold"
                style={{ background: 'var(--brand)' }}
                aria-hidden="true"
              >
                N
              </span>
            </Link>
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="hidden md:flex items-center justify-center rounded-md p-1.5 text-secondary hover:bg-hover transition-colors"
              aria-label={t('sidebar.toggleExpand')}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-3.5 pt-4 pb-3">
            <Link to="/dashboard" className="flex items-center gap-2 min-w-0">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white text-[13px] font-bold"
                style={{ background: 'var(--brand)' }}
                aria-hidden="true"
              >
                N
              </span>
              <span className="text-[14px] font-semibold text-primary tracking-[-0.015em] truncate">
                New Level Hub
              </span>
            </Link>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onToggleCollapsed}
                className="hidden md:flex items-center justify-center rounded-md p-1.5 text-secondary hover:bg-hover transition-colors"
                aria-label={t('sidebar.toggleCollapse')}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={onCloseMobile}
                className="md:hidden rounded-md p-1.5 text-secondary hover:bg-hover transition-colors"
                aria-label={t('sidebar.closeMenu')}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Zone 2 — Navigation */}
        <nav className={cn('flex-1 overflow-y-auto py-1', collapsed ? 'px-1' : 'px-2')}>
          {sections.map((section, si) => (
            <SidebarSection
              key={si}
              section={section}
              currentPath={location.pathname}
              onItemClick={onCloseMobile}
              collapsed={collapsed}
            />
          ))}
        </nav>

        {/* Zone 3 — Footer */}
        <div className={cn('pb-3 pt-2 flex flex-col gap-2', collapsed ? 'px-1' : 'px-2.5')}>
          {/* Theme switcher */}
          {collapsed ? (
            <button
              type="button"
              onClick={toggle}
              className="w-9 h-9 mx-auto flex items-center justify-center rounded-md text-secondary hover:bg-hover hover:text-primary transition-colors"
              aria-label={theme === 'dark' ? t('sidebar.themeLight') : t('sidebar.themeDark')}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-default bg-raised p-1">
              <button
                type="button"
                onClick={() => { if (theme !== 'light') toggle(); }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 h-[30px] rounded-[var(--radius-sm)] text-[13px]! font-medium cursor-pointer transition-colors',
                  theme === 'light'
                    ? 'bg-surface text-primary shadow-sm'
                    : 'text-muted hover:text-secondary',
                )}
              >
                <Sun size={14} />
                {t('sidebar.themeLight')}
              </button>
              <button
                type="button"
                onClick={() => { if (theme !== 'dark') toggle(); }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 h-[30px] rounded-[var(--radius-sm)] text-[13px]! font-medium cursor-pointer transition-colors',
                  theme === 'dark'
                    ? 'bg-surface text-primary shadow-sm'
                    : 'text-muted hover:text-secondary',
                )}
              >
                <Moon size={14} />
                {t('sidebar.themeDark')}
              </button>
            </div>
          )}

          {/* Language switcher */}
          {collapsed ? (
            <button
              type="button"
              onClick={() => handleLanguageSwitch(currentLang === 'ru' ? 'en' : 'ru')}
              className="w-9 h-9 mx-auto flex items-center justify-center rounded-md text-[13px] font-semibold text-secondary hover:bg-hover hover:text-primary transition-colors"
              aria-label={currentLang === 'ru' ? t('sidebar.langEn') : t('sidebar.langRu')}
            >
              {currentLang === 'ru' ? 'EN' : 'RU'}
            </button>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-default bg-raised p-1">
              <button
                type="button"
                onClick={() => handleLanguageSwitch('ru')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 h-[30px] rounded-[var(--radius-sm)] text-[13px]! font-medium cursor-pointer transition-colors',
                  currentLang === 'ru'
                    ? 'bg-surface text-primary shadow-sm'
                    : 'text-muted hover:text-secondary',
                )}
              >
                {t('sidebar.langRu')}
              </button>
              <button
                type="button"
                onClick={() => handleLanguageSwitch('en')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 h-[30px] rounded-[var(--radius-sm)] text-[13px]! font-medium cursor-pointer transition-colors',
                  currentLang === 'en'
                    ? 'bg-surface text-primary shadow-sm'
                    : 'text-muted hover:text-secondary',
                )}
              >
                {t('sidebar.langEn')}
              </button>
            </div>
          )}

          {/* User block */}
          {collapsed ? (
            <div className="border-t border-default pt-2.5 mt-1 flex flex-col items-center gap-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-raised text-[12px] font-semibold text-primary">
                {initials}
              </div>
              <button
                type="button"
                onClick={() => logout()}
                className="rounded-md p-1.5 text-secondary hover:bg-hover hover:text-primary transition-colors"
                aria-label={t('sidebar.logout')}
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div className="border-t border-default pt-2.5 mt-1 flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-raised text-[12px] font-semibold text-primary">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-[13px] font-medium text-primary leading-tight">
                  {user.full_name || user.email}
                </p>
                <p className="text-[12px] text-muted capitalize leading-tight">
                  {user.role.replace('_', ' ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => logout()}
                className="ml-auto rounded-md p-1.5 text-secondary hover:bg-hover hover:text-primary transition-colors"
                aria-label={t('sidebar.logout')}
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function SidebarSection({
  section,
  currentPath,
  onItemClick,
  collapsed,
}: {
  section: NavSection;
  currentPath: string;
  onItemClick: () => void;
  collapsed: boolean;
}) {
  const { t } = useTranslation();

  const matchedPaths = section.items
    .map((item) => item.path)
    .filter((path) => {
      if (path === '/') return currentPath === '/';
      return currentPath === path || currentPath.startsWith(`${path}/`);
    });

  const activePath = matchedPaths.sort((a, b) => b.length - a.length)[0];

  return (
    <div className="mb-1">
      {section.titleKey && !collapsed && (
        <p className="px-2.5 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wide text-subtle">
          {t(section.titleKey)}
        </p>
      )}
      {collapsed && section.titleKey && <div className="pt-3" />}
      {section.items.map((item) => {
        const isActive = activePath === item.path;
        return collapsed ? (
          <Link
            key={item.path}
            to={item.path}
            onClick={onItemClick}
            title={t(item.labelKey)}
            className={cn(
              'flex items-center justify-center h-9 w-9 mx-auto transition-colors rounded-[var(--radius-sm)]',
              isActive
                ? 'bg-[color:var(--nav-active-bg)] text-[color:var(--nav-active-text)]'
                : 'text-[color:var(--nav-text)] hover:bg-[color:var(--nav-hover-bg)] hover:text-primary',
            )}
          >
            <item.icon size={15} className={cn(isActive ? 'opacity-100' : 'opacity-85')} />
          </Link>
        ) : (
          <Link
            key={item.path}
            to={item.path}
            onClick={onItemClick}
            className={cn(
              'flex items-center gap-2.5 h-[30px] px-2.5 text-[13px] transition-colors rounded-[var(--radius-sm)]',
              isActive
                ? 'bg-[color:var(--nav-active-bg)] text-[color:var(--nav-active-text)] font-semibold'
                : 'text-[color:var(--nav-text)] hover:bg-[color:var(--nav-hover-bg)] hover:text-primary',
            )}
          >
            <item.icon size={15} className={cn(isActive ? 'opacity-100' : 'opacity-85')} />
            {t(item.labelKey)}
          </Link>
        );
      })}
    </div>
  );
}
