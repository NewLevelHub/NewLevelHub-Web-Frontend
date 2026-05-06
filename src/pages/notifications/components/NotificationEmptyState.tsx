interface NotificationEmptyStateProps {
  isLoading: boolean;
}

export function NotificationEmptyState({ isLoading }: NotificationEmptyStateProps) {
  if (isLoading) return <p className="text-sm text-gray-500">Загрузка…</p>;
  return <p className="text-sm text-gray-500">Нет уведомлений</p>;
}
