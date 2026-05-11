import { Link } from 'react-router';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import {
  ChevronLeft,
  LayoutGrid,
  AlertCircle,
  Inbox,
  Plus,
  Archive,
} from 'lucide-react';
import { cn } from '@/shared/lib/cn';
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
  const {
    boardId,
    board,
    filters,
    setFilters,
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
        to="/crm"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ChevronLeft size={16} />
        Назад к доскам
      </Link>

      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-blue-600/20 p-2 shrink-0">
          <LayoutGrid size={20} className="text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-white">{board.name}</h1>
          {board.description && <p className="text-sm text-gray-500 mt-0.5">{board.description}</p>}
        </div>
        <button
          type="button"
          onClick={() => setArchivePanelOpen(true)}
          className={cn(
            'flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 text-sm font-medium shrink-0',
            'text-gray-400 hover:text-white hover:border-gray-500 transition-colors',
          )}
          aria-label="Открыть архив задач"
        >
          <Archive size={15} />
          Архив
        </button>
      </div>

      {reorderError && (
        <div
          className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle size={16} className="shrink-0" />
          <span>Не удалось сохранить порядок колонок. Порядок восстановлен.</span>
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

      <BoardFilterBar filters={filters} onChange={setFilters} />

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
              <Inbox size={32} className="text-gray-600" />
              <p className="text-gray-500 text-sm">В этой доске нет колонок</p>
              <button
                type="button"
                onClick={() => setShowAddColumn(true)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  'bg-blue-600 text-white hover:bg-blue-500',
                )}
              >
                <Plus size={16} />
                Добавить колонку
              </button>
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
        <TaskDetailModal taskId={selectedTaskId} boardId={boardId} onClose={closeTaskModal} />
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
