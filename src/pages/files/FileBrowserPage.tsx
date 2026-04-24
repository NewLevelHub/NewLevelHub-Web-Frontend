import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { useAuth } from '@/shared/hooks/useAuth';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import type {
  CompanyDirectoryMember,
  PaginatedResponse,
  StorageFile,
  StorageFileShare,
  StorageFolder,
  StorageFolderDetail,
  StorageSharePermission,
  StorageUsage,
} from '@/shared/types';

type StorageScope = 'personal' | 'company';
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const STORAGE_SHARE_PERMISSIONS: StorageSharePermission[] = ['view', 'download', 'full'];
const STORAGE_SHARE_PERMISSION_LABEL: Record<StorageSharePermission, string> = {
  view: 'Только просмотр',
  download: 'Просмотр и скачивание',
  full: 'Полный доступ',
};

function formatFileSize(size: number) {
  if (size <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = size;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export default function FileBrowserPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<StorageScope>('personal');
  const [searchTerm, setSearchTerm] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [shareTargetUserId, setShareTargetUserId] = useState('');
  const [sharePermission, setSharePermission] = useState<StorageSharePermission>('view');
  const [selectedShareFileId, setSelectedShareFileId] = useState<number | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [openedSharedFile, setOpenedSharedFile] = useState<StorageFile | null>(null);
  const [trail, setTrail] = useState<StorageFolder[]>([]);
  const currentFolder = trail.length > 0 ? trail[trail.length - 1] : null;
  const normalizedSearchTerm = searchTerm.trim();
  const isSearching = normalizedSearchTerm.length > 0;

  const refreshStorageData = () => {
    queryClient.invalidateQueries({ queryKey: ['storage', 'folders', scope, 'root'] });
    queryClient.invalidateQueries({ queryKey: ['storage', 'files-root', scope] });
    queryClient.invalidateQueries({ queryKey: ['storage', 'files-search'] });
    queryClient.invalidateQueries({ queryKey: ['storage', 'usage'] });
    queryClient.invalidateQueries({ queryKey: ['storage', 'shares', 'shared-with-me'] });
    if (selectedShareFileId !== null) {
      queryClient.invalidateQueries({ queryKey: ['storage', 'shares', 'file', selectedShareFileId] });
    }
    if (currentFolder) {
      queryClient.invalidateQueries({ queryKey: ['storage', 'folder', currentFolder.id] });
    }
    if (user?.company_id) {
      queryClient.invalidateQueries({ queryKey: ['company-limits', String(user.company_id)] });
      queryClient.invalidateQueries({ queryKey: ['company', String(user.company_id)] });
    }
  };

  const rootFoldersQuery = useQuery({
    queryKey: ['storage', 'folders', scope, 'root'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<StorageFolder>>(API.storage.folders, {
        params: { scope, parent_id: 'null' },
      });
      return data;
    },
    enabled: currentFolder === null,
  });

  const folderDetailQuery = useQuery({
    queryKey: ['storage', 'folder', currentFolder?.id],
    queryFn: async () => {
      const { data } = await apiClient.get<StorageFolderDetail>(
        API.storage.folder(String(currentFolder?.id)),
      );
      return data;
    },
    enabled: currentFolder !== null,
  });

  const searchedFilesQuery = useQuery({
    queryKey: ['storage', 'files-search', normalizedSearchTerm],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<StorageFile>>(API.storage.files, {
        params: {
          search: normalizedSearchTerm,
          ordering: 'name',
          page_size: 100,
        },
      });
      return data;
    },
    enabled: isSearching,
  });

  const rootFilesQuery = useQuery({
    queryKey: ['storage', 'files-root', scope],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<PaginatedResponse<StorageFile>>(API.storage.files, {
          params: {
            folder_id: 'null',
            scope,
            page_size: 100,
            ordering: '-created_at',
          },
        });
        return data;
      } catch {
        // Fallback for backends that don't support folder_id=null yet.
        const { data } = await apiClient.get<PaginatedResponse<StorageFile>>(API.storage.files, {
          params: {
            scope,
            page_size: 100,
            ordering: '-created_at',
          },
        });
        return {
          ...data,
          results: (data.results ?? []).filter((file) => file.folder === null),
        };
      }
    },
    enabled: currentFolder === null && !isSearching,
  });

  const storageUsageQuery = useQuery({
    queryKey: ['storage', 'usage'],
    queryFn: async () => {
      const { data } = await apiClient.get<StorageUsage>(API.storage.usage);
      return data;
    },
  });

  const companyMembersQuery = useQuery({
    queryKey: ['company-directory', user?.company_id],
    queryFn: async () => {
      if (!user?.company_id) return null;
      const { data } = await apiClient.get<PaginatedResponse<CompanyDirectoryMember>>(
        API.companies.directory(String(user.company_id)),
        {
          params: { page_size: 200, ordering: 'full_name' },
        },
      );
      return data;
    },
    enabled: Boolean(user?.company_id),
  });

  const fileSharesQuery = useQuery({
    queryKey: ['storage', 'shares', 'file', selectedShareFileId],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<StorageFileShare>>(
        API.storage.fileShares(String(selectedShareFileId)),
      );
      return data;
    },
    enabled: selectedShareFileId !== null,
  });

  const sharedWithMeQuery = useQuery({
    queryKey: ['storage', 'shares', 'shared-with-me'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<StorageFileShare>>(API.storage.shares, {
        params: { shared_with_me: true, page_size: 200 },
      });
      return data;
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: newFolderName.trim(),
        parent_id: currentFolder?.id ?? null,
        is_company_shared: scope === 'company',
      };
      await apiClient.post(API.storage.folders, payload);
    },
    onSuccess: () => {
      setNewFolderName('');
      refreshStorageData();
    },
  });

  const renameFolderMutation = useMutation({
    mutationFn: async ({ folderId, name }: { folderId: number; name: string }) => {
      await apiClient.patch(API.storage.folder(String(folderId)), { name });
    },
    onSuccess: () => {
      refreshStorageData();
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: number) => {
      await apiClient.delete(API.storage.folder(String(folderId)));
    },
    onSuccess: (_, folderId) => {
      if (currentFolder?.id === folderId) {
        setTrail([]);
      } else {
        refreshStorageData();
      }
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('name', file.name);
      form.append('file', file);
      if (currentFolder) {
        form.append('folder_id', String(currentFolder.id));
      } else {
        form.append('is_company_shared', scope === 'company' ? 'true' : 'false');
      }
      const { data } = await apiClient.post<StorageFile>(API.storage.files, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (createdFile) => {
      setUploadFile(null);
      setUploadError(null);
      setUploadSuccess(`Файл "${createdFile.name}" успешно загружен.`);

      if (currentFolder === null && createdFile.folder === null) {
        queryClient.setQueryData<PaginatedResponse<StorageFile>>(
          ['storage', 'files-root', scope],
          (prev) => {
            if (!prev) {
              return {
                count: 1,
                next: null,
                previous: null,
                results: [createdFile],
              };
            }

            const alreadyExists = prev.results.some((item) => item.id === createdFile.id);
            if (alreadyExists) return prev;

            return {
              ...prev,
              count: prev.count + 1,
              results: [createdFile, ...prev.results],
            };
          },
        );
      }

      refreshStorageData();
    },
    onError: (error) => {
      setUploadSuccess(null);
      setUploadError(getApiErrorMessage(error, 'Не удалось загрузить файл'));
    },
  });

  const renameFileMutation = useMutation({
    mutationFn: async ({ fileId, name }: { fileId: number; name: string }) => {
      await apiClient.patch(API.storage.file(String(fileId)), { name });
    },
    onSuccess: () => {
      refreshStorageData();
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      await apiClient.delete(API.storage.file(String(fileId)));
    },
    onSuccess: () => {
      refreshStorageData();
    },
  });

  const downloadFileMutation = useMutation({
    mutationFn: async ({ id, name, mimeType }: { id: number; name: string; mimeType?: string }) => {
      const response = await apiClient.get(API.storage.fileDownload(String(id)), {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: mimeType ?? 'application/octet-stream',
      });
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
    },
  });

  const createShareMutation = useMutation({
    mutationFn: async () => {
      if (selectedShareFileId === null || !shareTargetUserId) return;
      await apiClient.post(API.storage.shares, {
        file_id: selectedShareFileId,
        shared_with_user_id: Number(shareTargetUserId),
        permission: sharePermission,
      });
    },
    onSuccess: () => {
      setShareError(null);
      setShareTargetUserId('');
      setSharePermission('view');
      refreshStorageData();
    },
    onError: (error) => {
      setShareError(getApiErrorMessage(error, 'Не удалось выдать доступ к файлу'));
    },
  });

  const updateSharePermissionMutation = useMutation({
    mutationFn: async ({ shareId, permission }: { shareId: number; permission: StorageSharePermission }) => {
      await apiClient.patch(API.storage.share(String(shareId)), { permission });
    },
    onSuccess: () => {
      refreshStorageData();
    },
  });

  const revokeShareMutation = useMutation({
    mutationFn: async (shareId: number) => {
      await apiClient.delete(API.storage.share(String(shareId)));
    },
    onSuccess: () => {
      refreshStorageData();
    },
  });

  const openSharedFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      const { data } = await apiClient.get<StorageFile>(API.storage.file(String(fileId)));
      return data;
    },
    onSuccess: (file) => {
      setOpenedSharedFile(file);
    },
  });

  const folders = useMemo<StorageFolder[]>(() => {
    if (currentFolder) return folderDetailQuery.data?.folders ?? [];
    return rootFoldersQuery.data?.results ?? [];
  }, [currentFolder, folderDetailQuery.data?.folders, rootFoldersQuery.data?.results]);

  const files = useMemo<StorageFile[]>(() => {
    if (isSearching) return searchedFilesQuery.data?.results ?? [];
    if (!currentFolder) return rootFilesQuery.data?.results ?? [];
    return folderDetailQuery.data?.files ?? [];
  }, [currentFolder, folderDetailQuery.data?.files, isSearching, rootFilesQuery.data?.results, searchedFilesQuery.data?.results]);

  const companyMembers = companyMembersQuery.data?.results ?? [];
  const recipientOptions = companyMembers.filter((member) => member.id !== user?.id);
  const fileShares = fileSharesQuery.data?.results ?? [];
  const sharedWithMe = sharedWithMeQuery.data?.results ?? [];
  const selectedShareFile = files.find((file) => file.id === selectedShareFileId) ?? null;

  const isLoading =
    rootFoldersQuery.isLoading || folderDetailQuery.isLoading || searchedFilesQuery.isLoading || rootFilesQuery.isLoading;
  const isError = rootFoldersQuery.isError || folderDetailQuery.isError || searchedFilesQuery.isError || rootFilesQuery.isError;

  const openFolder = (folder: StorageFolder) => {
    setTrail((prev) => [...prev, folder]);
  };

  const goToTrailIndex = (idx: number) => {
    setTrail((prev) => prev.slice(0, idx + 1));
  };

  const resetToRoot = () => setTrail([]);

  const handleRename = (folder: StorageFolder) => {
    const nextName = window.prompt('Новое имя папки', folder.name);
    if (!nextName || !nextName.trim() || nextName.trim() === folder.name) return;
    renameFolderMutation.mutate({ folderId: folder.id, name: nextName.trim() });
  };

  const handleDelete = (folder: StorageFolder) => {
    const ok = window.confirm(`Удалить папку "${folder.name}" со всем содержимым?`);
    if (!ok) return;
    deleteFolderMutation.mutate(folder.id);
  };

  const handleFileRename = (file: StorageFile) => {
    const nextName = window.prompt('Новое имя файла', file.name);
    if (!nextName || !nextName.trim() || nextName.trim() === file.name) return;
    renameFileMutation.mutate({ fileId: file.id, name: nextName.trim() });
  };

  const handleFileDelete = (file: StorageFile) => {
    const ok = window.confirm(`Удалить файл "${file.name}"?`);
    if (!ok) return;
    deleteFileMutation.mutate(file.id);
  };

  const handleSelectShareFile = (file: StorageFile) => {
    setSelectedShareFileId(file.id);
    setShareError(null);
  };

  const handleCreateShare = () => {
    if (selectedShareFileId === null || !shareTargetUserId) return;
    createShareMutation.mutate();
  };

  const handleSharePermissionChange = (shareId: number, permission: StorageSharePermission) => {
    updateSharePermissionMutation.mutate({ shareId, permission });
  };

  const handleRevokeShare = (shareId: number) => {
    const ok = window.confirm('Отозвать доступ к файлу у пользователя?');
    if (!ok) return;
    revokeShareMutation.mutate(shareId);
  };

  const handleFileUpload = () => {
    if (!uploadFile) return;
    setUploadError(null);
    setUploadSuccess(null);
    uploadFileMutation.mutate(uploadFile);
  };

  const handleUploadInputChange = (file: File | null) => {
    if (!file) {
      setUploadFile(null);
      setUploadError(null);
      setUploadSuccess(null);
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadFile(null);
      setUploadSuccess(null);
      setUploadError('Файл превышает лимит 100 MB. Выберите файл меньшего размера.');
      return;
    }
    setUploadError(null);
    setUploadFile(file);
  };

  const usedBytes = storageUsageQuery.data?.used_bytes ?? 0;
  const limitBytes = storageUsageQuery.data?.limit_bytes ?? 0;
  const usedPercent = storageUsageQuery.data?.used_percent ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Файловый менеджер</h1>
        <p className="mt-1 text-sm text-slate-400">Личное и общее хранилище с навигацией по папкам.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setScope('personal');
            setTrail([]);
          }}
          className={`rounded-md border px-3 py-1.5 text-sm ${
            scope === 'personal'
              ? 'border-indigo-600 bg-indigo-600 text-white'
              : 'border-slate-700 text-slate-300 bg-slate-800'
          }`}
        >
          Личное
        </button>
        <button
          type="button"
          onClick={() => {
            setScope('company');
            setTrail([]);
          }}
          className={`rounded-md border px-3 py-1.5 text-sm ${
            scope === 'company'
              ? 'border-indigo-600 bg-indigo-600 text-white'
              : 'border-slate-700 text-slate-300 bg-slate-800'
          }`}
        >
          Общее хранилище
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
        <button type="button" onClick={resetToRoot} className="text-indigo-300 hover:underline">
          Корень
        </button>
        {trail.map((folder, idx) => (
          <span key={folder.id} className="flex items-center gap-2">
            <span>/</span>
            <button type="button" onClick={() => goToTrailIndex(idx)} className="text-indigo-300 hover:underline">
              {folder.name}
            </button>
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          placeholder="Название новой папки"
          className="w-full max-w-sm rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
        />
        <button
          type="button"
          disabled={!newFolderName.trim() || createFolderMutation.isPending}
          onClick={() => createFolderMutation.mutate()}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Создать папку
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Поиск файлов по имени"
          className="w-full max-w-sm rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
        />
        {isSearching ? (
          <p className="text-xs text-slate-400">Поиск по всем доступным файлам ({files.length} найдено)</p>
        ) : (
          <p className="text-xs text-slate-400">Введите имя файла для поиска</p>
        )}
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <p className="font-medium text-slate-200">Использование хранилища</p>
          <p className="text-slate-300">
            {formatFileSize(usedBytes)} / {formatFileSize(limitBytes)}
          </p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all"
            style={{ width: `${Math.max(0, Math.min(100, usedPercent))}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          {storageUsageQuery.isError ? 'Не удалось обновить лимиты хранилища' : `${usedPercent.toFixed(1)}% использовано`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          onChange={(e) => handleUploadInputChange(e.target.files?.[0] ?? null)}
          className="w-full max-w-sm rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300"
        />
        <button
          type="button"
          disabled={!uploadFile || uploadFileMutation.isPending}
          onClick={handleFileUpload}
          className="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Загрузить файл
        </button>
        <p className="text-xs text-slate-400">Максимальный размер файла: 100 MB</p>
        {uploadSuccess ? <p className="w-full text-xs text-emerald-300">{uploadSuccess}</p> : null}
        {uploadError ? <p className="w-full text-xs text-rose-300">{uploadError}</p> : null}
      </div>

      {isLoading ? <p className="text-sm text-slate-400">Загрузка...</p> : null}
      {isError ? (
        <p className="text-sm text-rose-300">Не удалось загрузить данные хранилища. Попробуйте обновить страницу.</p>
      ) : null}

      {!isLoading && !isError ? (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-lg border border-slate-700 bg-slate-800 p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Папки</h2>
              {folders.length === 0 ? (
                <p className="text-sm text-slate-400">Папок нет.</p>
              ) : (
                <ul className="space-y-2">
                  {folders.map((folder) => (
                    <li
                      key={folder.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-700 px-3 py-2"
                    >
                      <button
                        type="button"
                        onClick={() => openFolder(folder)}
                        className="text-left text-sm font-medium text-indigo-300 hover:underline"
                      >
                        {folder.name}
                      </button>
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => handleRename(folder)}
                          className="rounded border border-slate-600 px-2 py-1 text-slate-300"
                        >
                          Переименовать
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(folder)}
                          className="rounded border border-rose-800 px-2 py-1 text-rose-300"
                        >
                          Удалить
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-lg border border-slate-700 bg-slate-800 p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Файлы</h2>
              {isSearching && files.length === 0 ? (
                <p className="text-sm text-slate-400">По вашему запросу ничего не найдено.</p>
              ) : currentFolder === null && !isSearching && files.length === 0 ? (
                <p className="text-sm text-slate-400">В корне пока нет файлов.</p>
              ) : files.length === 0 ? (
                <p className="text-sm text-slate-400">В этой папке пока нет файлов.</p>
              ) : (
                <ul className="space-y-2">
                  {files.map((file) => (
                    <li
                      key={file.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <span className="block truncate text-slate-200">{file.name}</span>
                        <span className="text-xs text-slate-500">{formatFileSize(file.size ?? file.file_size)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => handleSelectShareFile(file)}
                          className="rounded border border-indigo-700 px-2 py-1 text-indigo-300"
                        >
                          Доступ
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            downloadFileMutation.mutate({
                              id: file.id,
                              name: file.name,
                              mimeType: file.mime_type ?? file.content_type,
                            })
                          }
                          className="rounded border border-slate-600 px-2 py-1 text-slate-300"
                        >
                          Скачать
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFileRename(file)}
                          className="rounded border border-slate-600 px-2 py-1 text-slate-300"
                        >
                          Переименовать
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFileDelete(file)}
                          className="rounded border border-rose-800 px-2 py-1 text-rose-300"
                        >
                          Удалить
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="rounded-lg border border-slate-700 bg-slate-800 p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Шаринг файла</h2>
            {selectedShareFile ? (
              <>
                <p className="mb-3 text-sm text-slate-300">
                  Выбран файл: <span className="font-medium text-white">{selectedShareFile.name}</span>
                </p>
                <div className="mb-3 grid gap-2 md:grid-cols-[1fr_200px_auto]">
                  <select
                    value={shareTargetUserId}
                    onChange={(event) => setShareTargetUserId(event.target.value)}
                    className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                  >
                    <option value="">Выберите сотрудника</option>
                    {recipientOptions.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name} ({member.email})
                      </option>
                    ))}
                  </select>
                  <select
                    value={sharePermission}
                    onChange={(event) => setSharePermission(event.target.value as StorageSharePermission)}
                    className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                  >
                    {STORAGE_SHARE_PERMISSIONS.map((permission) => (
                      <option key={permission} value={permission}>
                        {STORAGE_SHARE_PERMISSION_LABEL[permission]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleCreateShare}
                    disabled={!shareTargetUserId || createShareMutation.isPending}
                    className="rounded-md bg-indigo-600 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Выдать доступ
                  </button>
                </div>
                {shareError ? <p className="mb-3 text-sm text-rose-300">{shareError}</p> : null}
                {fileSharesQuery.isLoading ? <p className="text-sm text-slate-400">Загрузка доступов...</p> : null}
                {fileShares.length === 0 ? (
                  <p className="text-sm text-slate-400">Файл пока никому не расшарен.</p>
                ) : (
                  <ul className="space-y-2">
                    {fileShares.map((share) => (
                      <li
                        key={share.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-700 px-3 py-2"
                      >
                        <div className="text-sm text-slate-200">
                          <p>{share.shared_with_name}</p>
                          <p className="text-xs text-slate-500">ID пользователя: {share.shared_with_user_id}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={share.permission}
                            onChange={(event) =>
                              handleSharePermissionChange(share.id, event.target.value as StorageSharePermission)
                            }
                            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                          >
                            {STORAGE_SHARE_PERMISSIONS.map((permission) => (
                              <option key={permission} value={permission}>
                                {permission}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleRevokeShare(share.id)}
                            className="rounded border border-rose-800 px-2 py-1 text-xs text-rose-300"
                          >
                            Отозвать
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-400">Нажмите «Доступ» рядом с нужным файлом, чтобы управлять шарингом.</p>
            )}
          </section>

          <section className="rounded-lg border border-slate-700 bg-slate-800 p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Расшарено мне</h2>
            {sharedWithMeQuery.isLoading ? <p className="text-sm text-slate-400">Загрузка...</p> : null}
            {sharedWithMeQuery.isError ? (
              <p className="text-sm text-rose-300">Не удалось загрузить список расшаренных файлов.</p>
            ) : null}
            {!sharedWithMeQuery.isLoading && !sharedWithMeQuery.isError && sharedWithMe.length === 0 ? (
              <p className="text-sm text-slate-400">Пока нет файлов, расшаренных вам.</p>
            ) : null}
            {!sharedWithMeQuery.isLoading && !sharedWithMeQuery.isError && sharedWithMe.length > 0 ? (
              <ul className="space-y-2">
                {sharedWithMe.map((share) => (
                  <li
                    key={share.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="text-slate-200">{share.file_name}</p>
                      <p className="text-xs text-slate-500">Владелец: {share.file_owner_name}</p>
                      <p className="text-xs text-slate-500">Расшарил: {share.shared_by_name}</p>
                      <p className="text-xs text-slate-500">Ваш уровень доступа: {share.permission}</p>
                    </div>
                    {share.permission === 'view' ? (
                      <button
                        type="button"
                        onClick={() => openSharedFileMutation.mutate(share.file_id)}
                        className="rounded border border-indigo-700 px-2 py-1 text-xs text-indigo-300"
                      >
                        Открыть
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          downloadFileMutation.mutate({
                            id: share.file_id,
                            name: share.file_name || `file-${share.file_id}`,
                            mimeType: 'application/octet-stream',
                          })
                        }
                        className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300"
                      >
                        Скачать
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
            {openSharedFileMutation.isError ? (
              <p className="mt-3 text-sm text-rose-300">Не удалось открыть файл по доступу view.</p>
            ) : null}
            {openedSharedFile ? (
              <div className="mt-3 rounded-md border border-slate-700 bg-slate-900 p-3 text-sm">
                <p className="text-slate-200">Открыт файл: {openedSharedFile.name}</p>
                <p className="text-xs text-slate-500">
                  Размер: {formatFileSize(openedSharedFile.size ?? openedSharedFile.file_size)}
                </p>
                <p className="text-xs text-slate-500">
                  Тип: {openedSharedFile.mime_type ?? openedSharedFile.content_type ?? 'unknown'}
                </p>
                <p className="mt-1 text-xs text-slate-500">Скачивание доступно только для уровней download/full.</p>
              </div>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
