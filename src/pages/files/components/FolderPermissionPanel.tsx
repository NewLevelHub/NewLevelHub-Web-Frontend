import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, Trash2, X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { CompanyDirectoryMember, FolderPermission, FolderPermissionLevel, StorageFolder } from '@/shared/types';

interface FolderPermissionPanelProps {
  folder: StorageFolder;
  permissions: FolderPermission[];
  isLoading: boolean;
  permError: string | null;
  permSearch: string;
  filteredPermMembers: CompanyDirectoryMember[];
  isAddPending: boolean;
  isUpdatePending: boolean;
  isRemovePending: boolean;
  onClose: () => void;
  onAdd: (userId: number, permission: FolderPermissionLevel) => void;
  onUpdate: (permId: number, permission: FolderPermissionLevel) => void;
  onRemove: (permId: number) => void;
  onSearchChange: (q: string) => void;
}

const PERM_LEVELS: FolderPermissionLevel[] = ['view', 'upload', 'full'];

const PERM_LABEL_KEYS: Record<FolderPermissionLevel, string> = {
  view: 'files.folderPerm_view',
  upload: 'files.folderPerm_upload',
  full: 'files.folderPerm_full',
};

export function FolderPermissionPanel({
  folder,
  permissions,
  isLoading,
  permError,
  permSearch,
  filteredPermMembers,
  isAddPending,
  isUpdatePending,
  isRemovePending,
  onClose,
  onAdd,
  onUpdate,
  onRemove,
  onSearchChange,
}: FolderPermissionPanelProps) {
  const { t } = useTranslation();
  const [selectedLevel, setSelectedLevel] = useState<FolderPermissionLevel>('view');

  return (
    <div className="rounded-xl border border-default bg-surface p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Lock size={15} className="text-[var(--brand)]" />
          <span className="text-[14px] font-semibold text-primary">{t('files.folderAccessTitle')}</span>
          <span className="text-[13px] text-muted truncate max-w-[180px]">— {folder.name}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-muted hover:text-primary hover:bg-hover transition-colors"
          aria-label={t('common.close')}
        >
          <X size={14} />
        </button>
      </div>

      {/* Current access */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          {t('files.currentAccess')}
        </p>

        {isLoading && (
          <p className="text-sm text-muted">{t('common.loading')}</p>
        )}

        {!isLoading && permissions.length === 0 && (
          <p className="text-sm text-muted">{t('files.noFolderPerms')}</p>
        )}

        {permissions.map((perm) => (
          <div
            key={perm.id}
            className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-default px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              {perm.user_name ? (
                <p className="text-[13px] font-medium text-primary truncate">{perm.user_name}</p>
              ) : (
                <p className="text-[13px] font-medium text-primary">
                  {t('files.rolePermission')}: {perm.role}
                </p>
              )}
            </div>

            <select
              value={perm.permission}
              onChange={(e) => onUpdate(perm.id, e.target.value as FolderPermissionLevel)}
              disabled={isUpdatePending}
              className="h-7 rounded-[var(--radius-sm)] border border-default bg-surface px-2 text-[12px] text-secondary focus:outline-none focus:border-[var(--brand)] disabled:opacity-50"
            >
              {PERM_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>{t(PERM_LABEL_KEYS[lvl])}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => onRemove(perm.id)}
              disabled={isRemovePending}
              className="shrink-0 rounded p-1 text-muted hover:text-danger hover:bg-danger-subtle transition-colors disabled:opacity-50"
              aria-label={t('files.revoke')}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* Add access */}
      <div className="space-y-2 border-t border-default pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          {t('files.addAccess')}
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder={t('files.searchEmployees')}
            value={permSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 flex-1 rounded-[var(--radius-sm)] border border-default bg-surface px-3 text-[13px] text-primary placeholder-muted focus:outline-none focus:border-[var(--brand)]"
          />
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value as FolderPermissionLevel)}
            className="h-8 rounded-[var(--radius-sm)] border border-default bg-surface px-2 text-[12px] text-secondary focus:outline-none focus:border-[var(--brand)]"
          >
            {PERM_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>{t(PERM_LABEL_KEYS[lvl])}</option>
            ))}
          </select>
        </div>

        {filteredPermMembers.length === 0 && permSearch.trim() !== '' && (
          <p className="text-[12px] text-muted">{t('files.noMembersFound')}</p>
        )}

        {filteredPermMembers.length > 0 && (
          <ul className="max-h-44 overflow-y-auto space-y-1">
            {filteredPermMembers.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 hover:bg-hover"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-primary truncate">{member.full_name}</p>
                  <p className="text-[11px] text-muted truncate">{member.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onAdd(member.id, selectedLevel)}
                  disabled={isAddPending}
                  className={cn(
                    'shrink-0 h-6 px-2.5 rounded-[var(--radius-sm)] text-[11px] font-medium transition-colors',
                    'bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] disabled:opacity-50',
                  )}
                >
                  {t('files.grantBtn')}
                </button>
              </li>
            ))}
          </ul>
        )}

        {permError && (
          <p className="text-[12px] text-danger-badge">{permError}</p>
        )}
      </div>
    </div>
  );
}
