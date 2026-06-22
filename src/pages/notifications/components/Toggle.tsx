import { cn } from '@/shared/lib/cn';

export interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        border: 'none',
        padding: 2,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: checked ? 'var(--brand)' : 'var(--border-strong)',
        transition: 'background 0.2s',
        opacity: disabled ? 0.5 : 1,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
      }}
      className={cn(
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
      )}
    >
      <span
        style={{
          display: 'block',
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: 'white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          transform: checked ? 'translateX(16px)' : 'translateX(0px)',
          transition: 'transform 0.2s',
          pointerEvents: 'none',
        }}
      />
    </button>
  );
}
