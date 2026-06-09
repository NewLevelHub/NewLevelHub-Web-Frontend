import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import {
  ChevronLeft,
  LayoutGrid,
  AlertCircle,
  Building2,
  Inbox,
  Plus,
  Archive,
} from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { useAuth } from '@/shared/hooks/useAuth';
import type { BoardDetailController } from '@/pages/crm/hooks/useBoardDetail';
import { BoardFilterBar } from '@/pages/crm/components/BoardFilterBar';
import { BoardTaskListView } from '@/pages/crm/components/BoardTaskListView';
import { CrmSortableColumn } from '@/pages/crm/components/CrmSortableColumn';
import { CrmKanbanColumn } from '@/pages/crm/components/CrmKanbanColumn';
import { CrmTaskCard } from '@/pages/crm/components/CrmTaskCard';
import { InlineAddColumn } from '@/pages/crm/components/InlineAddColumn';
import { AddColumnButton } from '@/pages/crm/components/AddColumnButton';
import { TaskDetailModal } from '@/pages/crm/components/TaskDetailModal';
import { ArchivePanel } from '@/pages/crm/components/ArchivePanel';

export interface BoardDetailMainProps {
  ctx: BoardDetailController;
}

export function BoardDetailMain({ ctx }: BoardDetailMainProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();
  const backTo = (location.state as { backTo?: string; companyName?: string } | null)?.backTo ?? '/crm';
  const companyName = (location.state as { backTo?: string; companyName?: string } | null)?.companyName;

  const {
    boardId,
    board,
    filters,
    setFilters,
    members,
    boardLabels,
    localColumns,
    localTasksByColumn,
    activeColumn,
    activeTask,
    activeDragType,
    showAddColumn,
    setShowAddColumn,
    archivePanelOpen,
    setArchivePanelOpen,
    reorderError,
    taskMoveError,
    selectedTaskId,
    setSelectedTaskId,
    tasks,
    isTasksLoading,
    sensors,
    collisionDetectionStrategy,
    handleDragStart,
    handleDragOver,
    handleDragCancel,
    handleDragEnd,
    WipLimitToast,
    showWipLimitToast,
    closeTaskModal,
  } = ctx;

  if (!board) return null;

  return (
    <div className="space-y-6">
      {WipLimitToast}
      <Link
        to={backTo}
        className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-primary transition-colors"
      >
        <ChevronLeft size={16} />{t('common.backToBoards')}</Link>

      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-blue-600/20 p-2 shrink-0">
          <LayoutGrid size={20} className="text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[22px] font-bold text-[color:var(--text-primary)]">{board.name}</h1>
          {companyName && (
            <div className="flex items-center gap-1 mt-0.5">
              <Building2 size={12} className="text-[color:var(--text-muted)] shrink-0" />
              <span className="text-[13px] text-[color:var(--text-muted)]">{companyName}</span>
            </div>
          )}
          {board.description && <p className="text-[13px] text-[color:var(--text-muted)] mt-0.5">{board.description}</p>}
        </div>
        {members.length > 0 && (
          <div className="flex items-center -space-x-2 shrink-0">
            {members.slice(0, 5).map((m) => (
              <div
                key={m.id}
                title={m.full_name}
                className="w-7 h-7 rounded-full bg-raised border-2 border-[var(--bg-page)] flex items-center justify-center text-[10px] font-semibold text-secondary overflow-hidden ring-0 shrink-0"
              >
                {m.avatar
                  ? <img src={m.avatar} alt={m.full_name} className="w-full h-full object-cover" />
                  : m.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('')
                }
              </div>
            ))}
            {members.length > 5 && (
              <div className="w-7 h-7 rounded-full bg-raised border-2 border-[var(--bg-page)] flex items-center justify-center text-[10px] font-semibold text-muted">
                +{members.length - 5}
              </div>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => setArchivePanelOpen(true)}
          className="inline-flex items-center gap-2 h-[34px] px-3 text-[13px] font-medium border border-[color:var(--border)] text-[color:var(--text-secondary)] rounded-[var(--radius-sm)] hover:bg-[color:var(--bg-hover)] transition-colors shrink-0"
          aria-label={t('common.openArchive')}
        >
          <Archive size={15} />
          {t('crm.archiveLabel')}
        </button>
      </div>

      {reorderError && (
        <div
          className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-danger-subtle px-4 py-3 text-sm text-danger"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle size={16} className="shrink-0" />
          <span>{t('common.reorderError')}</span>
        </div>
      )}

      {taskMoveError && (
        <div
          className="flex items-center gap-2 rounded-lg border border-orange-800 bg-orange-900/30 px-4 py-3 text-sm text-orange-300"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle size={16} className="shrink-0" />
          <span>{taskMoveError}</span>
        </div>
      )}

      <div className="bg-[color:var(--bg-surface)] border border-[color:var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-card)]">
        <BoardFilterBar
          filters={filters}
          onChange={setFilters}
          members={members}
          currentUserId={user?.id}
          labels={boardLabels}
        />
      </div>

      {filters.view === 'list' ? (
        <BoardTaskListView
          tasks={tasks}
          columns={localColumns}
          isLoading={isTasksLoading}
          onTaskClick={(taskId) => setSelectedTaskId(taskId)}
        />
      ) : (
        <>
          {localColumns.length === 0 && !showAddColumn ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Inbox size={32} className="text-muted" />
              <p className="text-muted text-sm">{t('common.noColumns')}</p>
              <button
                type="button"
                onClick={() => setShowAddColumn(true)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  'bg-blue-600 text-white hover:bg-blue-500',
                )}
              >
                <Plus size={16} />{t('common.addColumn')}</button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={collisionDetectionStrategy}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <SortableContext items={localColumns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
                <div
                  className="flex gap-4 overflow-x-auto pb-6"
                  role="main"
                  aria-label={`Канбан-доска: ${board.name}`}
                >
                  {localColumns.map((column) => (
                    <CrmSortableColumn
                      key={column.id}
                      column={column}
                      allColumns={localColumns}
                      boardId={boardId}
                      boardCompanyId={board.company}
                      tasks={isTasksLoading ? [] : localTasksByColumn[column.id] ?? []}
                      taskCountByColumnId={Object.fromEntries(
                        Object.entries(localTasksByColumn).map(([k, v]) => [Number(k), v.length]),
                      )}
                      onTaskClick={(taskId) => setSelectedTaskId(taskId)}
                    />
                  ))}

                  {showAddColumn ? (
                    <InlineAddColumn boardId={boardId} onDone={() => setShowAddColumn(false)} />
                  ) : (
                    <AddColumnButton onClick={() => setShowAddColumn(true)} />
                  )}
                </div>
              </SortableContext>
              <DragOverlay>
                {activeDragType === 'column' && activeColumn ? (
                  <CrmKanbanColumn
                    column={activeColumn}
                    allColumns={localColumns}
                    boardId={boardId}
                    boardCompanyId={board.company}
                    tasks={localTasksByColumn[activeColumn.id] ?? []}
                    taskCountByColumnId={Object.fromEntries(
                      Object.entries(localTasksByColumn).map(([k, v]) => [Number(k), v.length]),
                    )}
                    onTaskClick={() => undefined}
                    isDragOverlay
                  />
                ) : activeDragType === 'task' && activeTask ? (
                  <div className="rotate-2 opacity-90 shadow-2xl">
                    <CrmTaskCard task={activeTask} onClick={() => undefined} />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </>
      )}

      {selectedTaskId !== null && (
        <TaskDetailModal taskId={selectedTaskId} boardId={boardId} boardCompanyId={board.company} onClose={closeTaskModal} />
      )}

      {archivePanelOpen && (
        <ArchivePanel
          boardId={boardId}
          columns={localColumns}
          taskCountByColumnId={Object.fromEntries(
            Object.entries(localTasksByColumn).map(([k, v]) => [Number(k), v.length]),
          )}
          onClose={() => setArchivePanelOpen(false)}
          onTaskOpen={(tid) => {
            setSelectedTaskId(tid);
            setArchivePanelOpen(false);
          }}
          onRestoreWipBlocked={showWipLimitToast}
        />
      )}
    </div>
  );
}
