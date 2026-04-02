import { PageStub } from '@/shared/ui/PageStub';

export default function LeaveRequestListPage() {
  return (
    <PageStub
      title="Заявки на отпуск"
      todos={[
        'Для сотрудника: мои заявки (ожидающие / одобренные / отклонённые)',
        'Остаток отпускных дней',
        'Для админа: все заявки сотрудников, одобрить/отклонить',
        'Кнопка «Новая заявка» → /leave/new',
        'Интеграция с GET /api/v1/leave/requests/',
      ]}
    />
  );
}
