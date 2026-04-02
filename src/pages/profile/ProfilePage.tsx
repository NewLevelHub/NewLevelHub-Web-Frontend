import { PageStub } from '@/shared/ui/PageStub';

export default function ProfilePage() {
  return (
    <PageStub
      title="Мой профиль"
      todos={[
        'Просмотр: имя, фамилия, email, телефон, должность, аватар',
        'Роль и компания (read-only)',
        'Редактирование: имя, фамилия, телефон, должность',
        'Загрузка / смена аватара',
        'Смена пароля (текущий → новый)',
        'История: последние бронирования, задачи, пропуска',
        'Интеграция с GET/PATCH /api/v1/auth/me/',
      ]}
    />
  );
}
