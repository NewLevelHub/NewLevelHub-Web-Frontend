import { Outlet } from 'react-router';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gray-950 text-white grid place-items-center">
      <div className="w-full max-w-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-8">NewLevelHub</h1>
        <Outlet />
      </div>
    </div>
  );
}
