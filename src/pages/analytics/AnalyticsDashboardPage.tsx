import { PageStub } from '@/shared/ui/PageStub';
import { useAuthStore } from '@/shared/store/auth';
import { USER_ROLES } from '@/shared/config/constants';

export default function AnalyticsDashboardPage() {
  const role = useAuthStore((s) => s.user?.role);
  const isSuperadmin = role === USER_ROLES.SUPERADMIN;

  const superadminTodos = [
    'Карточки: компании, пользователи, бронирования сегодня, гости, заявки',
    'Загруженность ресурсов по типам (30 дней)',
    'Тепловая карта: день недели × час (пиковые часы)',
    'Новые регистрации по неделям',
    'Сервисные заявки по типам',
    'Топ-5 популярных ресурсов',
    'Топ-5 активных компаний',
    'Ресурсы с низкой загруженностью',
    'Фильтры: период, тип ресурса, компания',
    'Экспорт в CSV / PDF',
    'Интеграция с GET /api/v1/analytics/overview/',
  ];

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
      description={isSuperadmin ? 'Аналитика всего БЦ' : 'Аналитика компании'}
      todos={isSuperadmin ? superadminTodos : companyAdminTodos}
    />
  );
}
