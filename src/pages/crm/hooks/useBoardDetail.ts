import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  closestCenter,
  pointerWithin,
  type CollisionDetection,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { API } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import { checkWipLimit } from '@/shared/lib/crm-wip-limit';
import { useWipLimitToast, WIP_LIMIT_VIOLATION_MESSAGE_KEY } from '@/pages/crm/hooks/useWipLimitToast';
import i18n from '@/shared/lib/i18n';
import { useDebounce } from '@/pages/crm/hooks/useDebounce';
import type { BoardFilters } from '@/pages/crm/components/BoardFilterBar';
import { DEFAULT_BOARD_FILTERS } from '@/pages/crm/components/BoardFilterBar';
import type { CrmBoard, CrmColumn, CrmTask, CrmLabel, CompanyMember, PaginatedResponse } from '@/shared/types';

export function useBoardDetail() {
  const { id } = useParams<{ id: string }>();
  const boardId = id ?? '';
  const [searchParams, setSearchParams] = useSearchParams();

  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<BoardFilters>(DEFAULT_BOARD_FILTERS);
  const debouncedSearch = useDebounce(filters.search, 300);
  const [localColumns, setLocalColumns] = useState<CrmColumn[]>([]);
  const [localTasksByColumn, setLocalTasksByColumn] = useState<Record<number, CrmTask[]>>({});
  const [activeColumn, setActiveColumn] = useState<CrmColumn | null>(null);
  const [activeTask, setActiveTask] = useState<CrmTask | null>(null);
  const [activeDragType, setActiveDragType] = useState<'column' | 'task' | null>(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [archivePanelOpen, setArchivePanelOpen] = useState(false);
  const [reorderError, setReorderError] = useState(false);
  const [taskMoveError, setTaskMoveError] = useState<string | null>(null);
  const [focusTaskAfterDropId, setFocusTaskAfterDropId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(() => {
    const taskParam = searchParams.get('task');
    return taskParam ? Number(taskParam) : null;
  });
  const reorderErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taskMoveErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapshotRef = useRef<CrmColumn[]>([]);
  const taskSnapshotRef = useRef<Record<number, CrmTask[]>>({});
  const wipDragBlockedToastShownRef = useRef(false);
  const activeDragTypeRef = useRef<'column' | 'task' | null>(null);
  const localTasksByColumnRef = useRef<Record<number, CrmTask[]>>({});

  const { showWipLimitToast, WipLimitToast } = useWipLimitToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const collisionDetectionStrategy: CollisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    return pointerCollisions.length > 0 ? pointerCollisions : closestCenter(args);
  }, []);

  const {
    data: board,
    isLoading: isBoardLoading,
    isError: isBoardError,
    error: boardError,
  } = useQuery({
    queryKey: ['crm', 'board', boardId],
    queryFn: async () => {
      const { data } = await apiClient.get<CrmBoard>(API.crm.board(boardId));
      return data;
    },
    enabled: Boolean(boardId),
  });

  const {
    data: columns,
    isLoading: isColumnsLoading,
    isError: isColumnsError,
  } = useQuery({
    queryKey: ['crm', 'columns', boardId],
    queryFn: async () => {
      const { data } = await apiClient.get<CrmColumn[] | { results: CrmColumn[] }>(
        API.crm.columns(boardId),
      );
      return Array.isArray(data) ? data : data.results;
    },
    enabled: Boolean(boardId),
  });

  const companyId = board?.company != null ? String(board.company) : null;

  const { data: membersData } = useQuery({
    queryKey: ['company-members', companyId, 'board-filter'],
    enabled: Boolean(companyId),
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<CompanyMember>>(API.companies.members(companyId!), {
          params: { page_size: 100, is_active: 'true' },
        })
        .then((r) => r.data),
  });

  const members = membersData?.results ?? [];

  const { data: labelsData } = useQuery({
    queryKey: ['crm', 'labels'],
    queryFn: () =>
      apiClient.get<CrmLabel[]>(API.crm.labels).then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : (d as { results: CrmLabel[] }).results;
      }),
  });
  const boardLabels = labelsData ?? [];

  const taskQueryParams: Record<string, string | number> = { board_id: boardId };
  if (debouncedSearch) taskQueryParams.search = debouncedSearch;
  if (filters.priority) taskQueryParams.priority = filters.priority;
  if (filters.deadline) taskQueryParams.deadline = filters.deadline;
  if (filters.ordering) taskQueryParams.ordering = filters.ordering;
  if (filters.assignee_id) taskQueryParams.assignee_id = filters.assignee_id;
  if (filters.label_ids.length > 0) taskQueryParams.label_ids = filters.label_ids.join(',');
  if (filters.view === 'list') taskQueryParams.view = 'list';

  const { data: tasksData, isLoading: isTasksLoading } = useQuery({
    queryKey: ['crm', 'tasks', boardId, taskQueryParams],
    queryFn: async () => {
      const { data } = await apiClient.get<CrmTask[] | { results: CrmTask[]; count?: number }>(
        API.crm.tasksList,
        { params: taskQueryParams },
      );
      return Array.isArray(data) ? data : data.results;
    },
    enabled: Boolean(boardId),
  });

  const tasks = (tasksData ?? []).filter((t) => !t.is_archived);

  useEffect(() => {
    if (columns) setLocalColumns([...columns].sort((a, b) => a.order - b.order));
  }, [columns]);

  useEffect(() => {
    if (!tasksData) return;
    const grouped = tasksData.reduce<Record<number, CrmTask[]>>((acc, task) => {
      if (task.is_archived) return acc;
      const col = task.column_id;
      if (!acc[col]) acc[col] = [];
      acc[col].push(task);
      return acc;
    }, {});
    for (const col of Object.keys(grouped)) {
      grouped[Number(col)].sort((a, b) => a.position - b.position || a.id - b.id);
    }
    localTasksByColumnRef.current = grouped;
    setLocalTasksByColumn(grouped);
  }, [tasksData]);

  useEffect(() => {
    if (focusTaskAfterDropId === null) return;
    const frame = requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(`[data-task-id="${focusTaskAfterDropId}"]`);
      target?.focus();
      setFocusTaskAfterDropId(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [focusTaskAfterDropId, localTasksByColumn]);

  const reorderMutation = useMutation({
    mutationFn: (columnIds: number[]) =>
      apiClient.post(API.crm.columnsReorder(boardId), { column_ids: columnIds }),
    onError: () => {
      setLocalColumns(snapshotRef.current);
      queryClient.setQueryData<CrmColumn[]>(['crm', 'columns', boardId], snapshotRef.current);
      setReorderError(true);
      if (reorderErrorTimerRef.current) clearTimeout(reorderErrorTimerRef.current);
      reorderErrorTimerRef.current = setTimeout(() => setReorderError(false), 3000);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'columns', boardId] });
    },
  });

  const taskMoveMutation = useMutation({
    mutationFn: ({
      taskId,
      columnId,
      position,
    }: {
      taskId: number;
      columnId: number;
      position: number;
    }) => apiClient.post(API.crm.taskMove(taskId), { column_id: columnId, order: position }),
    onError: (error: unknown) => {
      localTasksByColumnRef.current = taskSnapshotRef.current;
      setLocalTasksByColumn(taskSnapshotRef.current);
      let message = 'Не удалось переместить задачу.';
      const axiosError = error as { response?: { status?: number; data?: unknown } };
      if (axiosError.response?.status === 400) {
        const data = axiosError.response.data as Record<string, unknown> | undefined;
        const raw = data?.detail ?? (data?.non_field_errors as unknown[])?.[0];
        const detail = typeof raw === 'string' ? raw : JSON.stringify(raw ?? '');
        if (detail.toLowerCase().includes('wip')) {
          message = i18n.t(WIP_LIMIT_VIOLATION_MESSAGE_KEY);
        }
      }
      setTaskMoveError(message);
      if (taskMoveErrorTimerRef.current) clearTimeout(taskMoveErrorTimerRef.current);
      taskMoveErrorTimerRef.current = setTimeout(() => setTaskMoveError(null), 4000);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['crm', 'tasks', boardId] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-recent'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    const sid = String(event.active.id);
    if (sid.startsWith('task-')) {
      const taskId = Number(sid.replace('task-', ''));
      const task = tasks.find((t) => t.id === taskId) ?? null;
      setActiveTask(task);
      setActiveDragType('task');
      activeDragTypeRef.current = 'task';
      wipDragBlockedToastShownRef.current = false;
      taskSnapshotRef.current = structuredClone(localTasksByColumnRef.current);
    } else {
      const col = localColumns.find((c) => c.id === event.active.id);
      setActiveColumn(col ?? null);
      setActiveDragType('column');
      activeDragTypeRef.current = 'column';
      snapshotRef.current = [...localColumns];
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (activeDragTypeRef.current !== 'task') return;

    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = over.id;

    if (!activeId.startsWith('task-')) return;

    const activeTaskId = Number(activeId.replace('task-', ''));

    const currentTasksByColumn = localTasksByColumnRef.current;

    let sourceColId: number | undefined;
    for (const [colId, colTasks] of Object.entries(currentTasksByColumn)) {
      if (colTasks.some((t) => t.id === activeTaskId)) {
        sourceColId = Number(colId);
        break;
      }
    }
    if (sourceColId === undefined) return;

    let targetColId: number;
    if (typeof overId === 'string' && overId.startsWith('task-')) {
      const overTaskId = Number(overId.replace('task-', ''));
      let overTaskColId: number | undefined;
      for (const [colId, colTasks] of Object.entries(currentTasksByColumn)) {
        if (colTasks.some((t) => t.id === overTaskId)) {
          overTaskColId = Number(colId);
          break;
        }
      }
      targetColId = overTaskColId ?? sourceColId;
    } else if (typeof overId === 'number') {
      targetColId = overId;
    } else {
      return;
    }

    if (sourceColId === targetColId) {
      if (typeof overId === 'string' && overId.startsWith('task-')) {
        const overTaskId = Number(overId.replace('task-', ''));
        const list = [...(currentTasksByColumn[sourceColId] ?? [])];
        const fromIdx = list.findIndex((t) => t.id === activeTaskId);
        const toIdx = list.findIndex((t) => t.id === overTaskId);
        if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
        const reordered = arrayMove(list, fromIdx, toIdx);
        localTasksByColumnRef.current = {
          ...currentTasksByColumn,
          [sourceColId]: reordered,
        };
        setLocalTasksByColumn(localTasksByColumnRef.current);
      }
      return;
    }

    const taskCountByColumnIdForWip = Object.fromEntries(
      Object.entries(currentTasksByColumn).map(([k, v]) => [Number(k), v.length]),
    );
    const wipCross = checkWipLimit({
      columns: localColumns,
      taskCountByColumnId: taskCountByColumnIdForWip,
      targetColumnId: targetColId,
      tasksToAddCount: 1,
      sourceColumnId: sourceColId,
    });
    if (!wipCross.ok) {
      if (!wipDragBlockedToastShownRef.current) {
        wipDragBlockedToastShownRef.current = true;
        showWipLimitToast();
      }
      return;
    }

    const sourceList = [...(currentTasksByColumn[sourceColId] ?? [])];
    const targetList = [...(currentTasksByColumn[targetColId] ?? [])];
    const taskIndex = sourceList.findIndex((t) => t.id === activeTaskId);
    if (taskIndex === -1) return;
    const [movedTask] = sourceList.splice(taskIndex, 1);
    const updatedTask = { ...movedTask, column_id: targetColId };

    if (typeof overId === 'string' && overId.startsWith('task-')) {
      const overTaskId = Number(overId.replace('task-', ''));
      const overIdx = targetList.findIndex((t) => t.id === overTaskId);
      if (overIdx !== -1) {
        targetList.splice(overIdx, 0, updatedTask);
      } else {
        targetList.push(updatedTask);
      }
    } else {
      targetList.push(updatedTask);
    }

    localTasksByColumnRef.current = {
      ...currentTasksByColumn,
      [sourceColId]: sourceList,
      [targetColId]: targetList,
    };
    setLocalTasksByColumn(localTasksByColumnRef.current);
  };

  const handleDragCancel = (_event: DragCancelEvent) => {
    const dragType = activeDragTypeRef.current;
    setActiveColumn(null);
    setActiveTask(null);
    setActiveDragType(null);
    activeDragTypeRef.current = null;
    if (dragType === 'column') {
      setLocalColumns(snapshotRef.current);
    } else if (dragType === 'task') {
      localTasksByColumnRef.current = taskSnapshotRef.current;
      setLocalTasksByColumn(taskSnapshotRef.current);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const dragType = activeDragTypeRef.current;
    setActiveColumn(null);
    setActiveTask(null);
    setActiveDragType(null);
    activeDragTypeRef.current = null;

    if (dragType === 'column') {
      if (!over) {
        setLocalColumns(snapshotRef.current);
        return;
      }
      if (active.id === over.id) return;

      const oldIndex = localColumns.findIndex((c) => c.id === active.id);
      const newIndex = localColumns.findIndex((c) => c.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(localColumns, oldIndex, newIndex).map((col, idx) => ({
        ...col,
        order: idx + 1,
      }));
      setLocalColumns(reordered);
      reorderMutation.mutate(reordered.map((c) => c.id));
      return;
    }

    if (dragType === 'task') {
      if (!over) {
        setLocalTasksByColumn(taskSnapshotRef.current);
        return;
      }

      const activeId = active.id as string;

      if (!activeId.startsWith('task-')) return;

      const activeTaskId = Number(activeId.replace('task-', ''));

      const finalTasksByColumn = localTasksByColumnRef.current;

      let targetColId: number | null = null;
      let taskOrderInTarget = 1;

      for (const [colIdStr, colTasks] of Object.entries(finalTasksByColumn)) {
        const idx = colTasks.findIndex((t) => t.id === activeTaskId);
        if (idx !== -1) {
          targetColId = Number(colIdStr);
          taskOrderInTarget = idx + 1;
          break;
        }
      }

      if (targetColId === null) {
        setLocalTasksByColumn(taskSnapshotRef.current);
        return;
      }

      let originalColId: number | null = null;
      let originalVisualIndex = -1;
      for (const [colIdStr, colTasks] of Object.entries(taskSnapshotRef.current)) {
        const idx = colTasks.findIndex((t) => t.id === activeTaskId);
        if (idx !== -1) {
          originalColId = Number(colIdStr);
          originalVisualIndex = idx;
          break;
        }
      }

      const hasColumnChanged = originalColId !== targetColId;
      const hasPositionChanged = originalVisualIndex !== taskOrderInTarget - 1;

      if (!hasColumnChanged && !hasPositionChanged) return;

      if (hasColumnChanged) {
        const snapshotCounts = Object.fromEntries(
          Object.entries(taskSnapshotRef.current).map(([k, v]) => [Number(k), v.length]),
        );
        const wipBeforeMove = checkWipLimit({
          columns: localColumns,
          taskCountByColumnId: snapshotCounts,
          targetColumnId: targetColId,
          tasksToAddCount: 1,
          sourceColumnId: originalColId ?? undefined,
        });
        if (!wipBeforeMove.ok) {
          localTasksByColumnRef.current = taskSnapshotRef.current;
          setLocalTasksByColumn(taskSnapshotRef.current);
          showWipLimitToast();
          return;
        }
      }

      taskMoveMutation.mutate({
        taskId: activeTaskId,
        columnId: targetColId,
        position: taskOrderInTarget,
      });
    }
  };

  const closeTaskModal = useCallback(() => {
    setSelectedTaskId(null);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('task');
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  const isLoading = isBoardLoading || isColumnsLoading;
  const isError = isBoardError || isColumnsError;

  return {
    boardId,
    board,
    isLoading,
    isError,
    boardError,
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
  };
}

export type BoardDetailController = ReturnType<typeof useBoardDetail>;
