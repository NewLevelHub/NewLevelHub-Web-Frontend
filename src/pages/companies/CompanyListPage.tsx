import { PageStub } from '@/shared/ui/PageStub';

export default function CompanyListPage() {
  return (
    <PageStub
      title="Компании-арендаторы"
      description="Управление компаниями (только суперадмин)"
      todos={[
        'Таблица компаний: название, тариф, сотрудников, статус',
        'Поиск и фильтрация по тарифу, статусу',
        'Кнопка «Создать компанию» → /companies/new',
        'Клик по компании → /companies/:id',
        'Деактивация / удаление компании',
        'Интеграция с GET /api/v1/companies/',
      ]}
    />
  );
}
