interface NotificationEmptyStateProps {
  isLoading: boolean;
}

export function NotificationEmptyState({ isLoading }: NotificationEmptyStateProps) {
  if (isLoading) return <p className="text-sm text-muted">Загрузка…</p>;
  return <p className="text-sm text-muted">Нет уведомлений</p>;
}
