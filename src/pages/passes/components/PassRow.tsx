import { Link } from 'react-router';

import { type PassStatus } from '@/shared/config/constants';
import type { GuestPass } from '@/shared/types';
import { PassStatusBadge } from '@/pages/passes/components/PassStatusBadge';

interface PassRowProps {
  pass: GuestPass;
  isSuperadmin: boolean;
}

export function PassRow({ pass, isSuperadmin }: PassRowProps) {
  return (
    <tr className="text-secondary">
      <td className="px-4 py-3 align-top">
        <div className="font-medium text-primary">{pass.guest_name}</div>
        <div className="text-xs text-secondary break-all">{pass.guest_email}</div>
      </td>
      <td className="px-4 py-3 text-secondary align-top">
        <div>{pass.created_by_name || '—'}</div>
        {isSuperadmin ? (
          <div className="text-xs text-muted break-words">{pass.created_by_company_name || 'Без компании'}</div>
        ) : null}
      </td>
      <td className="px-4 py-3 align-top">{pass.purpose || '—'}</td>
      <td className="px-4 py-3 text-xs text-secondary align-top whitespace-nowrap">
        {new Date(pass.valid_from).toLocaleString('ru-RU')}
        <br />
        {new Date(pass.valid_until).toLocaleString('ru-RU')}
      </td>
      <td className="px-4 py-3 align-top whitespace-nowrap">
        <PassStatusBadge status={pass.status as PassStatus} />
      </td>
      <td className="px-4 py-3 text-right align-top whitespace-nowrap">
        <Link to={`/passes/${pass.id}`} className="text-brand hover:text-brand">
          Открыть
        </Link>
      </td>
    </tr>
  );
}
