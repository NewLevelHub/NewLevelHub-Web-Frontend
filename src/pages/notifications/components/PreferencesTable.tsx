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
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" role="table" aria-label="Настройки уведомлений">
        <thead>
          <tr className="border-b border-gray-700">
            <th
              scope="col"
              className="py-3 pr-6 text-left text-xs font-medium uppercase tracking-wider text-gray-400"
            >
              Тип уведомления
            </th>
            <th
              scope="col"
              className="py-3 px-6 text-center text-xs font-medium uppercase tracking-wider text-gray-400"
            >
              В приложении
            </th>
            <th
              scope="col"
              className="py-3 pl-6 text-center text-xs font-medium uppercase tracking-wider text-gray-400"
            >
              Email
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700/50">
          {ALL_TYPES.map((type) => {
            const entry = preferences[type];
            const inAppKey = `${type}:in_app`;
            const emailKey = `${type}:email`;
            return (
              <tr key={type} className="hover:bg-gray-700/30 transition-colors">
                <td className="py-3 pr-6 text-gray-300">
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
                      <span className="text-gray-600 text-xs select-none">—</span>
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
