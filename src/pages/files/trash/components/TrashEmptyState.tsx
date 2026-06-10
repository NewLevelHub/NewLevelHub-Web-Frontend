import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';

export function TrashEmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bg-muted)]">
        <Trash2 size={26} className="text-muted" />
      </div>
      <p className="text-sm font-medium text-primary">{t('trash.empty')}</p>
      <p className="mt-1 text-xs text-muted">{t('trash.emptyHint')}</p>
    </div>
  );
}
