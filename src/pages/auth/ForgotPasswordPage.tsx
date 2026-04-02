import { PageStub } from '@/shared/ui/PageStub';

export default function ForgotPasswordPage() {
  return (
    <PageStub
      title="Восстановление пароля"
      todos={[
        'Форма: email',
        'Интеграция с POST /api/v1/auth/password/reset/',
        'Сообщение об отправке ссылки на email',
        'Ссылка «Назад к входу» → /login',
      ]}
    />
  );
}
