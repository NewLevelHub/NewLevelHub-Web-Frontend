import { STAFF_UI_PREFIX, SUPERADMIN_UI_PREFIX } from '@/shared/config/constants';

export const LOGO_MAX_BYTES = 10 * 1024 * 1024;

export const ONBOARDING_STEP_LABEL_KEYS: Record<string, string> = {
  upload_logo: 'dashboard.onboarding.upload_logo',
  fill_description: 'dashboard.onboarding.fill_description',
  create_first_board: 'dashboard.onboarding.create_first_board',
  invite_first_employee: 'dashboard.onboarding.invite_first_employee',
};

export const SPARKLINE_DATA = {
  bookings: [22, 18, 24, 14, 16, 8, 12, 4],
  spaceLoad: [30, 35, 28, 45, 40, 52, 48, 64],
  requests: [8, 10, 14, 12, 18, 15, 13, 12],
  tenants: [28, 28, 29, 30, 30, 31, 32, 34],
};

export const BOOKING_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  confirmed: {
    label: 'dashboard.status.confirmed',
    className: 'bg-success-subtle text-success-badge',
  },
  pending: {
    label: 'dashboard.status.pending',
    className: 'bg-hover text-muted',
  },
  checked_in: {
    label: 'dashboard.status.confirmed',
    className: 'bg-blue-900/40 text-blue-400',
  },
  completed: {
    label: 'dashboard.status.confirmed',
    className: 'bg-blue-900/40 text-blue-400',
  },
  cancelled: {
    label: 'dashboard.status.pending',
    className: 'bg-danger-subtle text-danger-badge',
  },
  no_show: {
    label: 'dashboard.status.pending',
    className: 'bg-warning-subtle text-warning-badge',
  },
  soon: {
    label: 'dashboard.status.soon',
    className: 'bg-warning-subtle text-warning-badge',
  },
};

export const BOOKING_STATUS_CLASS: Record<string, string> = {
  confirmed: 'bg-success-subtle text-success-badge',
  checked_in: 'bg-blue-900/60 text-blue-300',
  completed: 'bg-blue-900/60 text-blue-300',
  cancelled: 'bg-rose-900/60 text-rose-300',
  no_show: 'bg-warning-subtle text-warning',
};

export const QUICK_ACTION_CONFIG: Record<string, { labelKey: string; to: string }> = {
  invite_user: { labelKey: 'dashboard.quickActions.invite_user', to: '/company/settings/members' },
  create_announcement: { labelKey: 'dashboard.quickActions.create_announcement', to: '/announcements' },
  manage_bookings: { labelKey: 'dashboard.quickActions.manage_bookings', to: `${STAFF_UI_PREFIX}/bookings` },
  view_analytics: { labelKey: 'dashboard.quickActions.view_analytics', to: `${SUPERADMIN_UI_PREFIX}/analytics` },
  manage_companies: { labelKey: 'dashboard.quickActions.manage_companies', to: '/companies' },
};

export const ROLE_LABEL_KEYS: Record<string, string> = {
  superadmin: 'profile.roles.superadmin',
  company_admin: 'profile.roles.company_admin',
  employee: 'profile.roles.employee',
  reception: 'profile.roles.reception',
  guest: 'profile.roles.guest',
};

export function toPolylinePoints(values: number[]): string {
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);
  const range = maxVal - minVal || 1;
  const stepX = 60 / (values.length - 1);
  return values
    .map((v, i) => {
      const x = i * stepX;
      const y = 28 - ((v - minVal) / range) * 24;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}
