import {
  LayoutDashboard,
  Building2,
  Users,
  CalendarDays,
  Columns3,
  Bookmark,
  Map,
  ShieldCheck,
  FileText,
  BarChart3,
  Settings,
  Wrench,
  Megaphone,
  Clock,
  ListTodo,
  Repeat,
  MailPlus,
  Bell,
  Ban,
  Trash2,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react';
import { STAFF_UI_PREFIX, SUPERADMIN_UI_PREFIX, USER_ROLES, type UserRole } from '@/shared/config/constants';

export interface NavItem {
  labelKey: string;
  path: string;
  icon: LucideIcon;
}

export interface NavSection {
  titleKey?: string;
  items: NavItem[];
}

const superadminNav: NavSection[] = [
  {
    items: [{ labelKey: 'sidebar.navItem.dashboard', path: '/', icon: LayoutDashboard }],
  },
  {
    titleKey: 'sidebar.navSection.management',
    items: [
      { labelKey: 'sidebar.navItem.employees',      path: '/team/manage',                          icon: Users },
      { labelKey: 'sidebar.navItem.invites',         path: '/company/settings/members',             icon: MailPlus },
      { labelKey: 'sidebar.navItem.companies',       path: `${SUPERADMIN_UI_PREFIX}/companies`,     icon: Building2 },
      { labelKey: 'sidebar.navItem.resources',       path: '/resources',                            icon: Bookmark },
      { labelKey: 'sidebar.navItem.bookings',           path: `${STAFF_UI_PREFIX}/bookings`,                        icon: CalendarDays },
      { labelKey: 'sidebar.navItem.cancellationAudit', path: `${STAFF_UI_PREFIX}/bookings/cancellation-audit`,    icon: Ban },
      { labelKey: 'sidebar.navItem.passes',             path: '/passes',                                           icon: ShieldCheck },
      { labelKey: 'sidebar.navItem.qrCheck',         path: '/access/validate',                      icon: ShieldCheck },
      { labelKey: 'sidebar.navItem.accessLog',        path: '/access/logs',                          icon: ClipboardList },
    ],
  },
  {
    titleKey: 'sidebar.navSection.building',
    items: [
      { labelKey: 'sidebar.navItem.buildingMap',     path: '/building/map',                         icon: Map },
      { labelKey: 'sidebar.navItem.buildingStaff',   path: '/building/staff',                       icon: Users },
      { labelKey: 'sidebar.navItem.serviceRequests', path: '/service-requests',                     icon: Wrench },
      { labelKey: 'sidebar.navItem.announcements',   path: '/announcements',                        icon: Megaphone },
    ],
  },
  {
    titleKey: 'sidebar.navSection.crm',
    items: [
      { labelKey: 'sidebar.navItem.crmBoards',       path: `${SUPERADMIN_UI_PREFIX}/crm/boards`,   icon: Columns3 },
    ],
  },
  {
    titleKey: 'sidebar.navSection.analytics',
    items: [{ labelKey: 'sidebar.navItem.analytics', path: `${SUPERADMIN_UI_PREFIX}/analytics`,    icon: BarChart3 }],
  },
  {
    titleKey: 'sidebar.navSection.settings',
    items: [{ labelKey: 'sidebar.navItem.notifications', path: '/settings/notifications',           icon: Bell }],
  },
];

const companyAdminNav: NavSection[] = [
  {
    items: [{ labelKey: 'sidebar.navItem.dashboard', path: '/', icon: LayoutDashboard }],
  },
  {
    titleKey: 'sidebar.navSection.company',
    items: [
      { labelKey: 'sidebar.navItem.myCompany',           path: '/companies',                        icon: Building2 },
      { labelKey: 'sidebar.navItem.employees',           path: '/team/manage',                      icon: Users },
      { labelKey: 'sidebar.navItem.settings',            path: '/company/settings',                 icon: Settings },
      { labelKey: 'sidebar.navItem.invites',             path: '/company/settings/members',         icon: MailPlus },
      { labelKey: 'sidebar.navItem.onboardingTemplates', path: '/company/settings/onboarding',      icon: ListTodo },
      { labelKey: 'sidebar.navItem.teamOnboarding',      path: '/company/settings/onboarding/team', icon: Users },
    ],
  },
  {
    titleKey: 'sidebar.navSection.work',
    items: [
      { labelKey: 'sidebar.navItem.crmBoards',       path: '/crm',                                  icon: Columns3 },
      { labelKey: 'sidebar.navItem.myTasks',         path: '/crm/my-tasks',                         icon: ListTodo },
      { labelKey: 'sidebar.navItem.calendar',        path: '/company/calendar',                     icon: CalendarDays },
    ],
  },
  {
    titleKey: 'sidebar.navSection.services',
    items: [
      { labelKey: 'sidebar.navItem.bookingCatalog',  path: '/bookings/catalog',                     icon: CalendarDays },
      { labelKey: 'sidebar.navItem.recurringBookings', path: '/bookings/recurring',                 icon: Repeat },
      { labelKey: 'sidebar.navItem.adminBookings',      path: `${STAFF_UI_PREFIX}/bookings`,                        icon: CalendarDays },
      { labelKey: 'sidebar.navItem.cancellationAudit', path: `${STAFF_UI_PREFIX}/bookings/cancellation-audit`,    icon: Ban },
      { labelKey: 'sidebar.navItem.buildingMap',        path: '/building/map',                                     icon: Map },
      { labelKey: 'sidebar.navItem.guestPasses',     path: '/passes',                               icon: ShieldCheck },
      { labelKey: 'sidebar.navItem.accessLog',       path: '/access/logs',                          icon: ClipboardList },
      { labelKey: 'sidebar.navItem.files',           path: '/storage',                              icon: FileText },
      { labelKey: 'sidebar.navItem.trash',           path: '/storage/trash',                        icon: Trash2 },
      { labelKey: 'sidebar.navItem.announcements',   path: '/announcements',                        icon: Megaphone },
      { labelKey: 'sidebar.navItem.leave',           path: '/hr/leaves',                            icon: Clock },
      { labelKey: 'sidebar.navItem.serviceRequests', path: '/service-requests',                     icon: Wrench },
    ],
  },
  {
    titleKey: 'sidebar.navSection.analytics',
    items: [{ labelKey: 'sidebar.navItem.analytics', path: '/analytics',                            icon: BarChart3 }],
  },
  {
    titleKey: 'sidebar.navSection.settings',
    items: [{ labelKey: 'sidebar.navItem.notifications', path: '/settings/notifications',           icon: Bell }],
  },
];

const employeeNav: NavSection[] = [
  {
    items: [{ labelKey: 'sidebar.navItem.dashboard', path: '/', icon: LayoutDashboard }],
  },
  {
    titleKey: 'sidebar.navSection.company',
    items: [
      { labelKey: 'sidebar.navItem.myCompany',       path: '/companies',                            icon: Building2 },
    ],
  },
  {
    titleKey: 'sidebar.navSection.work',
    items: [
      { labelKey: 'sidebar.navItem.crmBoards',       path: '/crm',                                  icon: Columns3 },
      { labelKey: 'sidebar.navItem.myTasks',         path: '/crm/my-tasks',                         icon: ListTodo },
      { labelKey: 'sidebar.navItem.team',            path: '/team',                                 icon: Users },
      { labelKey: 'sidebar.navItem.calendar',        path: '/company/calendar',                     icon: CalendarDays },
    ],
  },
  {
    titleKey: 'sidebar.navSection.services',
    items: [
      { labelKey: 'sidebar.navItem.bookings',        path: '/bookings/my',                          icon: CalendarDays },
      { labelKey: 'sidebar.navItem.guestPasses',     path: '/passes',                               icon: ShieldCheck },
      { labelKey: 'sidebar.navItem.files',           path: '/storage',                              icon: FileText },
      { labelKey: 'sidebar.navItem.trash',           path: '/storage/trash',                        icon: Trash2 },
      { labelKey: 'sidebar.navItem.announcements',   path: '/announcements',                        icon: Megaphone },
      { labelKey: 'sidebar.navItem.leave',           path: '/hr/leaves',                            icon: Clock },
    ],
  },
  {
    titleKey: 'sidebar.navSection.building',
    items: [
      { labelKey: 'sidebar.navItem.buildingMap',     path: '/building/map',                         icon: Map },
      { labelKey: 'sidebar.navItem.serviceRequest',  path: '/service-requests',                     icon: Wrench },
    ],
  },
  {
    titleKey: 'sidebar.navSection.settings',
    items: [{ labelKey: 'sidebar.navItem.notifications', path: '/settings/notifications',           icon: Bell }],
  },
];

const guestNav: NavSection[] = [
  {
    items: [{ labelKey: 'sidebar.navItem.dashboard', path: '/', icon: LayoutDashboard }],
  },
  {
    titleKey: 'sidebar.navSection.services',
    items: [
      { labelKey: 'sidebar.navItem.bookings',        path: '/bookings/my',                          icon: CalendarDays },
      { labelKey: 'sidebar.navItem.buildingMap',     path: '/building/map',                         icon: Map },
      { labelKey: 'sidebar.navItem.serviceRequest',  path: '/service-requests',                     icon: Wrench },
      { labelKey: 'sidebar.navItem.files',           path: '/storage',                              icon: FileText },
      { labelKey: 'sidebar.navItem.trash',           path: '/storage/trash',                        icon: Trash2 },
      { labelKey: 'sidebar.navItem.guestPasses',     path: '/passes',                               icon: ShieldCheck },
    ],
  },
];

const receptionNav: NavSection[] = [
  {
    items: [{ labelKey: 'sidebar.navItem.dashboard', path: '/', icon: LayoutDashboard }],
  },
  {
    titleKey: 'sidebar.navSection.access',
    items: [
      { labelKey: 'sidebar.navItem.qrCheck',         path: '/access/validate',                      icon: ShieldCheck },
    ],
  },
];

const serviceManagerNav: NavSection[] = [
  {
    items: [{ labelKey: 'sidebar.navItem.dashboard', path: '/', icon: LayoutDashboard }],
  },
  {
    titleKey: 'sidebar.navSection.service',
    items: [
      { labelKey: 'sidebar.navItem.serviceRequests', path: '/service-requests', icon: Wrench },
    ],
  },
  {
    titleKey: 'sidebar.navSection.settings',
    items: [{ labelKey: 'sidebar.navItem.notifications', path: '/settings/notifications', icon: Bell }],
  },
];

export const sidebarConfig: Record<UserRole, NavSection[]> = {
  [USER_ROLES.SUPERADMIN]: superadminNav,
  [USER_ROLES.RECEPTION]: receptionNav,
  [USER_ROLES.SERVICE_MANAGER]: serviceManagerNav,
  [USER_ROLES.COMPANY_ADMIN]: companyAdminNav,
  [USER_ROLES.EMPLOYEE]: employeeNav,
  [USER_ROLES.GUEST]: guestNav,
};
