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

  // Support both nested company object { id, name } and flat company_id/company_name
  let companyId: number | null = null;
  let companyName: string | null = null;
  let companyObject: { id: number; name: string; onboarding_completed?: boolean } | null = null;

  if (companyRaw !== null && companyRaw !== undefined && typeof companyRaw === 'object') {
    const c = companyRaw as Record<string, unknown>;
    companyId = typeof c.id === 'number' ? c.id : null;
    companyName = typeof c.name === 'string' ? c.name : null;
    if (companyId !== null && companyName !== null) {
      companyObject = {
        id: companyId,
        name: companyName,
        onboarding_completed: typeof c.onboarding_completed === 'boolean' ? c.onboarding_completed : undefined,
      };
    }
  } else if (typeof companyRaw === 'number') {
    companyId = companyRaw;
  }

  if (companyId === null && typeof raw.company_id === 'number') {
    companyId = raw.company_id;
  }
  if (companyName === null && raw.company_name != null) {
    companyName = String(raw.company_name);
  }
  if (companyObject === null && companyId !== null && companyName !== null) {
    companyObject = { id: companyId, name: companyName };
  }

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
    company_name: companyName,
    company: companyObject,
    avatar: raw.avatar != null && raw.avatar !== '' ? String(raw.avatar) : null,
    is_email_verified: Boolean(raw.is_email_verified),
    position: raw.position != null && raw.position !== '' ? String(raw.position) : null,
    date_joined: raw.date_joined != null ? String(raw.date_joined) : undefined,
    last_login: raw.last_login != null ? String(raw.last_login) : raw.last_login === null ? null : undefined,
  };
}
