import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { CrmColumn } from '@/shared/types';

export interface ColumnHeaderMenuProps {
  column: CrmColumn;
  onEdit: () => void;
  onDelete: () => void;
}

export function ColumnHeaderMenu({ column, onEdit, onDelete }: ColumnHeaderMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-1 rounded text-muted hover:text-secondary hover:bg-hover focus:outline-none focus:ring-1 focus:ring-gray-600 transition-colors"
        aria-label={`Действия с колонкой ${column.name}`}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <MoreHorizontal size={14} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-default bg-surface shadow-xl z-20 py-1"
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-hover transition-colors"
          >
            <Pencil size={13} />{t('common.edit')}</button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-danger hover:bg-danger-subtle transition-colors"
          >
            <Trash2 size={13} />{t('common.delete')}</button>
        </div>
      )}
    </div>
  );
}
