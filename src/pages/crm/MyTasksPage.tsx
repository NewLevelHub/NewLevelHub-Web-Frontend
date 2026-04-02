import { PageStub } from '@/shared/ui/PageStub';

export default function MyTasksPage() {
  return (
    <PageStub
      title="Мои задачи"
      description="Задачи назначенные на меня со всех досок"
      todos={[
        'Агрегация задач со всех досок',
        'Фильтры: по приоритету, дедлайну, доске',
        'Сортировка по дедлайну, приоритету',
        'Просроченные задачи выделены',
        'Клик → переход к задаче на доске',
        'Интеграция с GET /api/v1/crm/tasks/my/',
      ]}
    />
  );
}
