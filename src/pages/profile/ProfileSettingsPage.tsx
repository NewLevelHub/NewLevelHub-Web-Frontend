import { useTranslation } from 'react-i18next';
import { PageStub } from '@/shared/ui/PageStub';

export default function ProfileSettingsPage() {
  const { t } = useTranslation();
  return (
    <PageStub
      title={t('profile.settingsTitle')}
      todos={[
        'Настройки уведомлений: по типу вкл/выкл',
        'Канал доставки: только система / система + email',
        'Режим «Не беспокоить»',
        'Интеграция с GET/PATCH /api/v1/notifications/settings/',
      ]}
    />
  );
}
