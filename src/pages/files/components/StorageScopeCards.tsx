import type { LucideIcon } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { StorageScope } from '../types';

interface ScopeCard {
  id: StorageScope;
  name: string;
  sub: string;
  Icon: LucideIcon;
  used: number;
  limit: number;
}

interface StorageScopeCardsProps {
  scope: StorageScope;
  sourceCards: ScopeCard[];
  onSelect: (scope: StorageScope) => void;
}

export function StorageScopeCards({ scope, sourceCards, onSelect }: StorageScopeCardsProps) {
  return (
    <div className={cn('grid gap-3', sourceCards.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
      {sourceCards.map((s) => {
        const isActive = scope === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className={cn(
              'relative text-left flex flex-col gap-2.5 p-4 rounded-xl border cursor-pointer transition-all duration-150 overflow-hidden',
              isActive
                ? 'bg-[var(--brand)] border-transparent shadow-[0_8px_22px_color-mix(in_srgb,var(--brand)_30%,transparent)]'
                : 'bg-surface border-default hover:bg-hover',
            )}
          >
            {isActive && (
              <div className="pointer-events-none absolute right-[-32px] top-[-32px] w-[120px] h-[120px] rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.25),transparent_65%)]" />
            )}
            <div className="relative z-[1]">
              <span className={cn(
                'flex items-center justify-center w-9 h-9 rounded-[9px] shrink-0',
                isActive ? 'bg-white/20' : 'bg-brand-subtle',
              )}>
                <s.Icon size={18} className={isActive ? 'text-white' : 'text-[var(--brand-text)]'} />
              </span>
            </div>
            <div className="relative z-[1]">
              <div className={cn('text-[15px] font-semibold leading-snug', isActive ? 'text-white' : 'text-primary')}>
                {s.name}
              </div>
              <div className={cn('text-[11.5px] mt-0.5', isActive ? 'text-white/78' : 'text-muted')}>
                {s.sub}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
