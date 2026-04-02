import { PageStub } from '@/shared/ui/PageStub';

export default function AccessLogPage() {
  return (
    <PageStub
      title="Лог доступа"
      description="Все проходы (суперадмин)"
      todos={[
        'Таблица: кто, когда, через какой вход, каким способом',
        'Фильтры: дата, компания, тип (гость/сотрудник)',
        'Экспорт в CSV',
        'Интеграция с GET /api/v1/access/log/',
      ]}
    />
  );
}
