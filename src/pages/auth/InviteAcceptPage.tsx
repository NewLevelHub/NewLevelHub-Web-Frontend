import { useParams, useSearchParams } from 'react-router';
import { PageStub } from '@/shared/ui/PageStub';

/**
 * Ссылка из письма: /invite?token=&lt;uuid&gt; (см. Celery send_invitation_email).
 * Поддерживается также /invite/:token для совместимости.
 */
export default function InviteAcceptPage() {
  const { token: pathToken } = useParams();
  const [searchParams] = useSearchParams();
  const token = pathToken ?? searchParams.get('token') ?? '';

  return (
    <PageStub
      title="Присоединение к компании"
      description="Регистрация по инвайт-ссылке от админа компании"
      todos={[
        token ? `Токен из ссылки: ${token.slice(0, 8)}…` : 'Нет токена в URL (?token= или /invite/:token)',
        'Проверка валидности инвайта (DEV-54)',
        'Показать название компании, от кого приглашение',
        'Форма регистрации: имя, фамилия, email, пароль',
        'Автоматическая привязка к компании при регистрации',
        'Инвайт одноразовый, срок 72 часа',
      ]}
    />
  );
}
