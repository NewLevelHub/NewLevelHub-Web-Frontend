import type { User } from '@/shared/types';
import type { UserRole } from '@/shared/config/constants';
import { USER_ROLES } from '@/shared/config/constants';

const ROLES = new Set<string>(Object.values(USER_ROLES));

function asRole(value: unknown): UserRole {
  return typeof value === 'string' && ROLES.has(value) ? (value as UserRole) : USER_ROLES.GUEST;
}

/** Нормализует ответ `/auth/login`, `/auth/register`, `/auth/me` под фронтовый `User`. */
export function mapApiUser(raw: Record<string, unknown>): User {
  const companyRaw = raw.company;
  const companyId =
    typeof companyRaw === 'number'
      ? companyRaw
      : companyRaw === null || companyRaw === undefined
        ? null
        : typeof raw.company_id === 'number'
          ? raw.company_id
          : null;

  const fn = String(raw.first_name ?? '').trim();
  const ln = String(raw.last_name ?? '').trim();
  const combined = [fn, ln].filter(Boolean).join(' ');

  return {
    id: Number(raw.id),
    email: String(raw.email ?? ''),
    first_name: fn,
    last_name: ln,
    full_name: String(raw.full_name ?? '').trim() || combined || String(raw.email ?? ''),
    phone: raw.phone != null && raw.phone !== '' ? String(raw.phone) : null,
    role: asRole(raw.role),
    company_id: companyId,
    company_name: raw.company_name != null ? String(raw.company_name) : null,
    avatar: raw.avatar != null && raw.avatar !== '' ? String(raw.avatar) : null,
    is_email_verified: Boolean(raw.is_email_verified),
    position: raw.position != null ? String(raw.position) : undefined,
    date_joined: raw.date_joined != null ? String(raw.date_joined) : undefined,
    last_login: raw.last_login != null ? String(raw.last_login) : raw.last_login === null ? null : undefined,
  };
}
