import { PageStub } from '@/shared/ui/PageStub';

export default function MapManagePage() {
  return (
    <PageStub
      title="Управление картой"
      description="Суперадмин"
      todos={[
        'Загрузка планов этажей (изображения)',
        'Расстановка точек: тип, позиция (x, y), привязка к ресурсу',
        'Редактирование и удаление точек',
        'Интеграция с /api/v1/building/floors/ и /markers/',
      ]}
    />
  );
}
