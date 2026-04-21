import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import type {
  PaginatedResponse,
  StorageFile,
  StorageFolder,
  StorageFolderDetail,
} from '@/shared/types';

type StorageScope = 'personal' | 'company';

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
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<StorageScope>('personal');
  const [newFolderName, setNewFolderName] = useState('');
  const [trail, setTrail] = useState<StorageFolder[]>([]);
  const currentFolder = trail.length > 0 ? trail[trail.length - 1] : null;

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
      queryClient.invalidateQueries({ queryKey: ['storage', 'folders', scope, 'root'] });
      if (currentFolder) {
        queryClient.invalidateQueries({ queryKey: ['storage', 'folder', currentFolder.id] });
      }
    },
  });

  const renameFolderMutation = useMutation({
    mutationFn: async ({ folderId, name }: { folderId: number; name: string }) => {
      await apiClient.patch(API.storage.folder(String(folderId)), { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage', 'folders', scope, 'root'] });
      if (currentFolder) {
        queryClient.invalidateQueries({ queryKey: ['storage', 'folder', currentFolder.id] });
      }
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
        queryClient.invalidateQueries({ queryKey: ['storage', 'folders', scope, 'root'] });
        if (currentFolder) {
          queryClient.invalidateQueries({ queryKey: ['storage', 'folder', currentFolder.id] });
        }
      }
    },
  });

  const folders = useMemo<StorageFolder[]>(() => {
    if (currentFolder) return folderDetailQuery.data?.folders ?? [];
    return rootFoldersQuery.data?.results ?? [];
  }, [currentFolder, folderDetailQuery.data?.folders, rootFoldersQuery.data?.results]);

  const files = useMemo<StorageFile[]>(() => {
    if (!currentFolder) return [];
    return folderDetailQuery.data?.files ?? [];
  }, [currentFolder, folderDetailQuery.data?.files]);

  const isLoading = rootFoldersQuery.isLoading || folderDetailQuery.isLoading;
  const isError = rootFoldersQuery.isError || folderDetailQuery.isError;

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
            {currentFolder === null ? (
              <p className="text-sm text-slate-400">Откройте папку, чтобы увидеть файлы.</p>
            ) : files.length === 0 ? (
              <p className="text-sm text-slate-400">В этой папке пока нет файлов.</p>
            ) : (
              <ul className="space-y-2">
                {files.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm"
                  >
                    <span className="truncate text-slate-200">{file.name}</span>
                    <span className="shrink-0 text-slate-400">{formatFileSize(file.file_size)}</span>
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
