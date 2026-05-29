import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { CheckCircle } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

export default function UnsubscribeSuccessPage() {
  const { t } = useTranslation();
  return (
    <div className={cn('flex flex-col items-center text-center gap-6')}>
      <CheckCircle className="w-16 h-16 text-green-400" aria-hidden="true" />
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-primary">Вы успешно отписались</h2>
        <p className="text-secondary text-sm leading-relaxed">
          Вы больше не будете получать email-уведомления. Вы можете изменить настройки
          уведомлений в личном кабинете.
        </p>
      </div>
      <Link
        to="/"
        className={cn(
          'inline-flex items-center justify-center px-6 py-2.5 rounded-lg',
          'bg-surface text-primary font-medium text-sm',
          'hover:bg-gray-100 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-950'
        )}
      >
        Перейти на главную
      </Link>
    </div>
  );
}
