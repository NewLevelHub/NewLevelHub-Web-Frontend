import { PageStub } from '@/shared/ui/PageStub';
import { useAuthStore } from '@/shared/store/auth';
import { USER_ROLES } from '@/shared/config/constants';

const dashboardTodos: Record<string, string[]> = {
  [USER_ROLES.SUPERADMIN]: [
    'Карточки: кол-во компаний, пользователей, бронирований сегодня',
    'Последние события (регистрации, бронирования, гости)',
    'Быстрые действия: создать компанию, опубликовать объявление',
    'Графики загруженности ресурсов',
  ],
  [USER_ROLES.COMPANY_ADMIN]: [
    'Статистика компании: сотрудники, задачи, бронирования',
    'Лента объявлений (БЦ + внутренние)',
    'Последние задачи в CRM',
    'Ожидающие одобрения (отпуска, пропуска)',
  ],
  [USER_ROLES.EMPLOYEE]: [
    'Мои задачи на сегодня (из CRM)',
    'Мои бронирования на сегодня и ближайшие',
    'Лента объявлений',
    'Быстрые действия: забронировать стол, создать задачу, пригласить гостя',
    'Уведомления',
  ],
  [USER_ROLES.GUEST]: [
    'Мои бронирования на сегодня',
    'Быстрое бронирование (стол/зал прямо с дашборда)',
    'Объявления БЦ',
    'Ссылка на карту здания',
  ],
};

export default function DashboardPage() {
  const role = useAuthStore((s) => s.user?.role);
  const todos = (role && dashboardTodos[role]) || dashboardTodos[USER_ROLES.GUEST];

  return <PageStub title="Дашборд" description={`Интерфейс для роли: ${role}`} todos={todos} />;
}
