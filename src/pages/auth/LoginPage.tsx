import { PageStub } from '@/shared/ui/PageStub';

export default function LoginPage() {
  return (
    <PageStub
      title="Вход в систему"
      todos={[
        'Форма: email + пароль',
        'Чекбокс «Запомнить меня»',
        'Ссылка «Забыли пароль?» → /forgot-password',
        'Ссылка «Регистрация» → /register',
        'Валидация полей (react-hook-form + zod)',
        'Интеграция с POST /api/v1/auth/login/',
        'Сохранение токенов в localStorage',
        'Редирект на дашборд после успешного входа',
      ]}
    />
  );
}
