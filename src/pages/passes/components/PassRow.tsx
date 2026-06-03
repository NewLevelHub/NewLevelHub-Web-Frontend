import React from 'react';
import { Link } from 'react-router';
import { MoreHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fmtDate, fmtTime } from '@/shared/lib/formatDate';

import { type PassStatus } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import type { GuestPass } from '@/shared/types';
import { PassStatusBadge } from '@/pages/passes/components/PassStatusBadge';

interface PassRowProps {
  pass: GuestPass;
  isSuperadmin: boolean;
  onRowClick?: (id: number) => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((s) => s[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export const PassRow = React.memo(function PassRow({ pass, onRowClick }: PassRowProps) {
  const { i18n } = useTranslation();
  void i18n.language; // subscribes to locale changes so fmtDate/fmtTime re-run
  return (
    <tr
      className={cn(
        'group border-b border-[color:var(--border)] transition-colors',
        onRowClick && 'cursor-pointer hover:bg-[color:var(--bg-hover)]',
      )}
      onClick={onRowClick ? () => onRowClick(pass.id) : undefined}
    >
      {/* Guest: mini-avatar + name + email */}
      <td className="px-3 py-3 align-middle">
        <div className="flex items-center gap-2.5">
          <div
            aria-hidden="true"
            className="w-[30px] h-[30px] rounded-full bg-[color:var(--bg-raised)] flex items-center justify-center text-[11px] font-semibold text-[color:var(--text-secondary)] shrink-0 select-none"
          >
            {getInitials(pass.guest_name)}
          </div>
          <div>
            <div className="font-medium text-[color:var(--text-primary)] text-[13px]">{pass.guest_name}</div>
            <div className="text-[11px] text-[color:var(--text-muted)]">{pass.guest_email}</div>
          </div>
        </div>
      </td>

      {/* Visit date */}
      <td className="px-3 py-3 align-middle text-[color:var(--text-secondary)] text-[13px]">
        {fmtDate(pass.valid_from)}
      </td>

      {/* Visit time range — monospace */}
      <td className="px-3 py-3 align-middle font-mono text-[12px] text-[color:var(--text-primary)] whitespace-nowrap">
        {fmtTime(pass.valid_from)}
        {' — '}
        {fmtTime(pass.valid_until)}
      </td>

      {/* Status badge */}
      <td className="px-3 py-3 align-middle">
        <PassStatusBadge status={pass.status as PassStatus} />
      </td>

      {/* Actions */}
      <td
        className="px-3 py-3 align-middle text-right pr-[18px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="inline-flex items-center gap-1.5">
          {onRowClick && (
            <button
              type="button"
              aria-label="QR"
              onClick={() => onRowClick(pass.id)}
              className="h-[26px] px-2 text-[12px] font-medium rounded-[var(--radius-sm)] border border-[color:var(--border)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)] hover:text-[color:var(--text-primary)] transition-colors"
            >
              QR
            </button>
          )}
          <Link
            to={`/passes/${pass.id}`}
            className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--text-muted)] hover:bg-[color:var(--bg-hover)] transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Link>
        </div>
      </td>
    </tr>
  );
});
