import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '@/shared/store/auth';
import type { UserRole } from '@/shared/config/constants';

interface Props {
  allowed: UserRole[];
}

export function RequireRole({ allowed }: Props) {
  const user = useAuthStore((s) => s.user);

  if (!user || !allowed.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}
