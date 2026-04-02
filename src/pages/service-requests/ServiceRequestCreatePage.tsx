import { PageStub } from '@/shared/ui/PageStub';

export default function ServiceRequestCreatePage() {
  return (
    <PageStub
      title="Новая сервисная заявка"
      todos={[
        'Выбор типа: уборка, поломка, расходники, общая',
        'Этаж, локация, описание, срочность',
        'Прикрепить фото',
        'Интеграция с POST /api/v1/service-requests/',
      ]}
    />
  );
}
