import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { PromptModal } from '@/shared/ui/PromptModal';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { useAuth } from '@/shared/hooks/useAuth';
import { getApiError } from '@/shared/lib/getApiError';
import { cn } from '@/shared/lib/cn';
import { downloadFromApiEndpoint } from '@/shared/lib/resolveDownloadUrl';
import { USER_ROLES } from '@/shared/config/constants';
import {
  Archive,
  Check,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Folder,
  HardDrive,
  Image,
  Lock,
  Minus,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import type {
  CompanyDirectoryMember,
  PaginatedResponse,
  StorageFile,
  StorageFileShare,
  StorageFolder,
  StorageFolderDetail,
  StorageUsage,
} from '@/shared/types';

type StorageScope = 'personal' | 'company';

type FileBrowserConfirmAction =
  | { type: 'delete-folder'; folder: StorageFolder }
  | { type: 'delete-file'; file: StorageFile }
  | { type: 'revoke-share'; shareId: number };

type RenameTarget =
  | { kind: 'folder'; folder: StorageFolder }
  | { kind: 'file'; file: StorageFile };

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

function formatFileSize(size: number): string {
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

function relativeDate(dateStr: string, lang: string): string {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  if (diffDays === 0) return rtf.format(0, 'day');
  if (diffDays < 30) return rtf.format(-diffDays, 'day');
  return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' }).format(date);
}

function getFileExt(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

const EXT_BADGE_STYLES: Record<string, string> = {
  pdf:  'from-red-500 to-red-700',
  fig:  'from-purple-500 to-violet-700',
  xls:  'from-green-600 to-green-800',
  xlsx: 'from-green-600 to-green-800',
  key:  'from-amber-400 to-amber-600',
  numbers: 'from-green-500 to-green-700',
  pages: 'from-amber-500 to-amber-700',
  png:  'from-cyan-400 to-cyan-600',
  jpg:  'from-cyan-400 to-cyan-600',
  jpeg: 'from-cyan-400 to-cyan-600',
  webp: 'from-cyan-500 to-sky-600',
  gif:  'from-pink-400 to-pink-600',
  svg:  'from-teal-400 to-teal-600',
  json: 'from-orange-500 to-orange-600',
  mp4:  'from-indigo-500 to-indigo-700',
  mp3:  'from-violet-500 to-violet-700',
  mov:  'from-indigo-400 to-indigo-600',
  zip:  'from-slate-500 to-slate-700',
  rar:  'from-slate-500 to-slate-700',
  doc:  'from-blue-500 to-blue-700',
  docx: 'from-blue-500 to-blue-700',
  ppt:  'from-rose-500 to-rose-700',
  pptx: 'from-rose-500 to-rose-700',
  txt:  'from-slate-400 to-slate-600',
  csv:  'from-emerald-500 to-emerald-700',
};

function FileTypeBadge({ name }: { name: string }) {
  const ext = getFileExt(name);
  const grad = EXT_BADGE_STYLES[ext];
  return (
    <span
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-[5px] font-mono text-[9.5px] font-bold tracking-wide',
        'w-[38px] h-[28px]',
        grad ? `bg-gradient-to-b ${grad} text-white` : 'bg-raised text-secondary',
      )}
    >
      {(ext.toUpperCase() || '?').slice(0, 4)}
    </span>
  );
}

function MiniAvatar({ initials }: { initials: string }) {
  return (
    <span className="inline-grid place-items-center rounded-full text-[10px] font-semibold w-[22px] h-[22px] border-[1.5px] border-surface bg-raised text-secondary shrink-0">
      {initials.slice(0, 2).toUpperCase()}
    </span>
  );
}

function categorizeBytes(files: StorageFile[]): Record<string, number> {
  const cats: Record<string, number> = { docs: 0, img: 0, media: 0, arch: 0, other: 0 };
  for (const f of files) {
    const ext = getFileExt(f.name);
    const size = f.file_size ?? f.size ?? 0;
    if (['pdf','doc','docx','xls','xlsx','ppt','pptx','txt','csv','key','pages','numbers'].includes(ext)) {
      cats.docs += size;
    } else if (['png','jpg','jpeg','gif','svg','webp','heic','bmp','tiff'].includes(ext)) {
      cats.img += size;
    } else if (['mp4','mp3','mov','avi','wav','mkv','aac','flac','ogg'].includes(ext)) {
      cats.media += size;
    } else if (['zip','tar','gz','rar','7z','bz2'].includes(ext)) {
      cats.arch += size;
    } else {
      cats.other += size;
    }
  }
  return cats;
}

function getOwnerInitials(ownerName: string): string {
  return (ownerName || '?')
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function FileBrowserPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ── UI state ──
  const [scope, setScope] = useState<StorageScope>('personal');
  const [trail, setTrail] = useState<StorageFolder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<number>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<{ kind: 'file' | 'folder'; id: number } | null>(null);

  // ── Sharing state ──
  const [inlineShareFileId, setInlineShareFileId] = useState<number | null>(null);
  const [shareSearch, setShareSearch] = useState('');
  const [shareError, setShareError] = useState<string | null>(null);

  // ── Upload feedback ──
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // ── Modals ──
  const [confirmAction, setConfirmAction] = useState<FileBrowserConfirmAction | null>(null);
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  useEffect(() => {
    if (!uploadSuccess) return;
    const timer = setTimeout(() => setUploadSuccess(null), 4000);
    return () => clearTimeout(timer);
  }, [uploadSuccess]);

  // No document listener needed — backdrop overlay handles outside-click

  const currentFolder = trail.length > 0 ? trail[trail.length - 1] : null;
  const normalizedSearchTerm = searchTerm.trim();
  const isSearching = normalizedSearchTerm.length > 0;

  // ── Refresh helper ──
  const refreshStorageData = () => {
    queryClient.invalidateQueries({ queryKey: ['storage', 'folders', scope, 'root'] });
    queryClient.invalidateQueries({ queryKey: ['storage', 'files-root', scope] });
    queryClient.invalidateQueries({ queryKey: ['storage', 'all-files', scope] });
    queryClient.invalidateQueries({ queryKey: ['storage', 'files-search'] });
    queryClient.invalidateQueries({ queryKey: ['storage', 'usage'] });
    queryClient.invalidateQueries({ queryKey: ['storage', 'shares', 'shared-with-me'] });
    if (inlineShareFileId !== null) {
      queryClient.invalidateQueries({ queryKey: ['storage', 'shares', 'file', inlineShareFileId] });
    }
    if (currentFolder) {
      queryClient.invalidateQueries({ queryKey: ['storage', 'folder', currentFolder.id] });
    }
    if (user?.company_id) {
      queryClient.invalidateQueries({ queryKey: ['company-limits', String(user.company_id)] });
      queryClient.invalidateQueries({ queryKey: ['company', String(user.company_id)] });
    }
  };

  // ── Queries ──
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
        params: { search: normalizedSearchTerm, ordering: 'name', page_size: 100 },
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
          params: { folder_id: 'null', scope, page_size: 100, ordering: '-created_at' },
        });
        return data;
      } catch {
        const { data } = await apiClient.get<PaginatedResponse<StorageFile>>(API.storage.files, {
          params: { scope, page_size: 100, ordering: '-created_at' },
        });
        return { ...data, results: (data.results ?? []).filter((f) => f.folder === null) };
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
        { params: { page_size: 200, ordering: 'full_name' } },
      );
      return data;
    },
    enabled: Boolean(user?.company_id),
  });

  const fileSharesQuery = useQuery({
    queryKey: ['storage', 'shares', 'file', inlineShareFileId],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<StorageFileShare>>(
        API.storage.fileShares(String(inlineShareFileId)),
      );
      return data;
    },
    enabled: inlineShareFileId !== null,
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

  const allScopeFilesQuery = useQuery({
    queryKey: ['storage', 'all-files', scope],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<StorageFile>>(API.storage.files, {
        params: { scope, page_size: 1000, ordering: '-created_at' },
      });
      return data;
    },
    enabled: currentFolder === null,
  });

  // ── Mutations ──
  const createFolderMutation = useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      await apiClient.post(API.storage.folders, {
        name,
        parent_id: currentFolder?.id ?? null,
        is_company_shared: scope === 'company',
      });
    },
    onSuccess: () => { refreshStorageData(); },
  });

  const renameFolderMutation = useMutation({
    mutationFn: async ({ folderId, name }: { folderId: number; name: string }) => {
      await apiClient.patch(API.storage.folder(String(folderId)), { name });
    },
    onSuccess: () => { refreshStorageData(); },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: number) => {
      await apiClient.delete(API.storage.folder(String(folderId)));
    },
    onSuccess: (_, folderId) => {
      if (currentFolder?.id === folderId) setTrail([]);
      else refreshStorageData();
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
      setUploadError(null);
      setUploadSuccess(t('files.uploadSuccess', { name: createdFile.name }));
      if (currentFolder === null && createdFile.folder === null) {
        queryClient.setQueryData<PaginatedResponse<StorageFile>>(
          ['storage', 'files-root', scope],
          (prev) => {
            if (!prev) return { count: 1, next: null, previous: null, results: [createdFile] };
            if (prev.results.some((item) => item.id === createdFile.id)) return prev;
            return { ...prev, count: prev.count + 1, results: [createdFile, ...prev.results] };
          },
        );
      }
      refreshStorageData();
    },
    onError: (error) => {
      setUploadSuccess(null);
      setUploadError(getApiError(error).message);
    },
  });

  const renameFileMutation = useMutation({
    mutationFn: async ({ fileId, name }: { fileId: number; name: string }) => {
      await apiClient.patch(API.storage.file(String(fileId)), { name });
    },
    onSuccess: () => { refreshStorageData(); },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      await apiClient.delete(API.storage.file(String(fileId)));
    },
    onSuccess: () => { refreshStorageData(); },
  });

  const downloadFileMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      await downloadFromApiEndpoint(API.storage.fileDownload(String(id)), { filename: name });
    },
  });

  const createShareMutation = useMutation({
    mutationFn: async ({ fileId, userId }: { fileId: number; userId: number }) => {
      await apiClient.post(API.storage.shares, {
        file_id: fileId,
        shared_with_user_id: userId,
        permission: 'download',
      });
    },
    onSuccess: () => {
      setShareError(null);
      refreshStorageData();
    },
    onError: (error) => {
      const message = getApiError(error).message;
      const isDuplicate = /уникальн/i.test(message) || /unique/i.test(message);
      setShareError(isDuplicate ? t('files.duplicateShare') : message);
    },
  });

  const revokeShareMutation = useMutation({
    mutationFn: async (shareId: number) => {
      await apiClient.delete(API.storage.share(String(shareId)));
    },
    onSuccess: () => { refreshStorageData(); },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => apiClient.delete(API.storage.file(String(id)))));
    },
    onSuccess: () => {
      setSelectedFileIds(new Set());
      refreshStorageData();
    },
  });

  // ── Derived data ──
  const folders = useMemo<StorageFolder[]>(() => {
    if (currentFolder) return folderDetailQuery.data?.folders ?? [];
    return rootFoldersQuery.data?.results ?? [];
  }, [currentFolder, folderDetailQuery.data?.folders, rootFoldersQuery.data?.results]);

  const files = useMemo<StorageFile[]>(() => {
    let result: StorageFile[];
    if (isSearching) result = searchedFilesQuery.data?.results ?? [];
    else if (!currentFolder) result = rootFilesQuery.data?.results ?? [];
    else result = folderDetailQuery.data?.files ?? [];
    if (scope === 'personal' && user?.id !== undefined) {
      result = result.filter((f) => f.owner === user.id);
    }
    return result;
  }, [currentFolder, folderDetailQuery.data?.files, isSearching, rootFilesQuery.data?.results, searchedFilesQuery.data?.results, scope, user?.id]);

  const companyMembers = companyMembersQuery.data?.results ?? [];
  const recipientOptions = companyMembers.filter((m) => m.id !== user?.id);
  const fileShares = fileSharesQuery.data?.results ?? [];
  const sharedWithMe = sharedWithMeQuery.data?.results ?? [];

  const filteredShareMembers = useMemo(() => {
    const q = shareSearch.trim().toLowerCase();
    if (!q) return recipientOptions;
    return recipientOptions.filter(
      (m) => m.full_name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
    );
  }, [recipientOptions, shareSearch]);

  const isLoading = rootFoldersQuery.isLoading || folderDetailQuery.isLoading || rootFilesQuery.isLoading;
  const isError = rootFoldersQuery.isError || folderDetailQuery.isError || rootFilesQuery.isError;
  const isGuest = user?.role === USER_ROLES.GUEST;
  const isAdmin = user?.role === USER_ROLES.COMPANY_ADMIN || user?.role === USER_ROLES.SUPERADMIN;

  const canManageFile = (file: StorageFile) => scope === 'personal' || file.owner === user?.id || isAdmin;
  const canManageFolder = (folder: StorageFolder) => scope === 'personal' || folder.owner === user?.id || isAdmin;

  // ── Navigation ──
  const openFolder = (folder: StorageFolder) => setTrail((prev) => [...prev, folder]);
  const goToTrailIndex = (idx: number) => setTrail((prev) => prev.slice(0, idx + 1));
  const resetToRoot = () => setTrail([]);

  // ── Upload handler ──
  const handleAutoUpload = (file: File) => {
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError(t('files.fileSizeExceeded'));
      return;
    }
    setUploadError(null);
    setUploadSuccess(null);
    uploadFileMutation.mutate(file);
  };

  // ── Storage numbers — always show combined total regardless of active scope ──
  const usageData = storageUsageQuery.data;
  const usedBytes = (usageData?.personal?.used_bytes ?? 0) + (usageData?.company?.used_bytes ?? 0);
  const limitBytes = usageData?.company?.limit_bytes ?? usageData?.personal?.limit_bytes ?? 0;
  const fileCount = (usageData?.personal?.file_count ?? 0) + (usageData?.company?.file_count ?? 0);

  // ── SVG gauge math ──
  // Lower semicircle (horseshoe / U-shape): opens upward, fills left→bottom→right.
  // Center near top of viewBox so the arc curves downward into the panel.
  const gaugePct = limitBytes > 0 ? Math.max(0, Math.min(1, usedBytes / limitBytes)) : 0;
  const CX = 100, CY = 16, R = 76;
  // p=0 → left end (24, 16), p=0.5 → bottom (100, 92), p=1 → right end (176, 16)
  const arcPt = (p: number): [number, number] => {
    const a = Math.PI * p;
    return [CX - R * Math.cos(a), CY + R * Math.sin(a)];
  };
  const [sx, sy] = arcPt(0);
  const [ex, ey] = arcPt(Math.min(gaugePct, 0.9999));
  const [fx, fy] = arcPt(0.9999);
  // sweep=0 → decreasing-theta → arc goes downward from left end through bottom to right end
  const arcUsed = `M ${sx} ${sy} A ${R} ${R} 0 0 0 ${ex} ${ey}`;
  const arcAll  = `M ${sx} ${sy} A ${R} ${R} 0 0 0 ${fx} ${fy}`;

  // ── Breakdown ──
  const breakdownFiles = useMemo<StorageFile[]>(() => {
    if (currentFolder !== null) return folderDetailQuery.data?.files ?? [];
    return allScopeFilesQuery.data?.results ?? [];
  }, [currentFolder, folderDetailQuery.data?.files, allScopeFilesQuery.data?.results]);

  const bytesCats = useMemo(() => categorizeBytes(breakdownFiles), [breakdownFiles]);
  const bytesTotal = Object.values(bytesCats).reduce((a, b) => a + b, 0);

  const breakdownItems = [
    { key: 'docs',  labelKey: 'files.bdDocs',  Icon: FileText,  colorClass: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',         barClass: 'from-red-400 to-red-600' },
    { key: 'img',   labelKey: 'files.bdImg',   Icon: Image,     colorClass: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',  barClass: 'from-green-400 to-green-600' },
    { key: 'media', labelKey: 'files.bdMedia', Icon: Play,      colorClass: 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400', barClass: 'from-purple-400 to-purple-600' },
    { key: 'arch',  labelKey: 'files.bdArch',  Icon: Archive,   colorClass: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',   barClass: 'from-slate-400 to-slate-500' },
    { key: 'other', labelKey: 'files.bdOther', Icon: HardDrive, colorClass: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',  barClass: 'from-amber-400 to-amber-600' },
  ];

  const totalFilesCount = currentFolder === null && !isSearching
    ? (rootFilesQuery.data?.count ?? files.length)
    : files.length;

  // ── Source card configs ──
  const sourceCards = [
    {
      id: 'personal' as StorageScope,
      name: t('files.personalStorage'),
      sub: t('files.personalStorageSub'),
      Icon: Lock,
      used: usageData?.personal?.used_bytes ?? 0,
      limit: usageData?.personal?.limit_bytes ?? 0,
    },
    ...(!isGuest ? [{
      id: 'company' as StorageScope,
      name: t('files.companyStorage'),
      sub: t('files.sharedStorageSub'),
      Icon: Users,
      used: usageData?.company?.used_bytes ?? 0,
      limit: usageData?.company?.limit_bytes ?? 0,
    }] : []),
  ];

  return (
    <div className="space-y-5">
      {/* ── Menu backdrop: closes any open dropdown when clicking outside ── */}
      {openMenuId !== null && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setOpenMenuId(null)}
        />
      )}

      {/* ── Page header ── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight leading-none text-primary">
            {t('files.title')}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {!isGuest && (
            <button
              type="button"
              onClick={() => setShowNewFolderModal(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-sm)] border border-default bg-surface text-sm font-medium text-primary hover:bg-hover transition-colors"
            >
              <Folder size={13} />
              {t('files.newFolder')}
            </button>
          )}
          {!isGuest && (
            <button
              type="button"
              onClick={() => uploadInputRef.current?.click()}
              disabled={uploadFileMutation.isPending}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-sm)] bg-[var(--brand)] text-white text-sm font-medium hover:bg-[var(--brand-hover)] transition-colors disabled:opacity-60"
            >
              {uploadFileMutation.isPending ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
              ) : (
                <Plus size={14} />
              )}
              {t('common.uploadFile')}
            </button>
          )}
          <input
            ref={uploadInputRef}
            type="file"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              e.target.value = '';
              handleAutoUpload(f);
            }}
          />
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid gap-3.5 items-start" style={{ gridTemplateColumns: 'minmax(0,1fr) 300px' }}>

        {/* ════ LEFT COLUMN ════ */}
        <div className="space-y-4 min-w-0">

          {/* Source selector cards */}
          {!isGuest && (
            <div className={cn('grid gap-3', sourceCards.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
              {sourceCards.map((s) => {
                const isActive = scope === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { setScope(s.id); setTrail([]); setSearchTerm(''); setShowSearch(false); }}
                    className={cn(
                      'relative text-left flex flex-col gap-2.5 p-4 rounded-xl border cursor-pointer transition-all duration-150 overflow-hidden',
                      isActive
                        ? 'bg-[var(--brand)] border-transparent shadow-[0_8px_22px_color-mix(in_srgb,var(--brand)_30%,transparent)]'
                        : 'bg-surface border-default hover:bg-hover',
                    )}
                  >
                    {isActive && (
                      <div className="pointer-events-none absolute right-[-32px] top-[-32px] w-[120px] h-[120px] rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.25),transparent_65%)]" />
                    )}
                    <div className="relative z-[1]">
                      <span className={cn(
                        'flex items-center justify-center w-9 h-9 rounded-[9px] shrink-0',
                        isActive ? 'bg-white/20' : 'bg-brand-subtle',
                      )}>
                        <s.Icon size={18} className={isActive ? 'text-white' : 'text-[var(--brand-text)]'} />
                      </span>
                    </div>
                    <div className="relative z-[1]">
                      <div className={cn('text-[15px] font-semibold leading-snug', isActive ? 'text-white' : 'text-primary')}>
                        {s.name}
                      </div>
                      <div className={cn('text-[11.5px] mt-0.5', isActive ? 'text-white/78' : 'text-muted')}>
                        {s.sub}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Breadcrumb trail */}
          {trail.length > 0 && (
            <div className="flex items-center gap-1.5 text-[13px] text-muted flex-wrap">
              <button
                type="button"
                onClick={resetToRoot}
                className="text-[var(--brand-text)] hover:underline"
              >
                {t('files.root')}
              </button>
              {trail.map((folder, idx) => (
                <span key={folder.id} className="flex items-center gap-1.5">
                  <ChevronRight size={12} />
                  <button
                    type="button"
                    onClick={() => goToTrailIndex(idx)}
                    className="text-[var(--brand-text)] hover:underline"
                  >
                    {folder.name}
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* ── Folders section ── */}
          <div>
            <div className="flex items-center justify-between pb-3">
              {trail.length === 0 ? (
                <button type="button" className="text-[var(--brand-text)] hover:underline text-[13px]">
                  {t('files.root')}
                </button>
              ) : (
                <span className="text-[15px] font-semibold text-primary">{t('files.foldersSection')}</span>
              )}
            </div>

            {isLoading ? (
              <p className="text-sm text-muted">{t('common.loading')}</p>
            ) : isError ? (
              <p className="text-sm text-danger-badge">{t('files.loadError')}</p>
            ) : folders.length === 0 ? (
              <p className="text-sm text-muted">{t('files.noFolders')}</p>
            ) : (
              <div className="grid grid-cols-4 gap-2.5">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    onClick={() => openFolder(folder)}
                    className={cn(
                      'bg-surface border border-default rounded-xl p-3 flex flex-col gap-1.5 cursor-pointer transition-all duration-150',
                      openMenuId?.kind === 'folder' && openMenuId.id === folder.id
                        ? 'relative z-20 -translate-y-px shadow-[0_6px_18px_rgba(0,0,0,0.06)]'
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
                      </div>
                      {canManageFolder(folder) && (
                        <div className="relative z-20">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId((prev) =>
                                prev?.id === folder.id && prev.kind === 'folder'
                                  ? null
                                  : { kind: 'folder', id: folder.id },
                              );
                            }}
                            className="rounded-[5px] p-0.5 text-muted hover:bg-raised hover:text-primary transition-colors"
                          >
                            <MoreVertical size={13} />
                          </button>
                          {openMenuId?.kind === 'folder' && openMenuId.id === folder.id && (
                            <div className="absolute right-0 top-7 z-30 w-52 bg-surface border border-default rounded-xl shadow-[var(--shadow-pop)] py-1">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setRenameTarget({ kind: 'folder', folder }); setOpenMenuId(null); }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-secondary hover:bg-hover whitespace-nowrap"
                              >
                                <Pencil size={13} /> {t('files.rename')}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: 'delete-folder', folder }); setOpenMenuId(null); }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-danger hover:bg-hover whitespace-nowrap border-t border-[var(--border-faint)] mt-1 pt-2.5"
                              >
                                <Trash2 size={13} /> {t('common.delete')}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-[12.5px] font-semibold text-primary leading-snug truncate">
                      {folder.name}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-muted">
                      <Clock size={10} />
                      <span className="truncate">{relativeDate(folder.updated_at, i18n.language)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Upload feedback ── */}
          {(uploadSuccess ?? uploadError) && (
            <div className={cn(
              'flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm',
              uploadSuccess ? 'bg-success-subtle text-success-badge' : 'bg-danger-subtle text-danger-badge',
            )}>
              <span>{uploadSuccess ?? uploadError}</span>
              <button
                type="button"
                onClick={() => { setUploadSuccess(null); setUploadError(null); }}
                className="shrink-0 rounded p-0.5 hover:opacity-70"
                aria-label={t('common.close')}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* ── Bulk action bar ── */}
          {selectedFileIds.size > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-[var(--brand)] bg-brand-subtle px-4 py-2.5 text-sm">
              <span className="font-medium text-[var(--brand-text)]">
                {t('files.selectedCount', { count: selectedFileIds.size })}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedFileIds(new Set())}
                  className="inline-flex items-center gap-1.5 h-7 px-3 rounded-[var(--radius-sm)] border border-default bg-surface text-[12px] font-medium text-secondary hover:bg-hover transition-colors"
                >
                  <X size={12} />
                  {t('files.deselectAll')}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmBulkDelete(true)}
                  disabled={bulkDeleteMutation.isPending}
                  className="inline-flex items-center gap-1.5 h-7 px-3 rounded-[var(--radius-sm)] bg-danger-subtle border border-[var(--danger)] text-[12px] font-medium text-danger hover:bg-[var(--danger)] hover:text-white transition-colors disabled:opacity-50"
                >
                  <Trash2 size={12} />
                  {t('files.deleteSelected')}
                </button>
              </div>
            </div>
          )}

          {/* ── Files table section ── */}
          <div>
            <div className="flex items-center gap-2 pb-3 flex-wrap">
              <span className="text-[15px] font-semibold text-primary">{t('files.recentFiles')}</span>
              {!isSearching && (
                <span className="text-[12px] text-muted">
                  {files.length} / {totalFilesCount}
                </span>
              )}
              {isSearching && (
                <span className="text-[12px] text-muted">
                  {t('files.searchResultHint', { count: files.length })}
                </span>
              )}
              <div className="ml-auto flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowSearch((s) => !s)}
                  className={cn(
                    'inline-flex items-center gap-1.5 h-[26px] px-2.5 rounded-full border text-[12px] font-medium transition-colors',
                    showSearch
                      ? 'bg-brand-subtle border-transparent text-[var(--brand-text)]'
                      : 'bg-raised border-default text-secondary hover:bg-hover',
                  )}
                >
                  <Search size={11} /> {t('common.search')}
                </button>
              </div>
            </div>

            {/* Inline search bar */}
            {showSearch && (
              <div className="flex items-center gap-2 mb-3">
                <input
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('files.searchFilesPlaceholder')}
                  className="h-8 flex-1 rounded-[var(--radius-sm)] border border-default bg-raised px-3 text-sm text-primary placeholder:text-muted focus:border-[var(--brand)] focus:outline-none focus:ring-1 focus:ring-[color-mix(in_srgb,var(--brand)_20%,transparent)]"
                />
                <button
                  type="button"
                  onClick={() => { setShowSearch(false); setSearchTerm(''); }}
                  className="rounded-[var(--radius-sm)] p-1.5 text-muted hover:bg-hover hover:text-primary transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="bg-surface border border-default rounded-xl">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-default">
                    <th className="w-[34px] px-3 py-2.5 text-left">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedFileIds.size === files.length && files.length > 0) {
                            setSelectedFileIds(new Set());
                          } else {
                            setSelectedFileIds(new Set(files.map((f) => f.id)));
                          }
                        }}
                        className={cn(
                          'w-3.5 h-3.5 rounded-[3px] border-[1.5px] transition-colors flex items-center justify-center',
                          selectedFileIds.size > 0 && selectedFileIds.size === files.length
                            ? 'bg-[var(--brand)] border-[var(--brand)]'
                            : selectedFileIds.size > 0
                              ? 'bg-[var(--brand)] border-[var(--brand)]'
                              : 'border-[var(--border-strong)] hover:border-[var(--brand)]',
                        )}
                      >
                        {selectedFileIds.size > 0 && selectedFileIds.size === files.length && (
                          <Check size={10} strokeWidth={3} className="text-white" />
                        )}
                        {selectedFileIds.size > 0 && selectedFileIds.size < files.length && (
                          <Minus size={10} strokeWidth={3} className="text-white" />
                        )}
                      </button>
                    </th>
                    <th className="text-left text-[11px] font-medium tracking-wider uppercase text-muted px-3 py-2.5">
                      {t('files.tableColName')}
                    </th>
                    <th className="w-[90px] text-left text-[11px] font-medium tracking-wider uppercase text-muted px-3 py-2.5">
                      {t('files.tableColSize')}
                    </th>
                    <th className="w-[130px] text-left text-[11px] font-medium tracking-wider uppercase text-muted px-3 py-2.5">
                      {t('files.tableColCreated')}
                    </th>
                    <th className="w-[34px] px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {files.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-10 text-center text-sm text-muted">
                        {isSearching
                          ? t('files.noFilesSearch')
                          : currentFolder
                            ? t('files.noFilesFolder')
                            : t('files.noFilesRoot')}
                      </td>
                    </tr>
                  ) : (
                    files.map((file) => {
                      const isSelected = selectedFileIds.has(file.id);
                      const isShareOpen = inlineShareFileId === file.id;
                      return (
                        <Fragment key={file.id}>
                          {/* ── Main file row ── */}
                          <tr
                            className={cn(
                              'group border-b border-[var(--border-faint)] transition-colors',
                              isShareOpen ? 'border-b-0' : 'last:border-0',
                              isSelected
                                ? 'bg-[color-mix(in_srgb,var(--brand)_7%,transparent)]'
                                : openMenuId?.kind === 'file' && openMenuId.id === file.id
                                  ? 'bg-hover'
                                  : 'hover:bg-hover',
                            )}
                          >
                            <td className="px-3 py-2.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedFileIds((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(file.id)) next.delete(file.id);
                                    else next.add(file.id);
                                    return next;
                                  })
                                }
                                className={cn(
                                  'w-3.5 h-3.5 rounded-[3px] border-[1.5px] transition-colors flex items-center justify-center',
                                  isSelected
                                    ? 'bg-[var(--brand)] border-[var(--brand)]'
                                    : 'border-[var(--border-strong)] hover:border-[var(--brand)]',
                                )}
                              >
                                {isSelected && <Check size={10} strokeWidth={3} className="text-white" />}
                              </button>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileTypeBadge name={file.name} />
                                <span className="font-medium text-primary truncate">{file.name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 font-mono text-[12px] text-muted whitespace-nowrap">
                              {formatFileSize(file.file_size ?? file.size ?? 0)}
                            </td>
                            <td className="px-3 py-2.5 text-muted whitespace-nowrap">
                              {relativeDate(file.created_at, i18n.language)}
                            </td>
                            <td className="px-3 py-2.5 relative">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId((prev) =>
                                    prev?.id === file.id && prev.kind === 'file'
                                      ? null
                                      : { kind: 'file', id: file.id },
                                  );
                                }}
                                className="flex items-center justify-center w-7 h-7 rounded-[6px] border border-default bg-surface text-secondary hover:bg-hover hover:text-primary transition-colors"
                              >
                                <MoreVertical size={14} />
                              </button>
                              {openMenuId?.kind === 'file' && openMenuId.id === file.id && (
                                <div className="absolute right-0 top-9 z-30 w-52 bg-surface border border-default rounded-xl shadow-[var(--shadow-pop)] py-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      downloadFileMutation.mutate({ id: file.id, name: file.name });
                                      setOpenMenuId(null);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-secondary hover:bg-hover whitespace-nowrap"
                                  >
                                    <Download size={13} /> {t('files.download')}
                                  </button>
                                  {canManageFile(file) && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setRenameTarget({ kind: 'file', file });
                                        setOpenMenuId(null);
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-secondary hover:bg-hover whitespace-nowrap"
                                    >
                                      <Pencil size={13} /> {t('files.rename')}
                                    </button>
                                  )}
                                  {!isGuest && scope === 'personal' && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setInlineShareFileId((prev) => prev === file.id ? null : file.id);
                                        setShareSearch('');
                                        setShareError(null);
                                        setOpenMenuId(null);
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-secondary hover:bg-hover whitespace-nowrap"
                                    >
                                      <Users size={13} /> {t('files.shareAccessTitle')}
                                    </button>
                                  )}
                                  {canManageFile(file) && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmAction({ type: 'delete-file', file });
                                        setOpenMenuId(null);
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-danger hover:bg-hover whitespace-nowrap border-t border-[var(--border-faint)] mt-1 pt-2.5"
                                    >
                                      <Trash2 size={13} /> {t('common.delete')}
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>

                          {/* ── Inline share panel ── */}
                          {isShareOpen && (
                            <tr className="border-b border-[var(--border-faint)] last:border-0">
                              <td colSpan={5} className="px-4 py-3 bg-raised">
                                <div className="flex flex-col gap-2.5">
                                  {/* Header */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <Users size={13} className="text-muted" />
                                      <span className="text-[12px] font-semibold text-primary">
                                        {t('files.shareAccessTitle')}
                                      </span>
                                      <span className="text-[11px] text-muted truncate max-w-[200px]">
                                        — {file.name}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => { setInlineShareFileId(null); setShareError(null); setShareSearch(''); }}
                                      className="rounded p-0.5 text-muted hover:text-primary transition-colors"
                                    >
                                      <X size={13} />
                                    </button>
                                  </div>

                                  {/* Search */}
                                  <div className="relative">
                                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                                    <input
                                      autoFocus
                                      type="text"
                                      value={shareSearch}
                                      onChange={(e) => setShareSearch(e.target.value)}
                                      placeholder={t('files.searchEmployees')}
                                      className="h-8 w-full rounded-[var(--radius-sm)] border border-default bg-surface pl-7 pr-3 text-[13px] text-primary placeholder:text-muted focus:border-[var(--brand)] focus:outline-none"
                                    />
                                  </div>

                                  {/* Members list */}
                                  {fileSharesQuery.isLoading ? (
                                    <p className="text-[12px] text-muted py-1">{t('common.loading')}</p>
                                  ) : filteredShareMembers.length === 0 ? (
                                    <p className="text-[12px] text-muted py-1">{t('files.noMembersFound')}</p>
                                  ) : (
                                    <div className="max-h-[220px] overflow-y-auto -mx-1 space-y-0.5">
                                      {filteredShareMembers.map((m) => {
                                        const existingShare = fileShares.find(
                                          (s) => s.shared_with_user_id === m.id || s.shared_with === m.id,
                                        );
                                        const initials = getOwnerInitials(m.full_name);
                                        return (
                                          <div
                                            key={m.id}
                                            className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] px-2 py-1.5 hover:bg-hover transition-colors"
                                          >
                                            <div className="flex items-center gap-2 min-w-0">
                                              <span className="inline-grid shrink-0 place-items-center rounded-full text-[10px] font-semibold w-[28px] h-[28px] bg-surface border border-default text-secondary">
                                                {initials}
                                              </span>
                                              <div className="min-w-0">
                                                <p className="text-[13px] font-medium text-primary truncate leading-tight">{m.full_name}</p>
                                                <p className="text-[11px] text-muted truncate leading-tight">{m.email}</p>
                                              </div>
                                            </div>
                                            {existingShare ? (
                                              <button
                                                type="button"
                                                onClick={() => setConfirmAction({ type: 'revoke-share', shareId: existingShare.id })}
                                                disabled={revokeShareMutation.isPending}
                                                className="shrink-0 rounded-[var(--radius-sm)] border border-[var(--danger)] px-2.5 py-1 text-[12px] font-medium text-danger hover:bg-danger-subtle transition-colors disabled:opacity-50"
                                              >
                                                {t('files.revoke')}
                                              </button>
                                            ) : (
                                              <button
                                                type="button"
                                                onClick={() => createShareMutation.mutate({ fileId: file.id, userId: m.id })}
                                                disabled={createShareMutation.isPending}
                                                className="shrink-0 rounded-[var(--radius-sm)] bg-brand-subtle px-2.5 py-1 text-[12px] font-medium text-brand hover:bg-[var(--brand)] hover:text-white transition-colors disabled:opacity-50"
                                              >
                                                {t('files.grantBtn')}
                                              </button>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {shareError && (
                                    <p className="text-[12px] text-danger-badge">{shareError}</p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Shared-with-me section ── */}
          {scope === 'personal' && !isGuest && sharedWithMe.length > 0 && (
            <section className="rounded-xl border border-default bg-surface p-4">
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
                {t('files.sharedWithMe')}
              </h2>
              {sharedWithMeQuery.isLoading && <p className="text-sm text-muted">{t('common.loading')}</p>}
              {sharedWithMeQuery.isError && <p className="text-sm text-danger-badge">{t('files.shareLoadError')}</p>}
              <ul className="space-y-2">
                {sharedWithMe.map((share) => (
                  <li key={share.id} className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-default px-3 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-secondary">{share.file_name}</p>
                      <p className="text-xs text-muted">{t('files.fileOwner', { name: share.file_owner_name })}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadFileMutation.mutate({ id: share.file_id, name: share.file_name || `file-${share.file_id}` })}
                      className="shrink-0 rounded border border-default px-2 py-1 text-xs text-secondary hover:bg-hover transition-colors"
                    >
                      {t('files.download')}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* ════ RIGHT COLUMN — Storage panel ════ */}
        <aside className="sticky top-4">
          <div className="bg-surface border border-default rounded-2xl p-4 flex flex-col gap-3">

            {/* Panel header */}
            <div className="flex items-center">
              <span className="text-[13px] font-semibold text-primary">{t('files.storage')}</span>
            </div>

            {/* SVG semicircle gauge — lower arc (horseshoe), fills left→bottom→right */}
            <div className="flex flex-col items-center">
              <div className="relative" style={{ width: '196px', height: '106px' }}>
                {/* viewBox "0 0 200 106": diameter at y=16, arc bottom at y=92, stroke cap ≈ y=100 */}
                <svg
                  viewBox="0 0 200 106"
                  width="196"
                  height="106"
                  aria-hidden="true"
                >
                  <path
                    d={arcAll}
                    fill="none"
                    stroke="var(--bg-raised)"
                    strokeWidth="16"
                    strokeLinecap="round"
                  />
                  {gaugePct > 0 && (
                    <path
                      d={arcUsed}
                      fill="none"
                      stroke="var(--brand)"
                      strokeWidth="16"
                      strokeLinecap="round"
                      style={{ filter: 'drop-shadow(0 3px 10px color-mix(in srgb, var(--brand) 50%, transparent))' }}
                    />
                  )}
                </svg>
                {/* Icon floats inside the horseshoe opening, centered horizontally,
                    at 50% from top ≈ midway between diameter (y=16) and arc bottom (y=92) */}
                <div
                  className="absolute"
                  style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
                >
                  <div className="w-10 h-10 rounded-[11px] bg-brand-subtle grid place-items-center border-2 border-surface shadow-sm">
                    <HardDrive size={18} style={{ color: 'var(--brand-text)' }} />
                  </div>
                </div>
              </div>
              <div className="text-center mt-1.5">
                <span className="block text-[21px] font-bold tracking-tight text-primary font-mono">
                  {formatFileSize(usedBytes)}
                </span>
                <span className="block text-[11px] text-muted mt-0.5">
                  {limitBytes > 0
                    ? t('files.outOfUsed', { total: formatFileSize(limitBytes) })
                    : t('files.fileCount', { count: fileCount })}
                </span>
              </div>
            </div>

            <div className="h-px bg-[var(--border-faint)]" />

            {/* Breakdown by file type */}
            <div className="space-y-2.5">
              {breakdownItems.map((b) => {
                const bytes = bytesCats[b.key] ?? 0;
                const pct = bytesTotal > 0 ? (bytes / bytesTotal) * 100 : 0;
                return (
                  <div key={b.key} className="flex items-center gap-2.5">
                    <span className={cn('w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0', b.colorClass)}>
                      <b.Icon size={15} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-[5px]">
                        <span className="text-[13px] font-medium text-primary">{t(b.labelKey)}</span>
                        <span className="font-mono text-[11px] text-muted">{formatFileSize(bytes)}</span>
                      </div>
                      <div className="h-[4px] bg-raised rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full bg-gradient-to-r', b.barClass)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </aside>
      </div>

      {/* ── Modals ── */}
      <ConfirmModal
        isOpen={confirmAction !== null}
        onClose={() =>
          !deleteFolderMutation.isPending &&
          !deleteFileMutation.isPending &&
          !revokeShareMutation.isPending &&
          setConfirmAction(null)
        }
        onConfirm={() => {
          if (!confirmAction) return;
          if (confirmAction.type === 'delete-folder') {
            deleteFolderMutation.mutate(confirmAction.folder.id, { onSettled: () => setConfirmAction(null) });
          } else if (confirmAction.type === 'delete-file') {
            deleteFileMutation.mutate(confirmAction.file.id, { onSettled: () => setConfirmAction(null) });
          } else {
            revokeShareMutation.mutate(confirmAction.shareId, { onSettled: () => setConfirmAction(null) });
          }
        }}
        title={
          confirmAction?.type === 'delete-folder'
            ? t('files.deleteFolder')
            : confirmAction?.type === 'delete-file'
              ? t('files.deleteFile')
              : t('files.revokeShare')
        }
        description={
          confirmAction?.type === 'delete-folder'
            ? t('files.deleteFolderDesc', { name: confirmAction.folder.name })
            : confirmAction?.type === 'delete-file'
              ? t('files.deleteFileDesc', { name: confirmAction.file.name })
              : t('files.revokeShareDesc')
        }
        confirmLabel={confirmAction?.type === 'revoke-share' ? t('files.revoke') : t('common.delete')}
        variant="danger"
        isLoading={deleteFolderMutation.isPending || deleteFileMutation.isPending || revokeShareMutation.isPending}
      />

      <PromptModal
        isOpen={renameTarget !== null}
        onClose={() => !renameFolderMutation.isPending && !renameFileMutation.isPending && setRenameTarget(null)}
        onConfirm={(raw) => {
          if (!renameTarget) return;
          const nextName = raw.trim();
          if (renameTarget.kind === 'folder') {
            const { folder } = renameTarget;
            if (!nextName || nextName === folder.name) { setRenameTarget(null); return; }
            renameFolderMutation.mutate({ folderId: folder.id, name: nextName }, { onSettled: () => setRenameTarget(null) });
          } else {
            const { file } = renameTarget;
            if (!nextName || nextName === file.name) { setRenameTarget(null); return; }
            renameFileMutation.mutate({ fileId: file.id, name: nextName }, { onSettled: () => setRenameTarget(null) });
          }
        }}
        title={renameTarget?.kind === 'folder' ? t('files.renameFolder') : t('files.renameFile')}
        label={t('files.newName')}
        defaultValue={renameTarget?.kind === 'folder' ? renameTarget.folder.name : (renameTarget?.file.name ?? '')}
        confirmLabel={t('common.save')}
        isLoading={renameFolderMutation.isPending || renameFileMutation.isPending}
      />

      <PromptModal
        isOpen={showNewFolderModal}
        onClose={() => !createFolderMutation.isPending && setShowNewFolderModal(false)}
        onConfirm={(raw) => {
          const name = raw.trim();
          if (!name) { setShowNewFolderModal(false); return; }
          createFolderMutation.mutate({ name }, { onSettled: () => setShowNewFolderModal(false) });
        }}
        title={t('files.newFolder')}
        label={t('files.folderNamePlaceholder')}
        defaultValue=""
        confirmLabel={t('common.create')}
        isLoading={createFolderMutation.isPending}
      />

      <ConfirmModal
        isOpen={confirmBulkDelete}
        onClose={() => !bulkDeleteMutation.isPending && setConfirmBulkDelete(false)}
        onConfirm={() => {
          bulkDeleteMutation.mutate([...selectedFileIds], { onSettled: () => setConfirmBulkDelete(false) });
        }}
        title={t('files.deleteFile')}
        description={t('files.deleteFileDesc', { name: t('files.selectedCount', { count: selectedFileIds.size }) })}
        confirmLabel={t('common.delete')}
        variant="danger"
        isLoading={bulkDeleteMutation.isPending}
      />
    </div>
  );
}
