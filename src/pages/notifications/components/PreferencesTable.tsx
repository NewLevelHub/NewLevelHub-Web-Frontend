import { useTranslation } from 'react-i18next';
import type { NotificationPreferences, NotificationType } from '@/shared/types';
import { Toggle } from '@/pages/notifications/components/Toggle';

const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  booking_confirmed: 'Бронирование подтверждено',
  booking_reminder: 'Напоминание о бронировании',
  booking_cancelled: 'Бронирование отменено',
  task_assigned: 'Задача назначена',
  task_moved: 'Задача перемещена',
  task_comment: 'Комментарий к задаче',
  task_deadline: 'Дедлайн задачи',
  guest_validated: 'Гость подтверждён',
  guest_pass_expiring: 'Пропуск гостя истекает',
  service_request_update: 'Обновление заявки',
  announcement: 'Объявление',
  invitation: 'Приглашение',
  leave_review: 'Проверка отпуска',
  system: 'Системное',
};

const ALL_TYPES = Object.keys(NOTIFICATION_LABELS) as NotificationType[];

const EMAIL_SUPPORTED_TYPES = new Set<NotificationType>([
  'booking_confirmed',
  'task_assigned',
  'task_deadline',
  'leave_review',
  'guest_validated',
  'announcement',
]);

export interface PreferencesTableProps {
  preferences: NotificationPreferences;
  pendingKeys: Set<string>;
  onToggle: (type: NotificationType, field: 'in_app' | 'email', value: boolean) => void;
}

export function PreferencesTable({ preferences, pendingKeys, onToggle }: PreferencesTableProps) {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" role="table" aria-label="Настройки уведомлений">
        <thead>
          <tr className="border-b border-default">
            <th
              scope="col"
              className="py-3 pr-6 text-left text-xs font-medium uppercase tracking-wider text-secondary"
            >
              Тип уведомления
            </th>
            <th
              scope="col"
              className="py-3 px-6 text-center text-xs font-medium uppercase tracking-wider text-secondary"
            >{t('common.inApp')}</th>
            <th
              scope="col"
              className="py-3 pl-6 text-center text-xs font-medium uppercase tracking-wider text-secondary"
            >
              Email
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--border)]/50">
          {ALL_TYPES.map((type) => {
            const entry = preferences[type];
            const inAppKey = `${type}:in_app`;
            const emailKey = `${type}:email`;
            return (
              <tr key={type} className="hover:bg-hover/30 transition-colors">
                <td className="py-3 pr-6 text-secondary">
                  {NOTIFICATION_LABELS[type]}
                </td>
                <td className="py-3 px-6 text-center">
                  <div className="flex justify-center">
                    <Toggle
                      checked={entry?.in_app ?? false}
                      onChange={(v) => onToggle(type, 'in_app', v)}
                      disabled={pendingKeys.has(inAppKey)}
                    />
                  </div>
                </td>
                <td className="py-3 pl-6 text-center">
                  <div className="flex justify-center">
                    {EMAIL_SUPPORTED_TYPES.has(type) ? (
                      <Toggle
                        checked={entry?.email ?? false}
                        onChange={(v) => onToggle(type, 'email', v)}
                        disabled={pendingKeys.has(emailKey)}
                      />
                    ) : (
                      <span className="text-muted text-xs select-none">—</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
