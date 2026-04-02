import { PageStub } from '@/shared/ui/PageStub';

export default function AnnouncementCreatePage() {
  return (
    <PageStub
      title="Новое объявление"
      description="Суперадмин: для всего БЦ. Админ компании: для своей компании."
      todos={[
        'Форма: заголовок, текст, категория (инфо / важное / мероприятие)',
        'Прикрепить изображение',
        'Закрепить наверху ленты',
        'Отправить email-уведомление (для критичных)',
        'Интеграция с POST /api/v1/announcements/',
      ]}
    />
  );
}
