import { useTaskDetail } from '@/pages/crm/hooks/useTaskDetail';
import { TaskDetailView } from '@/pages/crm/components/TaskDetailView';

export default function TaskDetailPage() {
  const taskDetail = useTaskDetail();
  return <TaskDetailView {...taskDetail} />;
}
