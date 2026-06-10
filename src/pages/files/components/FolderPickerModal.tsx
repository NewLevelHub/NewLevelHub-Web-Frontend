import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Folder, X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { StorageFile, StorageFolder } from '@/shared/types';
import type { StorageScope } from '@/pages/files/types';
import { useFolderPicker } from '@/pages/files/hooks/useFolderPicker';

function buildFolderPath(folder: StorageFolder, byId: Map<number, StorageFolder>): string {
  const parts: string[] = [folder.name];
  let current = folder;
  while (current.parent !== null) {
    const parent = byId.get(current.parent);
    if (!parent) break;
    parts.unshift(parent.name);
    current = parent;
  }
  return parts.join(' / ');
}

interface FolderPickerModalProps {
  file: StorageFile;
  scope: StorageScope;
  onConfirm: (folderId: number | null) => void;
  onClose: () => void;
  isPending: boolean;
}

function FolderPickerSkeleton() {
  return (
    <div className="space-y-1.5 py-1">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-9 rounded-[var(--radius-sm)] bg-raised animate-pulse" />
      ))}
    </div>
  );
}

export function FolderPickerModal({ file, scope, onConfirm, onClose, isPending }: FolderPickerModalProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<number | null | undefined>(undefined);

  const foldersQuery = useFolderPicker(scope);

  const folders = foldersQuery.data ?? [];

  const folderById = useMemo(
    () => new Map(folders.map((f) => [f.id, f])),
    [folders],
  );

  const sortedFolders = useMemo(
    () => [...folders].sort((a, b) =>
      buildFolderPath(a, folderById).localeCompare(buildFolderPath(b, folderById), undefined, { sensitivity: 'base' })
    ),
    [folders, folderById],
  );

  // selected === undefined means nothing chosen yet; null means root
  const effectiveDest = selected === undefined ? file.folder : selected;
  const isAlreadyHere = effectiveDest === file.folder;
  const canConfirm = !isPending && selected !== undefined && !isAlreadyHere;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-surface border border-default shadow-[var(--shadow-pop)] flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-faint)]">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-primary">{t('files.moveTo')}</p>
            <p className="text-[12px] text-muted truncate max-w-[240px]">{file.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 ml-3 rounded-lg p-1.5 text-muted hover:text-primary hover:bg-hover transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Folder list */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {foldersQuery.isLoading ? (
            <FolderPickerSkeleton />
          ) : (
            <div className="space-y-0.5">
              {/* Root option */}
              <button
                type="button"
                onClick={() => setSelected(null)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2.5 text-[13px] transition-colors text-left',
                  selected === null
                    ? 'bg-brand-subtle text-brand font-medium'
                    : 'text-secondary hover:bg-hover',
                  file.folder === null && selected === undefined && 'opacity-50 cursor-default',
                )}
                disabled={file.folder === null && selected === undefined}
              >
                <Folder size={14} className="shrink-0" />
                <span>{t('files.rootFolder')}</span>
                {file.folder === null && (
                  <span className="ml-auto text-[11px] text-muted">{t('files.alreadyInFolder')}</span>
                )}
              </button>

              {sortedFolders.length === 0 && !foldersQuery.isLoading ? null : (
                sortedFolders.map((folder) => {
                  const isCurrent = folder.id === file.folder;
                  const isViewOnly = folder.user_permission === 'view';
                  const isDisabled = (isCurrent && selected === undefined) || isViewOnly;
                  const isSelected = selected === folder.id;
                  const path = buildFolderPath(folder, folderById);
                  return (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => !isDisabled && setSelected(folder.id)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2.5 text-[13px] transition-colors text-left',
                        isSelected
                          ? 'bg-brand-subtle text-brand font-medium'
                          : 'text-secondary hover:bg-hover',
                        isDisabled && 'opacity-50 cursor-default',
                      )}
                      disabled={isDisabled}
                    >
                      <Folder size={14} className="shrink-0" />
                      <span className="truncate">{path}</span>
                      {isCurrent && !isViewOnly && (
                        <span className="ml-auto shrink-0 text-[11px] text-muted">{t('files.alreadyInFolder')}</span>
                      )}
                      {isViewOnly && (
                        <span className="ml-auto shrink-0 text-[11px] text-muted">{t('files.viewOnlyAccess')}</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--border-faint)]">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="h-8 px-4 rounded-[var(--radius-sm)] border border-default bg-surface text-[13px] font-medium text-secondary hover:bg-hover transition-colors disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => canConfirm && onConfirm(selected as number | null)}
            disabled={!canConfirm}
            className="h-8 px-4 rounded-[var(--radius-sm)] bg-[var(--brand)] text-white text-[13px] font-medium hover:bg-[var(--brand-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isPending && (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
            {t('files.moveHere')}
          </button>
        </div>
      </div>
    </div>
  );
}
