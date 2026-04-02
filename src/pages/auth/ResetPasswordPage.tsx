import { PageStub } from '@/shared/ui/PageStub';

export default function ResetPasswordPage() {
  return (
    <PageStub
      title="Новый пароль"
      todos={[
        'Извлечение токена из URL параметра',
        'Форма: новый пароль + подтверждение',
        'Интеграция с POST /api/v1/auth/password/reset/confirm/',
        'Редирект на /login после успешного сброса',
      ]}
    />
  );
}
