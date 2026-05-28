import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

export interface AddColumnButtonProps {
  onClick: () => void;
}

export function AddColumnButton({ onClick }: AddColumnButtonProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 w-72 shrink-0 rounded-xl border border-dashed border-default',
        'px-4 py-3 text-sm font-medium text-muted hover:text-secondary hover:border-gray-500',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        'min-h-[200px] justify-center flex-col',
      )}
      aria-label={t('common.addColumn')}
    >
      <Plus size={20} />
      <span>{t('common.addColumn')}</span>
    </button>
  );
}
