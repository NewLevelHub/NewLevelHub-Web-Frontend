import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { useAuth } from '@/shared/hooks/useAuth';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import type {
  PaginatedResponse,
  StorageFile,
  StorageFolder,
  StorageFolderDetail,
  StorageUsage,
} from '@/shared/types';

type StorageScope = 'personal' | 'company';
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

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
  const [trail, setTrail] = useState<StorageFolder[]>([]);
  const currentFolder = trail.length > 0 ? trail[trail.length - 1] : null;
  const normalizedSearchTerm = searchTerm.trim();
  const isSearching = normalizedSearchTerm.length > 0;

  const refreshStorageData = () => {
    queryClient.invalidateQueries({ queryKey: ['storage', 'folders', scope, 'root'] });
    queryClient.invalidateQueries({ queryKey: ['storage', 'files-search'] });
    queryClient.invalidateQueries({ queryKey: ['storage', 'usage'] });
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

  const storageUsageQuery = useQuery({
    queryKey: ['storage', 'usage'],
    queryFn: async () => {
      const { data } = await apiClient.get<StorageUsage>(API.storage.usage);
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
      }
      await apiClient.post(API.storage.files, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      setUploadFile(null);
      setUploadError(null);
      refreshStorageData();
    },
    onError: (error) => {
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
    mutationFn: async (file: StorageFile) => {
      const response = await apiClient.get(API.storage.fileDownload(String(file.id)), {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: file.mime_type ?? file.content_type ?? 'application/octet-stream',
      });
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = file.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
    },
  });

  const folders = useMemo<StorageFolder[]>(() => {
    if (currentFolder) return folderDetailQuery.data?.folders ?? [];
    return rootFoldersQuery.data?.results ?? [];
  }, [currentFolder, folderDetailQuery.data?.folders, rootFoldersQuery.data?.results]);

  const files = useMemo<StorageFile[]>(() => {
    if (isSearching) return searchedFilesQuery.data?.results ?? [];
    if (!currentFolder) return [];
    return folderDetailQuery.data?.files ?? [];
  }, [currentFolder, folderDetailQuery.data?.files, isSearching, searchedFilesQuery.data?.results]);

  const isLoading = rootFoldersQuery.isLoading || folderDetailQuery.isLoading || searchedFilesQuery.isLoading;
  const isError = rootFoldersQuery.isError || folderDetailQuery.isError || searchedFilesQuery.isError;

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

  const handleFileUpload = () => {
    if (!uploadFile) return;
    setUploadError(null);
    uploadFileMutation.mutate(uploadFile);
  };

  const handleUploadInputChange = (file: File | null) => {
    if (!file) {
      setUploadFile(null);
      setUploadError(null);
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadFile(null);
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
        {uploadError ? <p className="w-full text-xs text-rose-300">{uploadError}</p> : null}
      </div>

      {isLoading ? <p className="text-sm text-slate-400">Загрузка...</p> : null}
      {isError ? (
        <p className="text-sm text-rose-300">Не удалось загрузить данные хранилища. Попробуйте обновить страницу.</p>
      ) : null}

      {!isLoading && !isError ? (
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
            ) : currentFolder === null && !isSearching ? (
              <p className="text-sm text-slate-400">Откройте папку, чтобы увидеть файлы.</p>
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
                        onClick={() => downloadFileMutation.mutate(file)}
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
      ) : null}
    </div>
  );
}
