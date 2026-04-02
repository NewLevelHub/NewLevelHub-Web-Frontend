import { PageStub } from '@/shared/ui/PageStub';

export default function LeaveRequestCreatePage() {
  return (
    <PageStub
      title="Новая заявка на отпуск"
      todos={[
        'Тип: отпуск / отгул / больничный / удалёнка',
        'Даты начала и окончания',
        'Комментарий',
        'После одобрения — отображается в календаре команды',
        'Интеграция с POST /api/v1/leave/requests/',
      ]}
    />
  );
}
