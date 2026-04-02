import { PageStub } from '@/shared/ui/PageStub';

export default function ResourceListPage() {
  return (
    <PageStub
      title="Управление ресурсами"
      description="Столы, залы, парковка, капсулы (суперадмин)"
      todos={[
        'Таблица ресурсов с фильтрами: тип, этаж, статус',
        'Кнопка «Добавить ресурс» → /resources/new',
        'Массовое создание (10 столов на 3 этаже)',
        'Деактивация / удаление ресурса',
        'Назначение ресурса компании (закреплённые)',
        'Интеграция с GET /api/v1/resources/',
      ]}
    />
  );
}
