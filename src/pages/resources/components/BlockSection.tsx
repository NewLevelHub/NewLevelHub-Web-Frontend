import { useTranslation } from 'react-i18next';
import { dateLocaleTag } from '@/shared/lib/localeFormat';

import { cn } from '@/shared/lib/cn';
import { fmtBlockRange, inputCls, textareaCls } from '@/pages/resources/utils';
import type { BlockFormState } from '@/pages/resources/hooks/useResourceDetail';
import type { ResourceBlock } from '@/shared/types';

export type BlockSectionProps = {
  blockForm: BlockFormState;
  blockFormError: string | null;
  blocks: ResourceBlock[];
  blocksLoading: boolean;
  activeBlock: ResourceBlock | null;
  blockMutationPending: boolean;
  unblockPending: boolean;
  onBlockFormChange: (patch: Partial<BlockFormState>) => void;
  onSubmitBlock: () => void;
  onUnblock: (blockId: number) => void;
};

export function BlockSection({
  blockForm,
  blockFormError,
  blocks,
  blocksLoading,
  activeBlock,
  blockMutationPending,
  unblockPending,
  onBlockFormChange,
  onSubmitBlock,
  onUnblock,
}: BlockSectionProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = dateLocaleTag(i18n.language);

  const labelCls = 'mb-1 block text-sm font-medium text-secondary';
  const mutedLabelCls = 'mb-1 block text-xs text-muted';

  return (
    <section className="rounded-2xl border border-default bg-surface shadow-xl overflow-hidden">
      <div className="px-6 pt-5 pb-4 border-b border-[color:var(--border-faint)]">
        <h2 className="text-base font-semibold text-primary tracking-[-0.015em]">
          {t('resources.detail.blocksSection')}
        </h2>
        <p className="text-xs text-muted mt-0.5">{t('resources.detail.blocksDesc')}</p>
      </div>
      <div className="px-6 py-5 space-y-4">

      {activeBlock && (
        <div className="rounded-lg border border-default bg-raised px-4 py-3 text-sm text-secondary">
          {activeBlock.reason
            ? t('resources.detail.currentlyBlockedReason', { reason: activeBlock.reason })
            : t('resources.detail.currentlyBlocked')}
        </div>
      )}

      {/* Block form */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <span className={labelCls}>{t('resources.detail.blockStartLabel')}</span>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={mutedLabelCls}>{t('resources.detail.blockDateLabel')}</span>
              <input
                type="date"
                value={blockForm.start_date}
                onChange={(e) => onBlockFormChange({ start_date: e.target.value })}
                lang={dateLocale}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={mutedLabelCls}>{t('resources.detail.blockTimeLabel')}</span>
              <input
                type="time"
                step={300}
                value={blockForm.start_clock}
                onChange={(e) => onBlockFormChange({ start_clock: e.target.value })}
                lang={dateLocale}
                className={inputCls}
              />
            </label>
          </div>
        </div>
        <div className="space-y-3">
          <span className={labelCls}>{t('resources.detail.blockEndLabel')}</span>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={mutedLabelCls}>{t('resources.detail.blockDateLabel')}</span>
              <input
                type="date"
                value={blockForm.end_date}
                onChange={(e) => onBlockFormChange({ end_date: e.target.value })}
                lang={dateLocale}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={mutedLabelCls}>{t('resources.detail.blockTimeLabel')}</span>
              <input
                type="time"
                step={300}
                value={blockForm.end_clock}
                onChange={(e) => onBlockFormChange({ end_clock: e.target.value })}
                lang={dateLocale}
                className={inputCls}
              />
            </label>
          </div>
        </div>
      </div>

      <label className="block">
        <span className={labelCls}>{t('resources.detail.blockReasonLabel')}</span>
        <textarea
          rows={3}
          value={blockForm.reason}
          onChange={(e) => onBlockFormChange({ reason: e.target.value })}
          placeholder={t('resources.detail.blockReasonPlaceholder')}
          className={textareaCls}
        />
      </label>

      {blockFormError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {blockFormError}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSubmitBlock}
          disabled={blockMutationPending}
          className={cn(
            'inline-flex items-center gap-1.5 h-8 px-4 text-sm font-medium rounded-[var(--radius-sm)] text-white bg-[color:var(--brand)] hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed',
          )}
        >
          {blockMutationPending
            ? t('resources.detail.blockSubmitPending')
            : t('resources.detail.blockSubmit')}
        </button>
      </div>

      {/* Existing blocks list */}
      <div className="space-y-3 border-t border-default pt-4">
        <h3 className="text-sm font-semibold text-primary">
          {t('resources.detail.blockListTitle')}
        </h3>
        {blocksLoading ? (
          <p className="text-sm text-muted">{t('resources.detail.loadingBlocks')}</p>
        ) : blocks.length === 0 ? (
          <p className="text-sm text-muted">{t('resources.detail.noBlocks')}</p>
        ) : (
          <ul className="space-y-3">
            {blocks.map((block) => (
              <li
                key={block.id}
                className="flex flex-col gap-3 rounded-xl border border-default bg-raised px-4 py-3 md:flex-row md:items-start md:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-primary">
                    {fmtBlockRange(block.start_time, block.end_time)}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {block.reason || t('resources.detail.blockNoReason')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onUnblock(block.id)}
                  disabled={unblockPending}
                  className="h-8 px-3 text-xs font-medium rounded-[var(--radius-sm)] border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
                >
                  {unblockPending
                    ? t('resources.detail.unblockPending')
                    : t('resources.detail.unblockBtn')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      </div>
    </section>
  );
}
