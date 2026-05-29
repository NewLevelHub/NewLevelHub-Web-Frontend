import { useTranslation } from 'react-i18next';
import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '@/shared/store/auth';

export function RequireGuest() {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-page text-primary">
        <p className="text-secondary">{t('common.loading')}</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
