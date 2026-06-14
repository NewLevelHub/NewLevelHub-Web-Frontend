import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Folder, HardDrive, Loader2, Search, X } from 'lucide-react';
import { API } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import { useAuth } from '@/shared/hooks/useAuth';
import { cn } from '@/shared/lib/cn';
import type { PaginatedResponse, StorageFile, StorageFolder, StorageFolderDetail } from '@/shared/types';

type StorageScope = 'personal' | 'company';

const CRM_ATTACHMENT_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
]);

const CRM_ATTACHMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png',
  'image/jpeg',
  'image/gif',
]);

const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;

function getFileExtension(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return ext ? `.${ext}` : '';
}

export function isCrmAttachmentAllowed(file: StorageFile): boolean {
  const ext = getFileExtension(file.name);
  if (CRM_ATTACHMENT_EXTENSIONS.has(ext)) return true;
  const mime = file.content_type ?? file.mime_type ?? '';
  return CRM_ATTACHMENT_MIME_TYPES.has(mime);
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

interface StorageFilePickerModalProps {
  onClose: () => void;
  onSelect: (fileId: number) => void;
  isAttaching?: boolean;
}

export function StorageFilePickerModal({ onClose, onSelect, isAttaching = false }: StorageFilePickerModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [scope, setScope] = useState<StorageScope>('personal');
  const [trail, setTrail] = useState<StorageFolder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  const currentFolder = trail.length > 0 ? trail[trail.length - 1] : null;
  const normalizedSearchTerm = searchTerm.trim();
  const isSearching = normalizedSearchTerm.length > 0;

  const rootFoldersQuery = useQuery({
    queryKey: ['storage', 'folders', scope, 'root', 'picker'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<StorageFolder>>(API.storage.folders, {
        params: { scope, parent_id: 'null' },
      });
      return data;
    },
    enabled: currentFolder === null && !isSearching,
  });

  const folderDetailQuery = useQuery({
    queryKey: ['storage', 'folder', currentFolder?.id, 'picker'],
    queryFn: async () => {
      const { data } = await apiClient.get<StorageFolderDetail>(
        API.storage.folder(String(currentFolder?.id)),
      );
      return data;
    },
    enabled: currentFolder !== null && !isSearching,
  });

  const searchedFilesQuery = useQuery({
    queryKey: ['storage', 'files-search', normalizedSearchTerm, scope, 'picker'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<StorageFile>>(API.storage.files, {
        params: { search: normalizedSearchTerm, scope, ordering: 'name', page_size: 100 },
      });
      return data;
    },
    enabled: isSearching,
  });

  const rootFilesQuery = useQuery({
    queryKey: ['storage', 'files-root', scope, 'picker'],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<PaginatedResponse<StorageFile>>(API.storage.files, {
          params: { folder_id: 'null', scope, page_size: 100, ordering: '-created_at' },
        });
        return data;
      } catch {
        const { data } = await apiClient.get<PaginatedResponse<StorageFile>>(API.storage.files, {
          params: { scope, page_size: 100, ordering: '-created_at' },
        });
        return { ...data, results: (data.results ?? []).filter((file) => file.folder === null) };
      }
    },
    enabled: currentFolder === null && !isSearching,
  });

  const folders = useMemo<StorageFolder[]>(() => {
    if (isSearching) return [];
    if (currentFolder) return folderDetailQuery.data?.folders ?? [];
    return rootFoldersQuery.data?.results ?? [];
  }, [currentFolder, folderDetailQuery.data?.folders, isSearching, rootFoldersQuery.data?.results]);

  const files = useMemo<StorageFile[]>(() => {
    let result: StorageFile[];
    if (isSearching) result = searchedFilesQuery.data?.results ?? [];
    else if (!currentFolder) result = rootFilesQuery.data?.results ?? [];
    else result = folderDetailQuery.data?.files ?? [];

    if (scope === 'personal' && user?.id !== undefined) {
      result = result.filter((file) => file.owner === user.id);
    }

    return result;
  }, [
    currentFolder,
    folderDetailQuery.data?.files,
    isSearching,
    rootFilesQuery.data?.results,
    searchedFilesQuery.data?.results,
    scope,
    user?.id,
  ]);

  const isLoading =
    (isSearching && searchedFilesQuery.isLoading) ||
    (!isSearching &&
      (currentFolder ? folderDetailQuery.isLoading : rootFoldersQuery.isLoading || rootFilesQuery.isLoading));

  const isError =
    (isSearching && searchedFilesQuery.isError) ||
    (!isSearching && (currentFolder ? folderDetailQuery.isError : rootFoldersQuery.isError || rootFilesQuery.isError));

  const handleScopeChange = (nextScope: StorageScope) => {
    setScope(nextScope);
    setTrail([]);
    setSearchTerm('');
    setSelectedFileId(null);
    setSelectionError(null);
  };

  const openFolder = (folder: StorageFolder) => {
    setTrail((prev) => [...prev, folder]);
    setSelectedFileId(null);
    setSelectionError(null);
  };

  const goToTrailIndex = (index: number) => {
    setTrail((prev) => prev.slice(0, index + 1));
    setSelectedFileId(null);
    setSelectionError(null);
  };

  const handleFileSelect = (file: StorageFile) => {
    const size = file.file_size ?? file.size ?? 0;
    if (!isCrmAttachmentAllowed(file)) {
      setSelectedFileId(null);
      setSelectionError(t('crm.attachmentFileTypeNotSupported'));
      return;
    }
    if (size > MAX_ATTACHMENT_BYTES) {
      setSelectedFileId(null);
      setSelectionError(t('crm.attachmentFileTooLarge'));
      return;
    }
    setSelectionError(null);
    setSelectedFileId(file.id);
  };

  const handleAttach = () => {
    if (selectedFileId === null || isAttaching) return;
    onSelect(selectedFileId);
  };

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && !isAttaching) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
      onMouseDown={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="storage-file-picker-title"
    >
      <div className="flex w-full max-w-lg flex-col rounded-xl border border-default bg-surface shadow-2xl max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-default px-5 py-4">
          <h2 id="storage-file-picker-title" className="flex items-center gap-2 text-base font-semibold text-primary">
            <HardDrive size={16} />
            {t('crm.storagePickerTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isAttaching}
            className="rounded-md p-1 text-secondary transition-colors hover:bg-hover hover:text-primary disabled:opacity-50"
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 border-b border-default px-5 py-3">
          <div className="flex gap-2">
            {(['personal', 'company'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleScopeChange(tab)}
                disabled={isAttaching}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  scope === tab
                    ? 'bg-blue-600 text-white'
                    : 'bg-raised text-secondary hover:text-primary',
                )}
              >
                {tab === 'personal' ? t('files.personal') : t('files.companyStorage')}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setSelectedFileId(null);
                setSelectionError(null);
              }}
              placeholder={t('files.searchFilesPlaceholder')}
              className="w-full rounded-lg border border-default bg-raised py-2 pl-9 pr-3 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {!isSearching && trail.length > 0 && (
            <nav className="flex flex-wrap items-center gap-1 text-xs text-muted" aria-label={t('files.root')}>
              <button
                type="button"
                onClick={() => {
                  setTrail([]);
                  setSelectedFileId(null);
                  setSelectionError(null);
                }}
                className="hover:text-secondary"
              >
                {t('files.root')}
              </button>
              {trail.map((folder, index) => (
                <span key={folder.id} className="flex items-center gap-1">
                  <ChevronRight size={12} />
                  <button
                    type="button"
                    onClick={() => goToTrailIndex(index)}
                    className="hover:text-secondary"
                  >
                    {folder.name}
                  </button>
                </span>
              ))}
            </nav>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-10 text-muted">
              <Loader2 size={20} className="animate-spin" />
            </div>
          )}

          {isError && (
            <p className="text-sm text-red-400">{t('files.loadError')}</p>
          )}

          {!isLoading && !isError && (
            <>
              {!isSearching && folders.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">{t('files.foldersSection')}</p>
                  <ul className="space-y-1">
                    {folders.map((folder) => (
                      <li key={folder.id}>
                        <button
                          type="button"
                          onClick={() => openFolder(folder)}
                          disabled={isAttaching}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-secondary transition-colors hover:bg-hover hover:text-primary disabled:opacity-50"
                        >
                          <Folder size={16} className="shrink-0 text-amber-500" />
                          <span className="truncate">{folder.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">{t('files.filesSection')}</p>
                {files.length === 0 ? (
                  <p className="text-sm text-muted">
                    {isSearching
                      ? t('files.noFilesSearch')
                      : currentFolder
                        ? t('files.noFilesFolder')
                        : t('files.noFilesRoot')}
                  </p>
                ) : (
                  <ul className="space-y-1" role="listbox" aria-label={t('files.filesSection')}>
                    {files.map((file) => {
                      const allowed = isCrmAttachmentAllowed(file);
                      const size = file.file_size ?? file.size ?? 0;
                      const tooLarge = size > MAX_ATTACHMENT_BYTES;
                      const isSelected = selectedFileId === file.id;
                      const isDisabled = !allowed || tooLarge;

                      return (
                        <li key={file.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => handleFileSelect(file)}
                            disabled={isAttaching || isDisabled}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors',
                              isSelected
                                ? 'bg-blue-600/15 ring-1 ring-blue-500'
                                : 'hover:bg-hover',
                              isDisabled && 'cursor-not-allowed opacity-50',
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-primary">{file.name}</p>
                              <p className="text-xs text-muted">{formatFileSize(size)}</p>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          )}

          {selectionError && <p className="text-xs text-red-400">{selectionError}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-default px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isAttaching}
            className="rounded-lg px-3 py-2 text-sm text-secondary transition-colors hover:bg-hover hover:text-primary disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleAttach}
            disabled={selectedFileId === null || isAttaching}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors',
              'hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {isAttaching && <Loader2 size={14} className="animate-spin" />}
            {isAttaching ? t('common.loading') : t('crm.storagePickerAttach')}
          </button>
        </div>
      </div>
    </div>
  );
}
