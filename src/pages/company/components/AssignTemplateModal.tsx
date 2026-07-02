import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { OnboardingTemplate } from '@/shared/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  userName: string;
  templates: OnboardingTemplate[];
  isPending: boolean;
  error: string | null;
  onAssign: (userId: number, templateId: number, note: string) => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', height: 36, padding: '0 12px',
  borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
  background: 'var(--bg-surface)', color: 'var(--text-primary)',
  fontSize: 14, outline: 'none', fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)',
  display: 'block', marginBottom: 6,
};

export function AssignTemplateModal({ isOpen, onClose, userId, userName, templates, isPending, error, onAssign }: Props) {
  const { t } = useTranslation();
  const [templateId, setTemplateId] = useState<number | ''>('');
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateId) return;
    onAssign(userId, templateId as number, note);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && !isPending && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-[560px] rounded-2xl border border-default bg-surface shadow-xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between px-[22px] pt-[18px] pb-[14px]">
          <div className="min-w-0 pr-4">
            <h2 className="text-base font-semibold text-primary tracking-[-0.015em]">
              {t('companies.assignTemplateTitle')}
            </h2>
            <p className="text-xs text-muted mt-0.5">{userName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-secondary hover:bg-raised hover:text-primary focus:outline-none"
            aria-label={t('common.close')}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="px-[22px] pb-0 flex flex-col gap-4">
            {error && (
              <p className="text-sm text-danger">{error}</p>
            )}
            <div>
              <label style={labelStyle}>{t('companies.assignTemplate')}</label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value ? Number(e.target.value) : '')}
                required
                style={{ ...inputStyle, height: 36, padding: '0 12px', cursor: 'pointer' }}
              >
                <option value="">{t('companies.assignTemplateSelectPlaceholder')}</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>{t('companies.assignTemplateNote')}</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ ...inputStyle, height: 'auto', padding: '8px 12px', resize: 'none', minHeight: 72 }}
                placeholder={t('companies.assignTemplateNote')}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-[color:var(--border-faint)] px-[22px] pt-[14px] pb-[18px] mt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="h-8 px-4 text-sm font-medium text-secondary hover:bg-raised rounded-[var(--radius-sm)] transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isPending || !templateId}
              className={cn(
                'inline-flex items-center gap-1.5 h-8 px-4 text-sm font-medium rounded-[var(--radius-sm)]',
                'text-white bg-[color:var(--brand)] hover:opacity-90 transition-opacity',
                'disabled:opacity-60 disabled:cursor-not-allowed',
              )}
            >
              {isPending ? t('common.savingPlain') : t('companies.assignTemplate')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
