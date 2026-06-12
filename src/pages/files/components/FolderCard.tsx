import { memo, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Clock, Folder, Lock, MoreVertical, Pencil, Shield, Trash2 } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { StorageFolder } from '@/shared/types';
import { relativeDate } from '@/pages/files/utils/fileBrowserUtils';

interface FolderCardProps {
  folder: StorageFolder;
  isMenuOpen: boolean;
  canManage: boolean;
  isAdmin: boolean;
  lang: string;
  onOpen: (folder: StorageFolder) => void;
  onMenuToggle: (id: number | null) => void;
  onRename: (folder: StorageFolder) => void;
  onDelete: (folder: StorageFolder) => void;
  onManageAccess: (folder: StorageFolder) => void;
}

export const FolderCard = memo(function FolderCard({
  folder,
  isMenuOpen,
  canManage,
  isAdmin,
  lang,
  onOpen,
  onMenuToggle,
  onRename,
  onDelete,
  onManageAccess,
}: FolderCardProps) {
  const { t } = useTranslation();
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const [menuStyle, setMenuStyle] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  useEffect(() => {
    if (isMenuOpen && menuBtnRef.current) {
      const rect = menuBtnRef.current.getBoundingClientRect();
      setMenuStyle({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
  }, [isMenuOpen]);

  return (
    <div
      onClick={() => onOpen(folder)}
      className={cn(
        'bg-surface border border-default rounded-xl p-3 flex flex-col gap-1.5 cursor-pointer transition-all duration-150',
        isMenuOpen
          ? '-translate-y-px shadow-[0_6px_18px_rgba(0,0,0,0.06)]'
          : 'hover:-translate-y-px hover:shadow-[0_6px_18px_rgba(0,0,0,0.06)]',
      )}
    >
      <div className="flex items-start justify-between">
        <div className="relative">
          <Folder
            size={22}
            style={{
              color: 'var(--brand)',
              fill: 'color-mix(in srgb, var(--brand) 22%, transparent)',
            }}
          />
          {folder.files_count > 0 && (
            <span className="absolute -top-2 -left-1.5 text-[9px] font-bold font-mono bg-surface border border-default rounded-[4px] px-[3px] py-px text-primary leading-none">
              {folder.files_count}
            </span>
          )}
          {folder.is_restricted && (
            <span className="absolute -bottom-1.5 -right-1.5 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[var(--brand)] text-white">
              <Lock size={8} />
            </span>
          )}
        </div>

        {canManage && (
          <div>
            <button
              ref={menuBtnRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMenuToggle(isMenuOpen ? null : folder.id);
              }}
              className="rounded-[5px] p-0.5 text-muted hover:bg-raised hover:text-primary transition-colors"
            >
              <MoreVertical size={13} />
            </button>

            {isMenuOpen && createPortal(
              <div
                style={{ top: menuStyle.top, right: menuStyle.right }}
                className="fixed z-50 w-52 bg-surface border border-default rounded-xl shadow-[var(--shadow-pop)] py-1"
              >
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRename(folder); onMenuToggle(null); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-secondary hover:bg-hover whitespace-nowrap"
                >
                  <Pencil size={13} /> {t('files.rename')}
                </button>
                {isAdmin && folder.scope === 'company' && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onManageAccess(folder); onMenuToggle(null); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-secondary hover:bg-hover whitespace-nowrap"
                  >
                    <Shield size={13} /> {t('files.manageAccess')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDelete(folder); onMenuToggle(null); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-danger hover:bg-hover whitespace-nowrap border-t border-[var(--border-faint)] mt-1 pt-2.5"
                >
                  <Trash2 size={13} /> {t('common.delete')}
                </button>
              </div>,
              document.body,
            )}
          </div>
        )}
      </div>

      <div className="text-[12.5px] font-semibold text-primary leading-snug truncate">
        {folder.name}
      </div>
      <div className="flex items-center gap-1 text-[11px] text-muted">
        <Clock size={10} />
        <span className="truncate">{relativeDate(folder.updated_at, lang)}</span>
        {folder.is_restricted && (
          <span className="ml-auto text-[10px] font-medium text-[var(--brand)] bg-brand-subtle px-1.5 py-0.5 rounded-[3px] leading-none">
            {t('files.folderRestricted')}
          </span>
        )}
      </div>
    </div>
  );
});
