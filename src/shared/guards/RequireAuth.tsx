import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuthStore } from '@/shared/store/auth';

export function RequireAuth() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-950 text-white">
        <p className="text-gray-400">Загрузка...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
