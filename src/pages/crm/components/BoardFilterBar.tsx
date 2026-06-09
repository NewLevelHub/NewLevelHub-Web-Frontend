import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, LayoutDashboard, List, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { CompanyMember, CrmLabel } from '@/shared/types';

export interface BoardFilters {
  search: string;
  priority: string;
  deadline: string;
  ordering: string;
  assignee_id: string;
  label_ids: number[];
  view: 'kanban' | 'list';
}

export const DEFAULT_BOARD_FILTERS: BoardFilters = {
  search: '',
  priority: '',
  deadline: '',
  ordering: '',
  assignee_id: '',
  label_ids: [],
  view: 'kanban',
};

export interface BoardFilterBarProps {
  filters: BoardFilters;
  onChange: (filters: BoardFilters) => void;
  members?: CompanyMember[];
  currentUserId?: number;
  labels?: CrmLabel[];
}

export function BoardFilterBar({ filters, onChange, members = [], currentUserId, labels = [] }: BoardFilterBarProps) {
  const { t } = useTranslation();
  const [labelDropdownOpen, setLabelDropdownOpen] = useState(false);
  const labelDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!labelDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (labelDropdownRef.current && !labelDropdownRef.current.contains(e.target as Node)) {
        setLabelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [labelDropdownOpen]);

  const toggleLabelId = (id: number) => {
    const updated = filters.label_ids.includes(id)
      ? filters.label_ids.filter((x) => x !== id)
      : [...filters.label_ids, id];
    onChange({ ...filters, label_ids: updated });
  };

  const hasActive =
    filters.search !== '' ||
    filters.priority !== '' ||
    filters.deadline !== '' ||
    filters.ordering !== '' ||
    filters.assignee_id !== '' ||
    filters.label_ids.length > 0;

  const isOnlyMineActive =
    currentUserId !== undefined && filters.assignee_id === String(currentUserId);

  const handleOnlyMine = () => {
    if (currentUserId === undefined) return;
    onChange({
      ...filters,
      assignee_id: isOnlyMineActive ? '' : String(currentUserId),
    });
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap px-4 py-3 overflow-visible">
      {/* Search */}
      <div className="relative flex items-center">
        <Search
          className="w-3.5 h-3.5 text-[color:var(--text-muted)] flex-shrink-0 absolute left-2.5 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder={t('common.searchTasks')}
          className="h-[30px] pl-7 pr-2.5 text-[12px] border border-[color:var(--border)] bg-[color:var(--bg-surface)] rounded-[var(--radius-sm)] text-[color:var(--text-primary)] focus:outline-none placeholder:text-[color:var(--text-muted)] w-full sm:w-44 min-w-0"
          aria-label={t('common.searchTasks')}
        />
      </div>

      <span className="self-stretch w-px bg-[color:var(--border)] flex-shrink-0 my-0.5" aria-hidden="true" />

      {/* Priority select */}
      <div className="relative flex items-center">
        <select
          value={filters.priority}
          onChange={(e) => onChange({ ...filters, priority: e.target.value })}
          className="h-[30px] px-2.5 pr-6 text-[12px] border border-[color:var(--border)] bg-[color:var(--bg-surface)] rounded-[var(--radius-sm)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)] cursor-pointer focus:outline-none appearance-none"
          aria-label={t('common.filterPriority')}
        >
          <option value="">{t('crm.filter.allPriorities')}</option>
          <option value="low">{t('crm.priority.low')}</option>
          <option value="medium">{t('crm.priority.medium')}</option>
          <option value="high">{t('crm.priority.high')}</option>
          <option value="critical">{t('crm.priority.critical')}</option>
        </select>
        <ChevronDown
          className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[color:var(--text-muted)]"
          aria-hidden="true"
        />
      </div>

      {/* Deadline select */}
      <div className="relative flex items-center">
        <select
          value={filters.deadline}
          onChange={(e) => onChange({ ...filters, deadline: e.target.value })}
          className="h-[30px] px-2.5 pr-6 text-[12px] border border-[color:var(--border)] bg-[color:var(--bg-surface)] rounded-[var(--radius-sm)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)] cursor-pointer focus:outline-none appearance-none"
          aria-label={t('common.filterDeadline')}
        >
          <option value="">{t('crm.filter.allDeadlines')}</option>
          <option value="overdue">{t('common.overdue')}</option>
          <option value="today">{t('common.today')}</option>
          <option value="this_week">{t('crm.filter.thisWeek')}</option>
        </select>
        <ChevronDown
          className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[color:var(--text-muted)]"
          aria-hidden="true"
        />
      </div>

      {/* Assignee select */}
      <div className="relative flex items-center">
        <select
          value={filters.assignee_id}
          onChange={(e) => onChange({ ...filters, assignee_id: e.target.value })}
          className="h-[30px] px-2.5 pr-6 text-[12px] border border-[color:var(--border)] bg-[color:var(--bg-surface)] rounded-[var(--radius-sm)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)] cursor-pointer focus:outline-none appearance-none"
          aria-label={t('crm.filter.assignee')}
        >
          <option value="">{t('crm.filter.allAssignees')}</option>
          {members.map((member) => (
            <option key={member.id} value={String(member.id)}>
              {member.full_name}
            </option>
          ))}
        </select>
        <ChevronDown
          className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[color:var(--text-muted)]"
          aria-hidden="true"
        />
      </div>

      <span className="self-stretch w-px bg-[color:var(--border)] flex-shrink-0 my-0.5" aria-hidden="true" />

      {/* Label dropdown */}
      <div className="relative flex items-center" ref={labelDropdownRef}>
        <button
          type="button"
          onClick={() => setLabelDropdownOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={labelDropdownOpen}
          className={cn(
            'h-[30px] pl-2.5 pr-6 text-[12px] border rounded-[var(--radius-sm)] cursor-pointer focus:outline-none transition-colors text-left',
            filters.label_ids.length > 0
              ? 'border-[color:var(--brand)] text-[color:var(--brand-text)] bg-[color:var(--brand-subtle)]'
              : 'border-[color:var(--border)] bg-[color:var(--bg-surface)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)]',
          )}
        >
          {filters.label_ids.length === 0
            ? t('crm.filter.allLabels')
            : t('crm.filter.labelsSelected', { count: filters.label_ids.length })}
        </button>
        <ChevronDown
          className={cn('w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[color:var(--text-muted)] transition-transform', labelDropdownOpen && 'rotate-180')}
          aria-hidden="true"
        />

        {labelDropdownOpen && (
          <div
            className="absolute top-full z-50 mt-1 w-52 rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] shadow-[var(--shadow-pop)] py-1"
            role="listbox"
            aria-label={t('crm.filter.allLabels')}
          >
            {labels.length === 0 ? (
              <div className="px-3 py-2 text-[12px] text-[color:var(--text-muted)]" role="option" aria-disabled="true" aria-selected={false}>
                {t('crm.filter.noLabels')}
              </div>
            ) : (
              labels.map((label) => {
                const selected = filters.label_ids.includes(label.id);
                return (
                  <button
                    key={label.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => toggleLabelId(label.id)}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-[color:var(--bg-hover)] cursor-pointer w-full text-left text-[12px] text-[color:var(--text-primary)]"
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: label.color }}
                      aria-hidden="true"
                    />
                    <span className="flex-1 truncate">{label.name}</span>
                    {selected && <Check className="w-3 h-3 text-[color:var(--brand)] shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      <span className="self-stretch w-px bg-[color:var(--border)] flex-shrink-0 my-0.5" aria-hidden="true" />

      {/* Only mine chip */}
      {currentUserId !== undefined && (
        <button
          type="button"
          onClick={handleOnlyMine}
          aria-pressed={isOnlyMineActive}
          className={cn(
            'inline-flex items-center px-2.5 py-1 text-[12px] rounded-full transition-colors',
            isOnlyMineActive
              ? 'bg-[color:var(--brand-subtle)] text-[color:var(--brand-text)] cursor-pointer'
              : 'border border-[color:var(--border)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)] cursor-pointer',
          )}
        >
          {t('crm.filter.onlyMine')}
        </button>
      )}

      {/* Reset chip */}
      {hasActive && (
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_BOARD_FILTERS, view: filters.view })}
          className="inline-flex items-center px-2.5 py-1 text-[12px] rounded-full border border-[color:var(--border)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)] cursor-pointer transition-colors"
        >
          {t('common.reset')}
        </button>
      )}

      <span className="self-stretch w-px bg-[color:var(--border)] flex-shrink-0 my-0.5" aria-hidden="true" />

      {/* View toggle */}
      <div className="ml-auto flex items-center h-[30px] rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-0.5 gap-0.5">
        <button
          type="button"
          onClick={() => onChange({ ...filters, view: 'kanban' })}
          className={cn(
            'inline-flex items-center gap-1.5 h-[28px] px-2.5 text-[12px] rounded-[var(--radius-sm)] font-medium transition-colors',
            filters.view === 'kanban'
              ? 'bg-[color:var(--bg-hover)] text-[color:var(--text-primary)]'
              : 'text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)]',
          )}
          aria-label={t('common.kanbanView')}
          aria-pressed={filters.view === 'kanban'}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          {t('common.kanban')}
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...filters, view: 'list' })}
          className={cn(
            'inline-flex items-center gap-1.5 h-[28px] px-2.5 text-[12px] rounded-[var(--radius-sm)] font-medium transition-colors',
            filters.view === 'list'
              ? 'bg-[color:var(--bg-hover)] text-[color:var(--text-primary)]'
              : 'text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)]',
          )}
          aria-label={t('common.listView')}
          aria-pressed={filters.view === 'list'}
        >
          <List className="w-3.5 h-3.5" />
          {t('common.list')}
        </button>
      </div>
    </div>
  );
}
