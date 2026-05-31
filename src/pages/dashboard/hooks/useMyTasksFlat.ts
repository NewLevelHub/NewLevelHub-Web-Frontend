import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import type { DashboardTaskItem, MyTasksGroupedResponse } from '@/shared/types';

/**
 * Тащит «мои задачи» с того же эндпоинта, что и страница /crm/my-tasks,
 * и разворачивает группы в плоский список. Используется в виджетах дашборда,
 * чтобы счётчик и список не расходились с фактическими задачами пользователя.
 */
export function useMyTasksFlat(limit = 5) {
  const { data, isLoading, isError } = useQuery({
    // Используем общий с /crm/my-tasks ключевой префикс — все мутации CRM
    // (создание/архивация/удаление/чек-листы) уже инвалидируют ['crm', 'my-tasks'],
    // и виджет в дашборде подхватит изменения без рефреша страницы.
    queryKey: ['crm', 'my-tasks', { source: 'dashboard-widget' }],
    queryFn: async () => {
      const { data: res } = await apiClient.get<MyTasksGroupedResponse>(API.crm.myTasks);
      return res;
    },
    staleTime: 60_000,
  });

  const flat: DashboardTaskItem[] = [];
  for (const group of data?.groups ?? []) {
    for (const task of group.tasks) {
      flat.push({
        id: task.id,
        title: task.title,
        board_name: group.board_name,
        due_date: task.deadline ? task.deadline.split('T')[0] : null,
        priority: task.priority,
        is_overdue: task.deadline ? new Date(task.deadline) < new Date(new Date().toDateString()) : false,
      });
    }
  }

  const totalCount = flat.length;
  const tasks = flat.slice(0, limit);

  return { tasks, totalCount, isLoading, isError };
}
