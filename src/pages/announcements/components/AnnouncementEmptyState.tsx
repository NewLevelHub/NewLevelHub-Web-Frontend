import { useTranslation } from 'react-i18next';
interface AnnouncementEmptyStateProps {
  isError: boolean;
  errorMessage: string | null;
}

export function AnnouncementEmptyState({ isError, errorMessage }: AnnouncementEmptyStateProps) {
  const { t } = useTranslation();
  if (isError) {
    return (
      <p
        role="alert"
        className="rounded-lg border border-red-200 dark:border-red-900/40 bg-danger-subtle px-3 py-2 text-sm text-danger-badge"
      >
        {errorMessage}
      </p>
    );
  }
  return <p className="text-sm text-muted">Объявлений пока нет.</p>;
}
