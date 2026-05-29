import { useState, type InputHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { authInput } from '@/shared/ui/authFormStyles';

export type AuthPasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  inputClassName?: string;
};

export function AuthPasswordField({ inputClassName, className, ...props }: AuthPasswordFieldProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={cn(authInput, 'pr-10', className, inputClassName)}
      />
      <button
        type="button"
        className={cn(
          'absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted',
          'hover:bg-raised hover:text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500',
        )}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t('common.hidePassword') : t('common.showPassword')}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="size-4 shrink-0" aria-hidden /> : <Eye className="size-4 shrink-0" aria-hidden />}
      </button>
    </div>
  );
}
