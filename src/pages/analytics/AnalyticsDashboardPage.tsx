import { Navigate } from 'react-router';

import { PageStub } from '@/shared/ui/PageStub';
import { useAuth } from '@/shared/hooks/useAuth';
import { USER_ROLES } from '@/shared/config/constants';

export default function AnalyticsDashboardPage() {
  const { user, isLoading } = useAuth();
  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;

  if (isLoading) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-sm text-gray-500">Загрузка…</p>
      </main>
    );
  }

  if (isSuperadmin) {
    return <Navigate to="/admin/analytics" replace />;
  }

  const companyAdminTodos = [
    'Активные сотрудники за неделю',
    'Бронирования компании за месяц',
    'Использование хранилища (X из Y ГБ)',
    'Задачи CRM по статусам',
    'Гостевые визиты за месяц',
    'Таблица сотрудников: бронирования, задачи, активность',
    'Интеграция с GET /api/v1/analytics/companies/:id/',
  ];

  return (
    <PageStub
      title="Аналитика"
      description="Аналитика компании"
      todos={companyAdminTodos}
    />
  );
}
