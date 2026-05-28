import { useTranslation } from 'react-i18next';
import { PageStub } from '@/shared/ui/PageStub';

export default function MapManagePage() {
  const { t } = useTranslation();
  return (
    <PageStub
      title="Управление картой"
      description={t('team.roleSuperadmin')}
      todos={[
        'Загрузка планов этажей (изображения)',
        'Расстановка точек: тип, позиция (x, y), привязка к ресурсу',
        'Редактирование и удаление точек',
        'Интеграция с /api/v1/building/floors/ и /markers/',
      ]}
    />
  );
}
