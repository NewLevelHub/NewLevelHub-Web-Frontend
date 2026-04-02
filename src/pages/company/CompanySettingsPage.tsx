import { PageStub } from '@/shared/ui/PageStub';

export default function CompanySettingsPage() {
  return (
    <PageStub
      title="Настройки компании"
      description="Только для админа компании"
      todos={[
        'Редактирование: название, описание, логотип, контакты',
        'Управление инвайт-ссылками (активные, истёкшие, отозвать)',
        'Настройка рабочих часов компании',
        'Кастомные категории задач и лейблы для CRM',
        'Просмотр использования лимитов (сотрудники, хранилище)',
        'Интеграция с GET/PATCH /api/v1/companies/:id/settings/',
      ]}
    />
  );
}
