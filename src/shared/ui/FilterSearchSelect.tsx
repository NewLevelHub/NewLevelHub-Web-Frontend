import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

interface FilterSearchSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { id: number; label: string }[];
  placeholder: string;
  className?: string;
}

export function FilterSearchSelect({ value, onChange, options, placeholder, className }: FilterSearchSelectProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = useMemo(() => {
    if (!value) return null;
    return options.find((o) => String(o.id) === value)?.label ?? null;
  }, [value, options]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const handleToggle = () => {
    setOpen((prev) => {
      if (prev) setSearch('');
      return !prev;
    });
  };

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
    setSearch('');
  };

  const isActive = Boolean(value);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          'inline-flex items-center gap-1.5 h-[30px] px-2.5 text-[12px] border rounded-[var(--radius-sm)] transition-colors',
          isActive
            ? 'border-[color:var(--brand)] bg-[color:var(--brand)]/10 text-[color:var(--brand-text)]'
            : 'border-[color:var(--border)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)]',
        )}
      >
        <span className="max-w-[120px] truncate">{selectedLabel ?? placeholder}</span>
        <ChevronDown
          className={cn('w-3 h-3 flex-shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-48 min-w-full rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:var(--bg-surface)] shadow-[var(--shadow-card)]">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.search')}
            className="w-full border-b border-[color:var(--border)] px-2.5 py-1.5 text-[12px] focus:outline-none bg-transparent text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)]"
          />
          <ul className="max-h-48 overflow-y-auto">
            <li
              onClick={() => handleSelect('')}
              className={cn(
                'px-2.5 py-1.5 text-[12px] cursor-pointer hover:bg-[color:var(--bg-hover)] text-[color:var(--text-primary)]',
                !value && 'text-[color:var(--brand-text)] font-medium',
              )}
            >
              {placeholder}
            </li>
            {filtered.map((o) => (
              <li
                key={o.id}
                onClick={() => handleSelect(String(o.id))}
                className={cn(
                  'px-2.5 py-1.5 text-[12px] cursor-pointer hover:bg-[color:var(--bg-hover)] text-[color:var(--text-primary)]',
                  String(o.id) === value && 'text-[color:var(--brand-text)] font-medium',
                )}
              >
                {o.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
