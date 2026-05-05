import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '@/shared/store/auth';

export function RequireGuest() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-950 text-white">
        <p className="text-gray-400">Загрузка...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
