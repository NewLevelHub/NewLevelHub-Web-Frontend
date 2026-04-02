import { PageStub } from '@/shared/ui/PageStub';

export default function RegisterPage() {
  return (
    <PageStub
      title="Регистрация"
      description="Регистрация гостя коворкинга"
      todos={[
        'Форма: имя, фамилия, email, телефон (опционально), пароль, подтверждение пароля',
        'Валидация (react-hook-form + zod)',
        'Интеграция с POST /api/v1/auth/register/',
        'После регистрации — автоматический вход',
        'Ссылка «Уже есть аккаунт?» → /login',
        'Информация о подтверждении email',
      ]}
    />
  );
}
