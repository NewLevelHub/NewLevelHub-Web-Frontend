import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import {
  Search,
  X,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
  Paperclip,
  MessageSquare,
  ListTodo,
} from 'lucide-react';
import { formatDeadline, isOverdue, CRM_PRIORITY_LABEL_KEYS } from '@/pages/crm/utils/crm-display';
import type { CrmTask } from '@/shared/types';
import { useMyTasks } from '@/pages/crm/hooks/useMyTasks';

export type MyTasksViewProps = ReturnType<typeof useMyTasks>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isDueSoon(iso: string): boolean {
  if (isOverdue(iso)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(iso);
  deadline.setHours(0, 0, 0, 0);
  const diffMs = deadline.getTime() - today.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= 3;
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function MyTasksSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[...Array(2)].map((_, i) => (
        <div
          key={i}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          <div
            className="animate-pulse"
            style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <div style={{ width: 14, height: 14, borderRadius: 3, background: 'var(--bg-raised)' }} />
            <div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--bg-raised)' }} />
            <div style={{ height: 13, width: 180, borderRadius: 4, background: 'var(--bg-raised)', flex: 1 }} />
            <div style={{ height: 20, width: 60, borderRadius: 4, background: 'var(--bg-raised)' }} />
          </div>
          {[...Array(3)].map((_, j) => (
            <div
              key={j}
              className="animate-pulse"
              style={{
                padding: '10px 12px',
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                borderTop: '1px solid var(--border-faint)',
              }}
            >
              <div style={{ height: 13, flex: 2, borderRadius: 4, background: 'var(--bg-raised)' }} />
              <div style={{ height: 13, flex: 1, borderRadius: 4, background: 'var(--bg-raised)' }} />
              <div style={{ height: 13, flex: 1, borderRadius: 4, background: 'var(--bg-raised)' }} />
              <div style={{ height: 13, flex: 0.5, borderRadius: 4, background: 'var(--bg-raised)' }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table style constants
// ---------------------------------------------------------------------------

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 500,
  color: 'var(--text-muted)',
  padding: '8px 12px',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 13,
  color: 'var(--text-primary)',
  verticalAlign: 'middle',
};

const selStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 'var(--radius-sm)',
  fontSize: 12,
  border: '1px solid var(--border)',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  fontFamily: 'inherit',
  outline: 'none',
  cursor: 'pointer',
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function MyTasksView(props: MyTasksViewProps) {
  const { t } = useTranslation();
  const {
    filters,
    setFilters,
    groups,
    isLoading,
    isError,
    hasActiveFilters,
    handleReset,
    loadMoreForBoard,
    loadingMoreBoard,
  } = props;

  // Collapsible state — all boards open by default
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (groups.length > 0) {
      setExpanded(new Set(groups.map((g) => g.board_id)));
    }
  }, [groups.length]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleGroup(boardId: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(boardId)) {
        next.delete(boardId);
      } else {
        next.add(boardId);
      }
      return next;
    });
  }

  // Priority config using CSS custom properties only
  const PRIORITY_CFG: Record<CrmTask['priority'], { col: string; bg: string }> = {
    high: { col: 'var(--warning)', bg: 'var(--warning-bg)' },
    medium: { col: 'var(--info)', bg: 'var(--info-bg, var(--bg-raised))' },
    low: { col: 'var(--text-muted)', bg: 'var(--bg-raised)' },
  };

  const totalFiltered = groups.reduce((sum, g) => sum + g.tasks.length, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ------------------------------------------------------------------ */}
      {/* Page header                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 18,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: '-0.025em',
              color: 'var(--text-primary)',
            }}
          >
            {t('myTasks.title')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            {t('myTasks.subtitle', { count: totalFiltered, boards: groups.length })}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Filter bar                                                           */}
      {/* ------------------------------------------------------------------ */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        {/* Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '5px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            minWidth: 200,
          }}
        >
          <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder={t('myTasks.searchPlaceholder')}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: 12,
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
              flex: 1,
              width: 140,
            }}
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => setFilters((f) => ({ ...f, search: '' }))}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                color: 'var(--text-subtle)',
                lineHeight: 1,
                display: 'flex',
              }}
            >
              <X size={11} />
            </button>
          )}
        </div>

        {/* Priority filter */}
        <select
          value={filters.priority}
          onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
          style={selStyle}
        >
          <option value="">{t('myTasks.filterPriorityAll')}</option>
          {(['low', 'medium', 'high'] as CrmTask['priority'][]).map((v) => (
            <option key={v} value={v}>
              {t(CRM_PRIORITY_LABEL_KEYS[v])}
            </option>
          ))}
        </select>

        {/* Deadline filter */}
        <select
          value={filters.deadline}
          onChange={(e) => setFilters((f) => ({ ...f, deadline: e.target.value }))}
          style={selStyle}
        >
          <option value="">{t('myTasks.filterDeadlineAll')}</option>
          <option value="overdue">{t('myTasks.filterOverdue')}</option>
          <option value="today">{t('myTasks.filterToday')}</option>
          <option value="this_week">{t('myTasks.filterThisWeek')}</option>
        </select>

        {/* Ordering */}
        <select
          value={filters.ordering}
          onChange={(e) => setFilters((f) => ({ ...f, ordering: e.target.value }))}
          style={selStyle}
        >
          <option value="-created_at">{t('myTasks.sortNewest')}</option>
          <option value="created_at">{t('myTasks.sortOldest')}</option>
          <option value="deadline">{t('myTasks.sortDeadlineAsc')}</option>
          <option value="-deadline">{t('myTasks.sortDeadlineDesc')}</option>
          <option value="priority">{t('myTasks.sortPriorityAsc')}</option>
          <option value="-priority">{t('myTasks.sortPriorityDesc')}</option>
        </select>

        {/* Reset button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 12,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            {t('common.reset')}
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Content                                                              */}
      {/* ------------------------------------------------------------------ */}
      {isLoading ? (
        <MyTasksSkeleton />
      ) : isError ? (
        <div
          role="alert"
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--danger)',
            background: 'var(--danger-bg)',
            color: 'var(--danger-text)',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertTriangle size={15} />
          {t('myTasks.loadError')}
        </div>
      ) : groups.length === 0 ? (
        /* Empty state */
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-card)',
            padding: '52px 20px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'var(--bg-raised)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
            }}
          >
            <ListTodo size={26} style={{ color: 'var(--text-muted)' }} strokeWidth={1.4} />
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 5,
            }}
          >
            {hasActiveFilters ? t('myTasks.emptyFiltered') : t('myTasks.emptyAll')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {hasActiveFilters ? t('myTasks.emptyFilteredHint') : t('myTasks.emptyAllHint')}
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleReset}
              style={{
                marginTop: 14,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 28,
                padding: '0 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {t('common.resetFilters')}
            </button>
          )}
        </div>
      ) : (
        /* Board groups */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {groups.map((group) => {
            const isOpen = expanded.has(group.board_id);
            return (
              <div
                key={group.board_id}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-card)',
                  overflow: 'hidden',
                  marginBottom: 10,
                }}
              >
                {/* Group header */}
                <div
                  onClick={() => toggleGroup(group.board_id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: isOpen ? '1px solid var(--border-faint)' : 'none',
                  }}
                >
                  <ChevronRight
                    size={14}
                    style={{
                      color: 'var(--text-muted)',
                      transform: isOpen ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.15s',
                      flexShrink: 0,
                    }}
                  />
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: 'var(--brand)',
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      flex: 1,
                    }}
                  >
                    {group.board_name}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      padding: '1px 7px',
                      borderRadius: 4,
                      background: 'var(--bg-raised)',
                    }}
                  >
                    {group.tasks.length}
                  </span>
                  <Link
                    to={`/crm/boards/${group.board_id}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 500,
                      color: 'var(--text-secondary)',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      background: 'transparent',
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t('myTasks.openBoard')} <ExternalLink size={10} />
                  </Link>
                </div>

                {/* Table — only when expanded */}
                {isOpen && (
                  <>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            <th style={thStyle}>{t('myTasks.colTask')}</th>
                            <th style={thStyle}>{t('myTasks.colAssignee')}</th>
                            <th style={thStyle}>{t('myTasks.colLabels')}</th>
                            <th style={thStyle}>{t('myTasks.colProgress')}</th>
                            <th style={thStyle}>{t('myTasks.colPriority')}</th>
                            <th style={thStyle}>{t('myTasks.colDeadline')}</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>{t('myTasks.colComments')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.tasks.map((task) => {
                            const pCfg = PRIORITY_CFG[task.priority];
                            const checklistTotal = task.checklists.reduce(
                              (s, c) => s + c.checklist_progress.total,
                              0,
                            );
                            const checklistDone = task.checklists.reduce(
                              (s, c) => s + c.checklist_progress.completed,
                              0,
                            );

                            return (
                              <tr
                                key={task.id}
                                style={{ borderBottom: '1px solid var(--border)' }}
                                onMouseEnter={(e) => {
                                  (e.currentTarget as HTMLTableRowElement).style.background =
                                    'var(--bg-hover)';
                                }}
                                onMouseLeave={(e) => {
                                  (e.currentTarget as HTMLTableRowElement).style.background = '';
                                }}
                              >
                                {/* Task title */}
                                <td style={{ ...tdStyle, maxWidth: 260 }}>
                                  <Link
                                    to={`/crm/tasks/${task.id}`}
                                    style={{
                                      fontWeight: 500,
                                      fontSize: 13,
                                      color: 'var(--text-primary)',
                                      lineHeight: 1.3,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      display: 'block',
                                      textDecoration: 'none',
                                    }}
                                    onMouseEnter={(e) => {
                                      (e.currentTarget as HTMLAnchorElement).style.color =
                                        'var(--brand)';
                                    }}
                                    onMouseLeave={(e) => {
                                      (e.currentTarget as HTMLAnchorElement).style.color =
                                        'var(--text-primary)';
                                    }}
                                  >
                                    {task.title}
                                  </Link>
                                  {task.attachments_count > 0 && (
                                    <span
                                      style={{
                                        fontSize: 10,
                                        color: 'var(--text-subtle)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 3,
                                        marginTop: 2,
                                      }}
                                    >
                                      <Paperclip size={10} /> {task.attachments_count}
                                    </span>
                                  )}
                                </td>

                                {/* Assignee */}
                                <td style={tdStyle}>
                                  {task.assignee ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      {task.assignee.avatar ? (
                                        <img
                                          src={task.assignee.avatar}
                                          alt=""
                                          style={{
                                            width: 20,
                                            height: 20,
                                            borderRadius: '50%',
                                            objectFit: 'cover',
                                            flexShrink: 0,
                                          }}
                                        />
                                      ) : (
                                        <div
                                          style={{
                                            width: 20,
                                            height: 20,
                                            borderRadius: '50%',
                                            background: 'var(--bg-raised)',
                                            border: '1px solid var(--border)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 9,
                                            fontWeight: 600,
                                            color: 'var(--text-secondary)',
                                            flexShrink: 0,
                                          }}
                                        >
                                          {task.assignee.first_name[0]}
                                          {task.assignee.last_name[0]}
                                        </div>
                                      )}
                                      <span
                                        style={{
                                          fontSize: 12,
                                          color: 'var(--text-secondary)',
                                          whiteSpace: 'nowrap',
                                        }}
                                      >
                                        {task.assignee.first_name}
                                      </span>
                                    </div>
                                  ) : (
                                    <span style={{ color: 'var(--text-subtle)', fontSize: 12 }}>
                                      —
                                    </span>
                                  )}
                                </td>

                                {/* Labels */}
                                <td style={tdStyle}>
                                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    {task.labels.map((l) => (
                                      <span
                                        key={l.id}
                                        style={{
                                          fontSize: 10,
                                          fontWeight: 600,
                                          padding: '1px 6px',
                                          borderRadius: 3,
                                          background: l.color + '22',
                                          color: l.color,
                                          whiteSpace: 'nowrap',
                                        }}
                                      >
                                        {l.name}
                                      </span>
                                    ))}
                                    {task.labels.length === 0 && (
                                      <span style={{ color: 'var(--text-subtle)', fontSize: 11 }}>
                                        —
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Progress */}
                                <td style={tdStyle}>
                                  {checklistTotal > 0 ? (
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 5,
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: 32,
                                          height: 4,
                                          borderRadius: 2,
                                          background: 'var(--bg-raised)',
                                          overflow: 'hidden',
                                        }}
                                      >
                                        <div
                                          style={{
                                            height: '100%',
                                            width:
                                              (checklistDone / checklistTotal) * 100 + '%',
                                            background:
                                              checklistDone === checklistTotal
                                                ? 'var(--success)'
                                                : 'var(--brand)',
                                          }}
                                        />
                                      </div>
                                      <span
                                        style={{
                                          fontSize: 11,
                                          fontFamily: 'var(--font-mono)',
                                          color:
                                            checklistDone === checklistTotal
                                              ? 'var(--success)'
                                              : 'var(--text-muted)',
                                        }}
                                      >
                                        {checklistDone}/{checklistTotal}
                                      </span>
                                    </div>
                                  ) : (
                                    <span style={{ color: 'var(--text-subtle)', fontSize: 11 }}>
                                      —
                                    </span>
                                  )}
                                </td>

                                {/* Priority */}
                                <td style={tdStyle}>
                                  <span
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 600,
                                      padding: '2px 7px',
                                      borderRadius: 4,
                                      background: pCfg.bg,
                                      color: pCfg.col,
                                    }}
                                  >
                                    {t(CRM_PRIORITY_LABEL_KEYS[task.priority])}
                                  </span>
                                </td>

                                {/* Deadline */}
                                <td style={tdStyle}>
                                  {task.deadline ? (
                                    <span
                                      style={{
                                        fontSize: 12,
                                        fontFamily: 'var(--font-mono)',
                                        color: isOverdue(task.deadline)
                                          ? 'var(--danger)'
                                          : isDueSoon(task.deadline)
                                            ? 'var(--warning)'
                                            : 'var(--text-secondary)',
                                        fontWeight:
                                          isOverdue(task.deadline) || isDueSoon(task.deadline)
                                            ? 600
                                            : 400,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                      }}
                                    >
                                      {isOverdue(task.deadline) && (
                                        <AlertTriangle size={11} />
                                      )}
                                      {formatDeadline(task.deadline)}
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--text-subtle)', fontSize: 11 }}>
                                      —
                                    </span>
                                  )}
                                </td>

                                {/* Comments */}
                                <td style={{ ...tdStyle, textAlign: 'right' }}>
                                  {task.comments_count > 0 ? (
                                    <span
                                      style={{
                                        fontSize: 11,
                                        color: 'var(--text-muted)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 3,
                                        justifyContent: 'flex-end',
                                      }}
                                    >
                                      <MessageSquare size={11} /> {task.comments_count}
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--text-subtle)', fontSize: 11 }}>
                                      —
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Load more */}
                    {group.has_more && group.tasks.length < group.total && (
                      <div
                        style={{
                          padding: '12px 16px',
                          borderTop: '1px solid var(--border-faint)',
                          textAlign: 'center',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => loadMoreForBoard(group.board_id, group.board_name)}
                          disabled={loadingMoreBoard === group.board_id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            height: 28,
                            padding: '0 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border)',
                            background: 'transparent',
                            color: 'var(--text-secondary)',
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            opacity: loadingMoreBoard === group.board_id ? 0.5 : 1,
                          }}
                        >
                          {loadingMoreBoard === group.board_id
                            ? t('common.loading')
                            : t('myTasks.loadMore', {
                                count: group.total - group.tasks.length,
                              })}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
