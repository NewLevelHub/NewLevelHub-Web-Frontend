import { Link } from 'react-router';
import { XCircle } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

export default function UnsubscribeInvalidPage() {
  return (
    <div className={cn('flex flex-col items-center text-center gap-6')}>
      <XCircle className="w-16 h-16 text-red-400" aria-hidden="true" />
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-white">Ссылка недействительна</h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          Ссылка для отписки устарела или недействительна. Попробуйте ещё раз через настройки
          уведомлений в личном кабинете.
        </p>
      </div>
      <Link
        to="/"
        className={cn(
          'inline-flex items-center justify-center px-6 py-2.5 rounded-lg',
          'bg-white text-gray-900 font-medium text-sm',
          'hover:bg-gray-100 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-950'
        )}
      >
        Перейти на главную
      </Link>
    </div>
  );
}
