import { FormEvent, useEffect, useRef, useState } from 'react';
import { X, MessageSquare } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

export interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the trimmed input when the user confirms. */
  onConfirm: (value: string) => void;
  title: string;
  description?: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  inputType?: 'text' | 'number';
  rootClassName?: string;
}

export function PromptModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  label,
  defaultValue = '',
  placeholder,
  confirmLabel = 'OK',
  cancelLabel = 'Отмена',
  isLoading = false,
  inputType = 'text',
  rootClassName,
}: PromptModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    onConfirm(value);
  };

  return (
    <div
      className={cn('fixed inset-0 z-50 flex items-center justify-center p-4', rootClassName)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="prompt-modal-title"
      aria-describedby={description ? 'prompt-modal-description' : undefined}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={!isLoading ? onClose : undefined}
      />

      <div
        ref={dialogRef}
        className="relative w-full max-w-md rounded-2xl bg-surface shadow-2xl"
      >
        <form onSubmit={handleSubmit}>
          <div className="flex items-start gap-4 p-6 pb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-subtle">
              <MessageSquare className="h-5 w-5 text-brand" aria-hidden="true" />
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <h2 id="prompt-modal-title" className="text-base font-semibold text-primary">
                {title}
              </h2>
              {description ? (
                <p id="prompt-modal-description" className="mt-1 text-sm text-muted">
                  {description}
                </p>
              ) : null}
              <label htmlFor="prompt-modal-input" className="mt-4 block text-sm font-medium text-gray-700">
                {label}
              </label>
              <input
                ref={inputRef}
                id="prompt-modal-input"
                type={inputType}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                disabled={isLoading}
                className={cn(
                  'mt-1 w-full rounded-lg border border-default bg-raised px-3 py-2 text-sm text-primary',
                  'placeholder:text-placeholder focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20',
                  'disabled:opacity-50 disabled:text-muted',
                )}
                autoComplete="off"
              />
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="shrink-0 rounded-lg p-1 text-secondary transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:pointer-events-none disabled:opacity-50"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex justify-end gap-3 px-6 pb-6 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-lg border border-default bg-surface px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-raised disabled:pointer-events-none disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-indigo-700 disabled:pointer-events-none disabled:opacity-50"
            >
              {isLoading && (
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                  aria-hidden="true"
                />
              )}
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
