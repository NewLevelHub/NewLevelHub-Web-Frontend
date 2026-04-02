import { PageStub } from '@/shared/ui/PageStub';

export default function MyBookingsPage() {
  return (
    <PageStub
      title="Мои бронирования"
      todos={[
        'Список: предстоящие / прошедшие / отменённые',
        'Для каждого: время, ресурс, статус, участники',
        'Отмена бронирования',
        'Изменение времени',
        'Интеграция с GET /api/v1/bookings/my/',
      ]}
    />
  );
}
