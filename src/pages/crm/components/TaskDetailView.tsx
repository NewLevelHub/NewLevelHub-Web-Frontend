import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import {
  ChevronLeft,
  AlertCircle,
  Archive,
  Paperclip,
} from 'lucide-react';
import { fmtDateLong } from '@/shared/lib/formatDate';
import type { CrmTask } from '@/shared/types';
import { CRM_PRIORITY_LABEL_KEYS } from '@/pages/crm/utils/crm-display';
import { ChecklistSection } from '@/pages/crm/components/CrmTaskChecklistSection';
import { CommentSection } from '@/pages/crm/components/CrmTaskCommentSection';
import { HistorySection } from '@/pages/crm/components/CrmTaskHistorySection';
import { TaskLabelsSection } from '@/pages/crm/components/CrmTaskLabelsSection';
import { useTaskDetail } from '@/pages/crm/hooks/useTaskDetail';

export type TaskDetailViewProps = ReturnType<typeof useTaskDetail>;

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  height: 36,
  padding: '0 12px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  height: 'auto',
  padding: '8px 12px',
  resize: 'none',
  minHeight: 100,
  lineHeight: 1.6,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--text-secondary)',
  display: 'block',
  marginBottom: 6,
};

const cardStyle: React.CSSProperties = {
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--border)',
  background: 'var(--bg-surface)',
  boxShadow: 'var(--shadow-card)',
  overflow: 'hidden',
};

const cardHeaderStyle: React.CSSProperties = {
  padding: '14px 20px',
  borderBottom: '1px solid var(--border-faint)',
};

const cardHeaderTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-primary)',
  margin: 0,
};

const PRIORITY_STYLE: Record<CrmTask['priority'], { col: string; bg: string }> = {
  high:   { col: 'var(--warning)',   bg: 'var(--warning-bg)' },
  medium: { col: 'var(--info)',      bg: 'var(--bg-raised)' },
  low:    { col: 'var(--text-muted)', bg: 'var(--bg-raised)' },
};

export function TaskDetailView(props: TaskDetailViewProps) {
  const { t } = useTranslation();
  const {
    taskId,
    task,
    isLoading,
    isError,
    boardId,
    members,
    title,
    setTitle,
    description,
    setDescription,
    priority,
    setPriority,
    deadline,
    setDeadline,
    assigneeId,
    setAssigneeId,
    patchMutation,
    archiveMutation,
    unarchiveMutation,
    handleSave,
    handleCancel,
  } = props;

  if (isLoading) {
    return (
      <main className="space-y-6">
        <div className="h-4 w-28 rounded bg-hover animate-pulse" />
        <div className="animate-pulse space-y-5">
          <div className="h-8 w-2/3 rounded bg-hover" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-32 rounded-xl bg-raised" />
              <div className="h-48 rounded-xl bg-raised" />
            </div>
            <div className="space-y-4">
              <div className="h-40 rounded-xl bg-raised" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (isError || !task) {
    return (
      <main className="space-y-4">
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--warning)',
            background: 'var(--warning-bg)',
            color: 'var(--warning)',
            fontSize: 13,
          }}
        >
          <AlertCircle size={15} />
          {t('crm.taskNotFound')}
        </div>
        <Link
          to="/crm"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            color: 'var(--text-muted)',
            textDecoration: 'none',
            marginTop: 8,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-muted)'; }}
        >
          <ChevronLeft size={14} />
          {t('common.backToBoards')}
        </Link>
      </main>
    );
  }

  const createdDate = fmtDateLong(task.created_at);

  return (
    <main className="space-y-6">
      {/* Back link */}
      <Link
        to={boardId ? `/crm/boards/${boardId}` : '/crm'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: 'var(--text-muted)',
          textDecoration: 'none',
          marginBottom: 16,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-muted)'; }}
      >
        <ChevronLeft size={14} />
        {boardId ? t('common.toBoard') : t('common.toBoards')}
      </Link>

      {/* Title card */}
      <div style={cardStyle}>
        <div style={{ padding: '20px 20px 20px' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
            {t('crm.taskIdLabel', { id: task.id })}
          </p>
          <input
            id="page-task-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={255}
            disabled={patchMutation.isPending}
            style={{
              width: '100%',
              background: 'transparent',
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--text-primary)',
              border: 'none',
              borderBottom: '2px solid transparent',
              outline: 'none',
              padding: '4px 0',
              fontFamily: 'inherit',
              letterSpacing: '-0.025em',
              opacity: patchMutation.isPending ? 0.6 : 1,
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderBottomColor = 'var(--brand)'; }}
            onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderBottomColor = 'transparent'; }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <section style={cardStyle}>
            <div style={cardHeaderStyle}>
              <h2 style={cardHeaderTitleStyle}>
                {t('common.description')}
              </h2>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <textarea
                id="page-task-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                placeholder={t('common.addTaskDescription')}
                disabled={patchMutation.isPending}
                style={{
                  ...textareaStyle,
                  opacity: patchMutation.isPending ? 0.6 : 1,
                }}
              />
            </div>
          </section>

          {/* Checklist */}
          {boardId && (
            <section style={cardStyle}>
              <div style={{ padding: '16px 20px' }}>
                <ChecklistSection taskId={taskId} boardId={boardId} checklists={task.checklists ?? []} />
              </div>
            </section>
          )}

          {/* Comments */}
          <section style={cardStyle}>
            <div style={{ padding: '16px 20px' }}>
              <CommentSection taskId={taskId} boardId={boardId} />
            </div>
          </section>

          {/* History */}
          <section style={cardStyle}>
            <div style={{ padding: '16px 20px' }}>
              <HistorySection taskId={taskId} />
            </div>
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Details */}
          <section style={cardStyle}>
            <div style={cardHeaderStyle}>
              <h2 style={cardHeaderTitleStyle}>
                {t('crm.detailsLabel')}
              </h2>
            </div>
            <div style={{ padding: '16px 20px' }} className="space-y-4">
              {/* Priority */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="page-task-priority" style={labelStyle}>
                  {t('crm.priorityLabel')}
                </label>
                <select
                  id="page-task-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as CrmTask['priority'])}
                  disabled={patchMutation.isPending}
                  style={{
                    ...inputStyle,
                    opacity: patchMutation.isPending ? 0.6 : 1,
                  }}
                >
                  {(Object.keys(CRM_PRIORITY_LABEL_KEYS) as CrmTask['priority'][]).map((val) => (
                    <option key={val} value={val}>
                      {t(CRM_PRIORITY_LABEL_KEYS[val])}
                    </option>
                  ))}
                </select>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: PRIORITY_STYLE[priority].bg,
                    color: PRIORITY_STYLE[priority].col,
                  }}
                >
                  {t(CRM_PRIORITY_LABEL_KEYS[priority])}
                </span>
              </div>

              {/* Deadline */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="page-task-deadline" style={labelStyle}>
                  {t('crm.deadlineLabel')}
                </label>
                <input
                  id="page-task-deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  disabled={patchMutation.isPending}
                  style={{
                    ...inputStyle,
                    opacity: patchMutation.isPending ? 0.6 : 1,
                    colorScheme: 'dark',
                  }}
                />
              </div>

              {/* Assignee */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="page-task-assignee" style={labelStyle}>
                  {t('crm.assigneeLabel')}
                </label>
                <select
                  id="page-task-assignee"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  disabled={patchMutation.isPending}
                  style={{
                    ...inputStyle,
                    opacity: patchMutation.isPending ? 0.6 : 1,
                    cursor: patchMutation.isPending ? 'not-allowed' : undefined,
                  }}
                >
                  <option value="">— {t('common.notAssigned')} —</option>
                  {task.assignee && !members.some((m) => String(m.id) === String(task.assignee!.id)) ? (
                    <option value={String(task.assignee.id)}>
                      {`${task.assignee.first_name} ${task.assignee.last_name}`.trim()}
                    </option>
                  ) : null}
                  {members
                    .filter((m) => m.is_active)
                    .map((m) => (
                      <option key={m.id} value={String(m.id)}>
                        {m.full_name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Created date */}
              <div className="flex flex-col gap-1">
                <span style={{ ...labelStyle, marginBottom: 2 }}>
                  {t('crm.createdLabel')}
                </span>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{createdDate}</p>
              </div>

              {/* Attachments count */}
              {task.attachments_count > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    color: 'var(--text-muted)',
                    paddingTop: 8,
                    borderTop: '1px solid var(--border-faint)',
                  }}
                >
                  <Paperclip size={14} />
                  {task.attachments_count}{' '}
                  {task.attachments_count === 1 ? t('common.file') : t('common.files')}
                </div>
              )}
            </div>
          </section>

          {/* Labels — overflow visible so dropdown isn't clipped */}
          {boardId && (
            <section style={{ ...cardStyle, overflow: 'visible' }}>
              <div style={{ padding: '16px 20px' }}>
                <TaskLabelsSection taskId={taskId} boardId={boardId} taskLabels={task.labels ?? []} />
              </div>
            </section>
          )}

          {/* Actions */}
          <section style={cardStyle}>
            <div style={cardHeaderStyle}>
              <h2 style={cardHeaderTitleStyle}>
                {t('crm.actionsLabel')}
              </h2>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Save */}
              <button
                type="button"
                onClick={handleSave}
                disabled={patchMutation.isPending}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  width: '100%',
                  height: 32,
                  padding: '0 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'var(--brand)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: patchMutation.isPending ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  opacity: patchMutation.isPending ? 0.6 : 1,
                }}
              >
                {patchMutation.isPending ? t('common.savingPlain') : t('common.save')}
              </button>

              {/* Cancel */}
              <button
                type="button"
                onClick={handleCancel}
                disabled={patchMutation.isPending}
                style={{
                  height: 32,
                  padding: '0 16px',
                  width: '100%',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: patchMutation.isPending ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  opacity: patchMutation.isPending ? 0.6 : 1,
                }}
              >
                {t('common.cancel')}
              </button>

              {patchMutation.isError && (
                <p style={{ fontSize: 12, color: 'var(--danger)', margin: 0 }}>{t('crm.failedToSave')}</p>
              )}

              {archiveMutation.isError && (
                <p style={{ fontSize: 12, color: 'var(--danger)', margin: 0 }}>{t('crm.failedToArchive')}</p>
              )}
              {unarchiveMutation.isError && (
                <p style={{ fontSize: 12, color: 'var(--danger)', margin: 0 }}>{t('crm.failedToUnarchive')}</p>
              )}

              {/* Archive / Unarchive */}
              {task.is_archived ? (
                <button
                  type="button"
                  onClick={() => unarchiveMutation.mutate()}
                  disabled={unarchiveMutation.isPending}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    width: '100%',
                    height: 32,
                    padding: '0 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--info)',
                    background: 'transparent',
                    color: 'var(--info)',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: unarchiveMutation.isPending ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    opacity: unarchiveMutation.isPending ? 0.5 : 1,
                  }}
                >
                  <Archive size={14} />
                  {unarchiveMutation.isPending ? t('common.unarchivingPlain') : t('common.unarchiveTask')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => archiveMutation.mutate()}
                  disabled={archiveMutation.isPending}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    width: '100%',
                    height: 32,
                    padding: '0 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--danger)',
                    background: 'var(--danger-bg)',
                    color: 'var(--danger)',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: archiveMutation.isPending ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    opacity: archiveMutation.isPending ? 0.5 : 1,
                  }}
                >
                  <Archive size={14} />
                  {archiveMutation.isPending ? t('common.archivingPlain') : t('common.archiveTask')}
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
