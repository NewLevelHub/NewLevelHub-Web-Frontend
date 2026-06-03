import { Outlet, useNavigate } from 'react-router';
import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Sidebar } from '@/shared/ui/navigation/Sidebar';
import { Header } from '@/shared/ui/navigation/Header';
import { useAuthStore } from '@/shared/store/auth';
import { SUPERADMIN_UI_PREFIX, USER_ROLE_LABEL_KEYS, type UserRole } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';

function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem('nlh_sidebar_collapsed') === 'true'
  );
  function toggle() {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('nlh_sidebar_collapsed', String(next));
      return next;
    });
  }
  return { collapsed, toggle };
}

function ImpersonationBanner() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isImpersonating, originalUser, stopImpersonation } = useAuthStore();

  if (!isImpersonating || !user) return null;

  const roleKey = USER_ROLE_LABEL_KEYS[user.role as UserRole];
  const roleLabel = roleKey ? t(roleKey) : user.role;
  const companyPart = user.company
    ? t('common.impersonationCompanySuffix', { company: user.company.name })
    : '';

  function handleStop() {
    stopImpersonation();
    navigate(`${SUPERADMIN_UI_PREFIX}/users`);
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-center justify-between gap-3 px-4 py-2 bg-amber-400 text-amber-950 text-sm font-medium"
    >
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle size={16} className="shrink-0" aria-hidden="true" />
        <span className="truncate">
          {t('common.impersonationSignedInAs', {
            name: `${user.first_name} ${user.last_name}`.trim(),
            role: roleLabel,
            company: companyPart,
          })}
          {originalUser && (
            <>
              {' '}
              {t('common.impersonationYourAccount', {
                name: `${originalUser.first_name} ${originalUser.last_name}`.trim(),
              })}
            </>
          )}
        </span>
      </div>

      <button
        type="button"
        onClick={handleStop}
        className="inline-flex items-center gap-1.5 shrink-0 px-3 py-1 rounded-md bg-amber-950/10 hover:bg-amber-950/20 transition-colors text-amber-950 font-semibold text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800"
        aria-label={t('common.returnToOwnAccount')}
      >
        <X size={13} aria-hidden="true" />
        {t('common.returnToOwnAccount')}
      </button>
    </div>
  );
}

export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { collapsed, toggle: toggleCollapsed } = useSidebarCollapsed();

  return (
    <div className="min-h-screen overflow-x-hidden bg-page text-primary">
      <Sidebar
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      />
      <div className={cn('ml-0 transition-[margin] duration-200', collapsed ? 'md:ml-16' : 'md:ml-60')}>
        <ImpersonationBanner />
        <Header onOpenMobileNav={() => setMobileNavOpen(true)} isMobileNavOpen={mobileNavOpen} />
        <main className="p-3 sm:p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
