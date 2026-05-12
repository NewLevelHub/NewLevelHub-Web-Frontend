import { Outlet } from 'react-router';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-page text-primary grid place-items-center">
      <div className="w-full max-w-md p-6 sm:p-8">
        <div className="mb-8 text-center">
          <span className="inline-block text-xl font-bold tracking-tight text-primary">NewLevelHub</span>
        </div>
        <div className="rounded-xl border border-default bg-surface p-6 shadow-sm">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
