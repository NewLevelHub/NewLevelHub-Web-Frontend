import { Outlet, useNavigate } from 'react-router';
import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Sidebar } from '@/shared/ui/navigation/Sidebar';
import { Header } from '@/shared/ui/navigation/Header';
import { useAuthStore } from '@/shared/store/auth';

function ImpersonationBanner() {
  const navigate = useNavigate();
  const { user, isImpersonating, originalUser, stopImpersonation } = useAuthStore();

  if (!isImpersonating || !user) return null;

  const roleLabels: Record<string, string> = {
    company_admin: 'Администратор компании',
    employee: 'Сотрудник',
    guest: 'Гость',
  };

  const roleLabel = roleLabels[user.role] ?? user.role;
  const companyPart = user.company ? ` — ${user.company.name}` : '';

  function handleStop() {
    stopImpersonation();
    navigate('/admin/users');
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
          Вы вошли от имени{' '}
          <strong>
            {user.first_name} {user.last_name}
          </strong>{' '}
          ({roleLabel}
          {companyPart})
          {originalUser && (
            <>
              {' '}
              · Ваш аккаунт:{' '}
              <strong>
                {originalUser.first_name} {originalUser.last_name}
              </strong>
            </>
          )}
        </span>
      </div>

      <button
        type="button"
        onClick={handleStop}
        className="inline-flex items-center gap-1.5 shrink-0 px-3 py-1 rounded-md bg-amber-950/10 hover:bg-amber-950/20 transition-colors text-amber-950 font-semibold text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800"
        aria-label="Вернуться к своему аккаунту"
      >
        <X size={13} aria-hidden="true" />
        Вернуться к своему аккаунту
      </button>
    </div>
  );
}

export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Sidebar mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
      <div className="ml-0 md:ml-60">
        <ImpersonationBanner />
        <Header onOpenMobileNav={() => setMobileNavOpen(true)} isMobileNavOpen={mobileNavOpen} />
        <main className="p-3 sm:p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
