import { useTranslation } from 'react-i18next';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { PromptModal } from '@/shared/ui/PromptModal';
import { ChevronRight, Download, Folder, Plus, X } from 'lucide-react';
import { useFileBrowser } from './hooks/useFileBrowser';
import { FolderCard } from './components/FolderCard';
import { StorageScopeCards } from './components/StorageScopeCards';
import { FileRow } from './components/FileRow';
import { FilesTableShell } from './components/FilesTableShell';
import { StoragePanel } from './components/StoragePanel';

export default function FileBrowserPage() {
  const { t } = useTranslation();
  const fb = useFileBrowser();
  const { shareState } = fb;

  return (
    <div className="space-y-5">
      {/* Backdrop closes open dropdown */}
      {fb.openMenuId !== null && (
        <div className="fixed inset-0 z-10" onClick={() => fb.setOpenMenuId(null)} />
      )}

      {/* Page header */}
      <div className="flex items-end justify-between">
        <h1 className="text-[22px] font-semibold tracking-tight leading-none text-primary">
          {t('files.title')}
        </h1>
        <div className="flex items-center gap-2">
          {!fb.isGuest && (
            <button
              type="button"
              onClick={() => fb.setShowNewFolderModal(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-sm)] border border-default bg-surface text-sm font-medium text-primary hover:bg-hover transition-colors"
            >
              <Folder size={13} />
              {t('files.newFolder')}
            </button>
          )}
          {!fb.isGuest && (
            <button
              type="button"
              onClick={() => fb.uploadInputRef.current?.click()}
              disabled={fb.isUploadPending}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-sm)] bg-[var(--brand)] text-white text-sm font-medium hover:bg-[var(--brand-hover)] transition-colors disabled:opacity-60"
            >
              {fb.isUploadPending ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
              ) : (
                <Plus size={14} />
              )}
              {t('common.uploadFile')}
            </button>
          )}
          <input
            ref={fb.uploadInputRef}
            type="file"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              e.target.value = '';
              fb.handleAutoUpload(f);
            }}
          />
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-3.5 items-start" style={{ gridTemplateColumns: 'minmax(0,1fr) 300px' }}>

        {/* ── Left column ── */}
        <div className="space-y-4 min-w-0">

          {!fb.isGuest && (
            <StorageScopeCards
              scope={fb.scope}
              sourceCards={fb.sourceCards}
              onSelect={(s) => { fb.setScope(s); fb.resetToRoot(); fb.setSearchTerm(''); fb.setShowSearch(false); }}
            />
          )}

          {/* Breadcrumb trail */}
          {fb.trail.length > 0 && (
            <div className="flex items-center gap-1.5 text-[13px] text-muted flex-wrap">
              <button type="button" onClick={fb.resetToRoot} className="text-[var(--brand-text)] hover:underline">
                {t('files.root')}
              </button>
              {fb.trail.map((folder, idx) => (
                <span key={folder.id} className="flex items-center gap-1.5">
                  <ChevronRight size={12} />
                  <button type="button" onClick={() => fb.goToTrailIndex(idx)} className="text-[var(--brand-text)] hover:underline">
                    {folder.name}
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Folders section */}
          <div>
            <div className="flex items-center justify-between pb-3">
              {fb.trail.length === 0 ? (
                <button type="button" className="text-[var(--brand-text)] hover:underline text-[13px]">
                  {t('files.root')}
                </button>
              ) : (
                <span className="text-[15px] font-semibold text-primary">{t('files.foldersSection')}</span>
              )}
            </div>

            {fb.isLoading ? (
              <p className="text-sm text-muted">{t('common.loading')}</p>
            ) : fb.isError ? (
              <p className="text-sm text-danger-badge">{t('files.loadError')}</p>
            ) : fb.folders.length === 0 ? (
              <p className="text-sm text-muted">{t('files.noFolders')}</p>
            ) : (
              <div className="grid grid-cols-4 gap-2.5">
                {fb.folders.map((folder) => (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    isMenuOpen={fb.openMenuId?.kind === 'folder' && fb.openMenuId.id === folder.id}
                    canManage={fb.canManageFolder(folder)}
                    lang={fb.lang}
                    onOpen={fb.openFolder}
                    onMenuToggle={(id) => fb.setOpenMenuId(id !== null ? { kind: 'folder', id } : null)}
                    onRename={(f) => { fb.setRenameTarget({ kind: 'folder', folder: f }); }}
                    onDelete={(f) => { fb.setConfirmAction({ type: 'delete-folder', folder: f }); }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Upload feedback */}
          {(fb.uploadSuccess ?? fb.uploadError) && (
            <div className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm ${fb.uploadSuccess ? 'bg-success-subtle text-success-badge' : 'bg-danger-subtle text-danger-badge'}`}>
              <span>{fb.uploadSuccess ?? fb.uploadError}</span>
              <button
                type="button"
                onClick={() => { fb.setUploadSuccess(null); fb.setUploadError(null); }}
                className="shrink-0 rounded p-0.5 hover:opacity-70"
                aria-label={t('common.close')}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Bulk action bar */}
          {fb.selectedFileIds.size > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-[var(--brand)] bg-brand-subtle px-4 py-2.5 text-sm">
              <span className="font-medium text-[var(--brand-text)]">
                {t('files.selectedCount', { count: fb.selectedFileIds.size })}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fb.setSelectedFileIds(new Set())}
                  className="inline-flex items-center gap-1.5 h-7 px-3 rounded-[var(--radius-sm)] border border-default bg-surface text-[12px] font-medium text-secondary hover:bg-hover transition-colors"
                >
                  <X size={12} />
                  {t('files.deselectAll')}
                </button>
                <button
                  type="button"
                  onClick={() => fb.setConfirmBulkDelete(true)}
                  disabled={fb.isBulkDeletePending}
                  className="inline-flex items-center gap-1.5 h-7 px-3 rounded-[var(--radius-sm)] bg-danger-subtle border border-[var(--danger)] text-[12px] font-medium text-danger hover:bg-[var(--danger)] hover:text-white transition-colors disabled:opacity-50"
                >
                  {t('files.deleteSelected')}
                </button>
              </div>
            </div>
          )}

          {/* Files table */}
          <FilesTableShell
            totalFilesCount={fb.totalFilesCount}
            filesShownCount={fb.files.length}
            isSearching={fb.isSearching}
            showSearch={fb.showSearch}
            searchTerm={fb.searchTerm}
            allSelected={fb.selectedFileIds.size === fb.files.length && fb.files.length > 0}
            someSelected={fb.selectedFileIds.size > 0 && fb.selectedFileIds.size < fb.files.length}
            onToggleSearch={() => fb.setShowSearch((s) => !s)}
            onSearchChange={fb.setSearchTerm}
            onClearSearch={() => { fb.setShowSearch(false); fb.setSearchTerm(''); }}
            onToggleSelectAll={fb.toggleSelectAll}
          >
            {fb.files.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-sm text-muted">
                  {fb.isSearching
                    ? t('files.noFilesSearch')
                    : fb.currentFolder
                      ? t('files.noFilesFolder')
                      : t('files.noFilesRoot')}
                </td>
              </tr>
            ) : (
              fb.files.map((file) => (
                <FileRow
                  key={file.id}
                  file={file}
                  isSelected={fb.selectedFileIds.has(file.id)}
                  isMenuOpen={fb.openMenuId?.kind === 'file' && fb.openMenuId.id === file.id}
                  isShareOpen={shareState.inlineShareFileId === file.id}
                  canManage={fb.canManageFile(file)}
                  isGuest={fb.isGuest}
                  scope={fb.scope}
                  lang={fb.lang}
                  shareSearch={shareState.shareSearch}
                  shareError={shareState.shareError}
                  filteredShareMembers={shareState.filteredShareMembers}
                  fileShares={shareState.fileShares}
                  isLoadingShares={shareState.isLoadingShares}
                  isSharePending={shareState.createShareMutation.isPending}
                  isRevokePending={shareState.revokeShareMutation.isPending}
                  onToggleSelect={fb.toggleFileSelection}
                  onMenuToggle={(id) => fb.setOpenMenuId(id !== null ? { kind: 'file', id } : null)}
                  onDownload={fb.handleDownload}
                  onRename={(f) => fb.setRenameTarget({ kind: 'file', file: f })}
                  onDelete={(f) => fb.setConfirmAction({ type: 'delete-file', file: f })}
                  onToggleShare={(id) => shareState.openShare(shareState.inlineShareFileId === id ? null : id)}
                  onCloseShare={() => { shareState.openShare(null); shareState.setShareError(null); shareState.setShareSearch(''); }}
                  onShareSearchChange={shareState.setShareSearch}
                  onGrantShare={(fileId, userId) => shareState.createShareMutation.mutate({ fileId, userId })}
                  onRevokeShareConfirm={shareState.onRequestRevokeConfirm}
                />
              ))
            )}
          </FilesTableShell>

          {/* Shared-with-me */}
          {fb.scope === 'personal' && !fb.isGuest && fb.sharedWithMe.length > 0 && (
            <section className="rounded-xl border border-default bg-surface p-4">
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
                {t('files.sharedWithMe')}
              </h2>
              {fb.sharedWithMeLoading && <p className="text-sm text-muted">{t('common.loading')}</p>}
              {fb.sharedWithMeError && <p className="text-sm text-danger-badge">{t('files.shareLoadError')}</p>}
              <ul className="space-y-2">
                {fb.sharedWithMe.map((share) => (
                  <li key={share.id} className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-default px-3 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-secondary">{share.file_name}</p>
                      <p className="text-xs text-muted">{t('files.fileOwner', { name: share.file_owner_name })}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => fb.handleDownload(share.file_id, share.file_name || `file-${share.file_id}`)}
                      className="shrink-0 rounded border border-default px-2 py-1 text-xs text-secondary hover:bg-hover transition-colors"
                    >
                      <Download size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* ── Right column ── */}
        <StoragePanel
          usedBytes={fb.usedBytes}
          limitBytes={fb.limitBytes}
          fileCount={fb.fileCount}
          arcUsed={fb.arcUsed}
          arcAll={fb.arcAll}
          gaugePct={fb.gaugePct}
          bytesCats={fb.bytesCats}
          bytesTotal={fb.bytesTotal}
        />
      </div>

      {/* Modals */}
      <ConfirmModal
        isOpen={fb.confirmAction !== null}
        onClose={() => !fb.isDeletePending && fb.setConfirmAction(null)}
        onConfirm={fb.handleConfirmAction}
        title={
          fb.confirmAction?.type === 'delete-folder'
            ? t('files.deleteFolder')
            : fb.confirmAction?.type === 'delete-file'
              ? t('files.deleteFile')
              : t('files.revokeShare')
        }
        description={
          fb.confirmAction?.type === 'delete-folder'
            ? t('files.deleteFolderDesc', { name: fb.confirmAction.folder.name })
            : fb.confirmAction?.type === 'delete-file'
              ? t('files.deleteFileDesc', { name: fb.confirmAction.file.name })
              : t('files.revokeShareDesc')
        }
        confirmLabel={fb.confirmAction?.type === 'revoke-share' ? t('files.revoke') : t('common.delete')}
        variant="danger"
        isLoading={fb.isDeletePending}
      />

      <PromptModal
        isOpen={fb.renameTarget !== null}
        onClose={() => !fb.isRenamePending && fb.setRenameTarget(null)}
        onConfirm={fb.handleConfirmRename}
        title={fb.renameTarget?.kind === 'folder' ? t('files.renameFolder') : t('files.renameFile')}
        label={t('files.newName')}
        defaultValue={fb.renameTarget?.kind === 'folder' ? fb.renameTarget.folder.name : (fb.renameTarget?.file.name ?? '')}
        confirmLabel={t('common.save')}
        isLoading={fb.isRenamePending}
      />

      <PromptModal
        isOpen={fb.showNewFolderModal}
        onClose={() => !fb.isCreateFolderPending && fb.setShowNewFolderModal(false)}
        onConfirm={fb.handleCreateFolder}
        title={t('files.newFolder')}
        label={t('files.folderNamePlaceholder')}
        defaultValue=""
        confirmLabel={t('common.create')}
        isLoading={fb.isCreateFolderPending}
      />

      <ConfirmModal
        isOpen={fb.confirmBulkDelete}
        onClose={() => !fb.isBulkDeletePending && fb.setConfirmBulkDelete(false)}
        onConfirm={fb.handleBulkDelete}
        title={t('files.deleteFile')}
        description={t('files.deleteFileDesc', { name: t('files.selectedCount', { count: fb.selectedFileIds.size }) })}
        confirmLabel={t('common.delete')}
        variant="danger"
        isLoading={fb.isBulkDeletePending}
      />
    </div>
  );
}
