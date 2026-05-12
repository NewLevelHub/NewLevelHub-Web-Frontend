import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '@/shared/store/auth';

export function RequireGuest() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-page text-primary">
        <p className="text-secondary">Загрузка...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
