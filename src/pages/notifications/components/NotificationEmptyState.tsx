import { useTranslation } from 'react-i18next';
interface NotificationEmptyStateProps {
  isLoading: boolean;
}

export function NotificationEmptyState({ isLoading }: NotificationEmptyStateProps) {
  const { t } = useTranslation();
  if (isLoading) return <p className="text-sm text-muted">{t('common.loading')}</p>;
  return <p className="text-sm text-muted">Нет уведомлений</p>;
}
