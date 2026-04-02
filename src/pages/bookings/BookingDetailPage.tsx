import { PageStub } from '@/shared/ui/PageStub';

export default function BookingDetailPage() {
  return (
    <PageStub
      title="Детали бронирования"
      todos={[
        'Информация: ресурс, время, статус, участники',
        'Отмена бронирования (за 30 мин до начала)',
        'Изменение времени (если слот свободен)',
        'Добавление/удаление участников',
        'Интеграция с GET /api/v1/bookings/:id/',
      ]}
    />
  );
}
