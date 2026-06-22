import i18n from '@/shared/lib/i18n';
import { dateLocaleTag } from '@/shared/lib/localeFormat';
import type { CrmTask } from '@/shared/types';

export type CrmTaskPriority = CrmTask['priority'];

export const CRM_PRIORITY_LABEL_KEYS: Record<CrmTaskPriority, string> = {
  low: 'crm.priority.low',
  medium: 'crm.priority.medium',
  high: 'crm.priority.high',
};

export const CRM_PRIORITY_BADGE_CLASS: Record<CrmTaskPriority, string> = {
  low: 'bg-gray-700 text-gray-300 border-gray-600',
  medium: 'bg-blue-900/60 text-blue-300 border-blue-700',
  high: 'bg-orange-900/60 text-orange-300 border-orange-700',
};

export function formatDeadline(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(dateLocaleTag(i18n.language), { day: 'numeric', month: 'short' });
}

export function isOverdue(iso: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return iso.slice(0, 10) < today;
}
