import { PageStub } from '@/shared/ui/PageStub';

export default function ServiceRequestListPage() {
  return (
    <PageStub
      title="Сервисные заявки"
      todos={[
        'Список заявок: мои / все (для суперадмина)',
        'Статусы: Новая → Принята → В работе → Выполнена',
        'Фильтры по типу, статусу, дате',
        'Кнопка «Создать заявку» → /service-requests/new',
        'Быстрая кнопка «Вызвать уборку»',
        'Для суперадмина: назначить исполнителя, сменить статус',
        'Оценка после выполнения (1-5 звёзд)',
        'Интеграция с GET /api/v1/service-requests/',
      ]}
    />
  );
}
