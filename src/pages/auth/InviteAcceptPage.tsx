import { PageStub } from '@/shared/ui/PageStub';

export default function InviteAcceptPage() {
  return (
    <PageStub
      title="Присоединение к компании"
      description="Регистрация по инвайт-ссылке от админа компании"
      todos={[
        'Извлечение invite_token из URL',
        'Проверка валидности инвайта (GET /api/v1/auth/invite/:token)',
        'Показать название компании, от кого приглашение',
        'Форма регистрации: имя, фамилия, email, пароль',
        'Автоматическая привязка к компании при регистрации',
        'Инвайт одноразовый, срок 72 часа',
      ]}
    />
  );
}
