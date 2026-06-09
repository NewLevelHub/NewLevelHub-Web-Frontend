import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StickyNote, Trash2, X } from 'lucide-react';

import { fmtDate } from '@/shared/lib/formatDate';
import { cn } from '@/shared/lib/cn';

import { formatHourLabel } from '../calendarUtils';
import type { CalendarNote } from '../useCalendarNotes';

type Props = {
  date: string | null;
  hour: number | null;
  note: CalendarNote | null;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onSave: (text: string) => void;
  onDelete: () => void;
};

export function CalendarNotePopover({
  date,
  hour,
  note,
  anchorEl,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  const popRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState(note?.text ?? '');

  useEffect(() => {
    setText(note?.text ?? '');
  }, [note, date, hour]);

  useLayoutEffect(() => {
    if (!date || hour == null || !popRef.current) return;

    const pop = popRef.current;
    const isMobile = window.matchMedia('(max-width: 639px)').matches;

    if (isMobile) {
      pop.style.left = '12px';
      pop.style.right = '12px';
      pop.style.top = 'auto';
      pop.style.bottom = '12px';
      pop.style.width = 'auto';
      return;
    }

    if (!anchorEl) return;

    const rect = anchorEl.getBoundingClientRect();
    const pw = pop.offsetWidth;
    const ph = pop.offsetHeight;

    let left = rect.right + 10;
    if (left + pw > window.innerWidth - 12) left = rect.left - pw - 10;
    if (left < 12) left = Math.min(rect.left, window.innerWidth - pw - 12);

    let top = rect.top;
    if (top + ph > window.innerHeight - 12) top = window.innerHeight - ph - 12;
    if (top < 12) top = 12;

    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
    pop.style.right = 'auto';
    pop.style.bottom = 'auto';
    pop.style.width = '300px';
  }, [anchorEl, date, hour, text]);

  useEffect(() => {
    if (!date || hour == null) return undefined;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popRef.current?.contains(target)) return;
      if (anchorEl?.contains(target)) return;
      onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('resize', onClose);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('resize', onClose);
    };
  }, [anchorEl, date, hour, onClose]);

  if (!date || hour == null) return null;

  const dateLine = `${fmtDate(date, { day: '2-digit', month: 'long', year: 'numeric' })}, ${formatHourLabel(hour)}`;

  return (
    <div
      ref={popRef}
      className={cn(
        'fixed z-[80] overflow-hidden rounded-[14px] border border-default bg-surface shadow-[var(--shadow-pop)]',
        'w-[300px] max-w-[calc(100vw-24px)]',
      )}
      role="dialog"
      aria-label={note ? t('calendar.editNote') : t('calendar.addNote')}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-lg border-0 bg-raised text-secondary hover:bg-hover"
        aria-label={t('common.close')}
      >
        <X className="h-4 w-4" />
      </button>

      <div className="border-b border-default px-4 pt-[15px] pb-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fef9e8] px-2.5 py-1 text-[11.5px] font-bold tracking-[0.02em] text-[#a96710] uppercase">
          <StickyNote className="h-3.5 w-3.5" />
          {t('calendar.noteLabel')}
        </span>
        <div className="mt-2.5 pr-8 text-base font-bold tracking-[-0.01em] text-primary">
          {note ? t('calendar.editNote') : t('calendar.addNote')}
        </div>
        <div className="mt-1 text-[13px] text-muted">{dateLine}</div>
      </div>

      <div className="px-3 py-2.5">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder={t('calendar.notePlaceholder')}
          className="w-full resize-y rounded-lg border border-default bg-surface px-2.5 py-2 text-[13px] leading-snug text-primary placeholder:text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
          autoFocus
        />
      </div>

      <div className="flex items-center gap-2 border-t border-default bg-raised px-3 py-2.5">
        {note && (
          <button
            type="button"
            onClick={onDelete}
            className="flex h-10 items-center justify-center gap-1.5 rounded-[10px] border border-default bg-surface px-3 text-[13px] font-semibold text-danger hover:bg-danger-subtle"
          >
            <Trash2 className="h-4 w-4" />
            {t('calendar.deleteNote')}
          </button>
        )}
        <button
          type="button"
          onClick={() => onSave(text)}
          className="ml-auto flex h-10 flex-1 items-center justify-center rounded-[10px] border border-brand bg-brand px-3 text-[13.5px] font-semibold text-white hover:bg-brand-hover"
        >
          {t('calendar.saveNote')}
        </button>
      </div>
    </div>
  );
}
