import { PageStub } from '@/shared/ui/PageStub';

export default function TeamDirectoryPage() {
  return (
    <PageStub
      title="Справочник команды"
      description="Сотрудники компании"
      todos={[
        'Список сотрудников: аватар, имя, должность, email, телефон',
        'Поиск по имени',
        'Фильтр по отделу/должности',
        'Клик на сотрудника → профиль с контактами и задачами',
        'Интеграция с GET /api/v1/team/',
      ]}
    />
  );
}
