import { PageStub } from '@/shared/ui/PageStub';

export default function ManageBookingsPage() {
  return (
    <PageStub
      title="Управление бронированиями"
      description="Все бронирования (суперадмин)"
      todos={[
        'Все бронирования с фильтрами: компания, пользователь, ресурс, дата',
        'Ручная отмена любого бронирования (с причиной)',
        'Блокировка ресурса на время (ремонт, мероприятие)',
        'Статистика: загруженность по часам, дням, типам',
        'Интеграция с GET /api/v1/bookings/manage/',
      ]}
    />
  );
}
