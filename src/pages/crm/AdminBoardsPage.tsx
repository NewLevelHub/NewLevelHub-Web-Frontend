import { useAdminBoards } from '@/pages/crm/hooks/useAdminBoards';
import { AdminBoardsView } from '@/pages/crm/components/AdminBoardsView';

export default function AdminBoardsPage() {
  const adminBoards = useAdminBoards();
  return <AdminBoardsView {...adminBoards} />;
}
