import { PageStub } from '@/shared/ui/PageStub';

export default function ProfileSettingsPage() {
  return (
    <PageStub
      title="Настройки профиля"
      todos={[
        'Настройки уведомлений: по типу вкл/выкл',
        'Канал доставки: только система / система + email',
        'Режим «Не беспокоить»',
        'Интеграция с GET/PATCH /api/v1/notifications/settings/',
      ]}
    />
  );
}
