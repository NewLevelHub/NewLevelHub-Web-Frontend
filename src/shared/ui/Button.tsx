import React from 'react';
import { cn } from '@/shared/lib/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  loading?: boolean;
}

const variantClasses: Record<
  NonNullable<ButtonProps['variant']>,
  Record<NonNullable<ButtonProps['size']>, string>
> = {
  primary: {
    md: 'inline-flex items-center gap-1.5 h-[34px] px-3 text-[13px] font-medium bg-[color:var(--brand)] text-white rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed',
    sm: 'inline-flex items-center gap-1.5 h-8 px-4 text-sm font-medium rounded-[var(--radius-sm)] text-white bg-[color:var(--brand)] hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed',
  },
  secondary: {
    md: 'inline-flex items-center gap-1.5 h-[34px] px-3 text-[13px] font-medium border border-[color:var(--border)] bg-[color:var(--bg-surface)] rounded-[var(--radius-sm)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
    sm: 'inline-flex items-center gap-1.5 h-8 px-4 text-sm font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-raised)] rounded-[var(--radius-sm)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
  },
  ghost: {
    md: 'inline-flex items-center gap-1.5 h-[34px] px-3 text-[13px] font-medium rounded-[var(--radius-sm)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
    sm: 'inline-flex items-center gap-1.5 h-8 px-4 text-sm font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-raised)] rounded-[var(--radius-sm)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
  },
  danger: {
    md: 'inline-flex items-center gap-1.5 h-[34px] px-3 text-[13px] font-medium bg-[color:var(--danger)] text-white rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed',
    sm: 'inline-flex items-center gap-1.5 h-8 px-4 text-sm font-medium rounded-[var(--radius-sm)] text-white bg-[color:var(--danger)] hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed',
  },
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      className,
      children,
      ...rest
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(variantClasses[variant][size], className)}
        {...rest}
      >
        {loading && (
          <span
            className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin"
            aria-hidden="true"
          />
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

export default Button;
