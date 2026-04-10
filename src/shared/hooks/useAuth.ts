import { useAuthStore } from '@/shared/store/auth';

export function useAuth() {
  return useAuthStore();
}

export function useUser() {
  return useAuthStore((s) => s.user);
}

export function useIsAuthenticated() {
  return useAuthStore((s) => s.isAuthenticated);
}

export function useImpersonation() {
  return useAuthStore((s) => ({
    isImpersonating: s.isImpersonating,
    originalUser: s.originalUser,
    startImpersonation: s.startImpersonation,
    stopImpersonation: s.stopImpersonation,
  }));
}
