import '@/shared/lib/i18n';
import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { router } from './router';
import { useAuthStore } from '@/shared/store/auth';
import { queryClient } from '@/shared/lib/queryClient';
import { initSessionSync } from '@/shared/lib/sessionManager';

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => initSessionSync(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}


