import { Outlet } from 'react-router';
import { Sidebar } from '@/shared/ui/navigation/Sidebar';
import { Header } from '@/shared/ui/navigation/Header';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Sidebar />
      <div className="ml-60">
        <Header />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
