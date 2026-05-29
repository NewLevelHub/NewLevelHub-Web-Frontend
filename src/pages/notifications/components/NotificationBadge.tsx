import { useTranslation } from 'react-i18next';
export function NotificationBadge() {
  const { t } = useTranslation();
  return (
    <span
      className="mt-1 shrink-0 w-2 h-2 rounded-full bg-blue-500"
      aria-label="Непрочитанное"
    />
  );
}
