import { PageStub } from '@/shared/ui/PageStub';

export default function BoardListPage() {
  return (
    <PageStub
      title="CRM — Доски"
      description="Канбан-доски компании"
      todos={[
        'Список досок компании (карточки)',
        'Создание новой доски (модалка)',
        'Архивирование доски',
        'Лимит досок в зависимости от тарифа',
        'Клик → /crm/boards/:id',
        'Интеграция с GET /api/v1/crm/boards/',
      ]}
    />
  );
}
