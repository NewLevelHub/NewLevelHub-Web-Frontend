import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import type { CompanyAnalytics } from '@/shared/types';
import { PageStub } from '@/shared/ui/PageStub';
import { USER_ROLES } from '@/shared/config/constants';
import { useAuthStore } from '@/shared/store/auth';

function formatBytes(value: number) {
  if (value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const power = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const normalized = value / 1024 ** power;
  return `${normalized.toFixed(power === 0 ? 0 : 1)} ${units[power]}`;
}

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AnalyticsDashboardPage() {
  const role = useAuthStore((s) => s.user?.role);
  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN;

  const { data, isLoading, isError } = useQuery<CompanyAnalytics>({
    queryKey: ['analytics', 'company-dashboard'],
    queryFn: () => apiClient.get<CompanyAnalytics>(API.analytics.companyDashboard).then((r) => r.data),
    enabled: isCompanyAdmin,
    staleTime: 30_000,
  });

  if (role === USER_ROLES.SUPERADMIN) {
    return (
      <PageStub
        title="Аналитика"
        description="Аналитика всего БЦ"
        todos={['Интеграция супер-админской аналитики в рамках отдельной задачи']}
      />
    );
  }

  if (!isCompanyAdmin) {
    return null;
  }

  if (isLoading) {
    return <div className="p-6 text-sm text-gray-400">Загрузка аналитики...</div>;
  }

  if (isError || !data) {
    return <div className="p-6 text-sm text-red-400">Не удалось загрузить аналитику компании.</div>;
  }

  const cards = [
    { title: 'Сотрудники', value: data.total_employees },
    { title: 'Активные за 7 дней', value: data.active_7d },
    { title: 'Бронирования за месяц', value: data.bookings_month },
    { title: 'Гостевые визиты за месяц', value: data.guest_visits_month },
    {
      title: 'Хранилище',
      value: `${formatBytes(data.storage.used)} / ${formatBytes(data.storage.limit)}`,
    },
    {
      title: 'CRM задачи',
      value: `ToDo: ${data.active_crm_tasks.todo}, In Progress: ${data.active_crm_tasks.in_progress}, Done: ${data.active_crm_tasks.done}`,
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Аналитика компании</h1>
        <p className="mt-1 text-sm text-gray-400">Ключевые метрики и активность сотрудников.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div key={card.title} className="rounded-xl border border-gray-700 bg-gray-800 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-400">{card.title}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
        <div className="border-b border-gray-700 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Активность сотрудников</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-900/40 text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-4 py-3">Сотрудник</th>
                <th className="px-4 py-3">Брони (30д)</th>
                <th className="px-4 py-3">Активные задачи</th>
                <th className="px-4 py-3">Последний вход</th>
              </tr>
            </thead>
            <tbody>
              {data.employee_activity.map((row) => (
                <tr key={row.user_id} className="border-t border-gray-700/70 text-gray-200">
                  <td className="px-4 py-3">{row.full_name}</td>
                  <td className="px-4 py-3">{row.booking_count_30d}</td>
                  <td className="px-4 py-3">{row.task_count_active}</td>
                  <td className="px-4 py-3">{formatDateTime(row.last_login)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
