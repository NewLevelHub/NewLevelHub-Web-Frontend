import { PageStub } from '@/shared/ui/PageStub';

export default function PassCreatePage() {
  return (
    <PageStub
      title="Создание гостевого пропуска"
      todos={[
        'Форма: имя гостя, email, телефон (опц.), цель визита',
        'Дата и время: начало и конец действия',
        'Тип: одноразовый / многоразовый',
        'Генерация QR-кода после создания',
        'Скачать / распечатать / отправить на email',
        'Гости коворкинга: лимит 2 активных пропуска',
        'Интеграция с POST /api/v1/access/passes/',
      ]}
    />
  );
}
