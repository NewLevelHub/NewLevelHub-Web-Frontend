import type { CrmColumn } from '@/shared/types';

export type WipLimitCheckReason = 'wip_exceeded';

export type WipLimitCheckResult =
  | { ok: true }
  | {
      ok: false;
      reason: WipLimitCheckReason;
      columnName: string;
      limit: number;
      current: number;
    };

export interface CheckWipLimitArgs {
  columns: Pick<CrmColumn, 'id' | 'name' | 'wip_limit'>[];
  taskCountByColumnId: Record<number, number> | Map<number, number>;
  targetColumnId: number;
  tasksToAddCount: number;
  sourceColumnId?: number;
}

function getCount(
  taskCountByColumnId: Record<number, number> | Map<number, number>,
  columnId: number,
): number {
  if (taskCountByColumnId instanceof Map) {
    return taskCountByColumnId.get(columnId) ?? 0;
  }
  return taskCountByColumnId[columnId] ?? 0;
}

/**
 * Client-side WIP check for CRM Kanban. When `sourceColumnId` equals `targetColumnId`,
 * net add to the target is 0 (same-column move / reorder).
 */
export function checkWipLimit(args: CheckWipLimitArgs): WipLimitCheckResult {
  const column = args.columns.find((c) => c.id === args.targetColumnId);
  if (!column || column.wip_limit === null) {
    return { ok: true };
  }

  const limit = column.wip_limit;
  const current = getCount(args.taskCountByColumnId, args.targetColumnId);
  const netAdd =
    args.sourceColumnId !== undefined && args.sourceColumnId === args.targetColumnId
      ? 0
      : args.tasksToAddCount;

  if (current + netAdd <= limit) {
    return { ok: true };
  }

  return {
    ok: false,
    reason: 'wip_exceeded',
    columnName: column.name,
    limit,
    current,
  } as const;
}
