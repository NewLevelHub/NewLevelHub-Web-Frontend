import { useMyTasks } from '@/pages/crm/hooks/useMyTasks';
import { MyTasksView } from '@/pages/crm/components/MyTasksView';

export default function MyTasksPage() {
  const myTasks = useMyTasks();
  return <MyTasksView {...myTasks} />;
}
