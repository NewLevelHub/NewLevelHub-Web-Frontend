import { PageStub } from '@/shared/ui/PageStub';

export default function AnnouncementListPage() {
  return (
    <PageStub
      title="Объявления"
      todos={[
        'Лента: объявления БЦ + внутренние компании (вперемешку по дате)',
        'Объявления БЦ помечены отдельно',
        'Закреплённые объявления наверху',
        'Отметить как «прочитано»',
        'Пагинация при скролле',
        'Для админов: кнопка «Создать объявление»',
        'Интеграция с GET /api/v1/announcements/',
      ]}
    />
  );
}
