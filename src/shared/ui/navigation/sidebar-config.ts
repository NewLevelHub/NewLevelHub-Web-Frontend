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
  type LucideIcon,
} from 'lucide-react';
import { USER_ROLES, type UserRole } from '@/shared/config/constants';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

const superadminNav: NavSection[] = [
  {
    items: [{ label: 'Дашборд', path: '/', icon: LayoutDashboard }],
  },
  {
    title: 'Управление',
    items: [
      { label: 'Пользователи', path: '/admin/users', icon: Users },
      { label: 'Команда', path: '/company/team', icon: Users },
      { label: 'Сотрудники', path: '/team/manage', icon: Users },
      { label: 'Инвайты', path: '/company/settings/members', icon: MailPlus },
      { label: 'Компании', path: '/admin/companies', icon: Building2 },
      { label: 'Ресурсы', path: '/resources', icon: Bookmark },
      { label: 'Бронирования', path: '/admin/bookings', icon: CalendarDays },
      { label: 'Пропуска', path: '/passes', icon: ShieldCheck },
      { label: 'Проверка QR', path: '/access/validate', icon: ShieldCheck },
      { label: 'Лог доступа', path: '/access-log', icon: Clock },
    ],
  },
  {
    title: 'Здание',
    items: [
      { label: 'Карта здания', path: '/building/map', icon: Map },
      { label: 'Сервисные заявки', path: '/service-requests', icon: Wrench },
      { label: 'Объявления', path: '/announcements', icon: Megaphone },
    ],
  },
  {
    title: 'CRM',
    items: [
      { label: 'CRM Доски', path: '/admin/crm/boards', icon: Columns3 },
    ],
  },
  {
    title: 'Аналитика',
    items: [{ label: 'Аналитика', path: '/analytics', icon: BarChart3 }],
  },
  {
    title: 'Настройки',
    items: [{ label: 'Уведомления', path: '/settings/notifications', icon: Bell }],
  },
];

const companyAdminNav: NavSection[] = [
  {
    items: [{ label: 'Дашборд', path: '/', icon: LayoutDashboard }],
  },
  {
    title: 'Компания',
    items: [
      { label: 'Моя компания', path: '/companies', icon: Building2 },
      { label: 'Команда', path: '/company/team', icon: Users },
      { label: 'Сотрудники', path: '/team/manage', icon: Users },
      { label: 'Настройки', path: '/company/settings', icon: Settings },
      { label: 'Инвайты', path: '/company/settings/members', icon: MailPlus },
      { label: 'Онбординг шаблоны', path: '/company/settings/onboarding', icon: ListTodo },
    ],
  },
  {
    title: 'Работа',
    items: [
      { label: 'CRM Доски', path: '/crm', icon: Columns3 },
      { label: 'Мои задачи', path: '/crm/my-tasks', icon: ListTodo },
      { label: 'Календарь', path: '/company/calendar', icon: CalendarDays },
    ],
  },
  {
    title: 'Сервисы',
    items: [
      { label: 'Бронирование', path: '/bookings/catalog', icon: Bookmark },
      { label: 'Рекуррентные брони', path: '/bookings/recurring', icon: Repeat },
      { label: 'Бронирования (админ)', path: '/admin/bookings', icon: CalendarDays },
      { label: 'Гостевые пропуска', path: '/passes', icon: ShieldCheck },
      { label: 'Файлы', path: '/storage', icon: FileText },
      { label: 'Объявления', path: '/announcements', icon: Megaphone },
      { label: 'Отпуска', path: '/hr/leaves', icon: Clock },
    ],
  },
  {
    title: 'Аналитика',
    items: [{ label: 'Аналитика', path: '/analytics', icon: BarChart3 }],
  },
  {
    title: 'Настройки',
    items: [{ label: 'Уведомления', path: '/settings/notifications', icon: Bell }],
  },
];

const employeeNav: NavSection[] = [
  {
    items: [{ label: 'Дашборд', path: '/', icon: LayoutDashboard }],
  },
  {
    title: 'Компания',
    items: [
      { label: 'Моя компания', path: '/companies', icon: Building2 },
    ],
  },
  {
    title: 'Работа',
    items: [
      { label: 'CRM Доски', path: '/crm', icon: Columns3 },
      { label: 'Мои задачи', path: '/crm/my-tasks', icon: ListTodo },
      { label: 'Команда', path: '/company/team', icon: Users },
      { label: 'Календарь', path: '/company/calendar', icon: CalendarDays },
    ],
  },
  {
    title: 'Сервисы',
    items: [
      { label: 'Бронирование', path: '/bookings/catalog', icon: Bookmark },
      { label: 'Рекуррентные брони', path: '/bookings/recurring', icon: Repeat },
      { label: 'Гостевые пропуска', path: '/passes', icon: ShieldCheck },
      { label: 'Файлы', path: '/storage', icon: FileText },
      { label: 'Объявления', path: '/announcements', icon: Megaphone },
      { label: 'Отпуска', path: '/hr/leaves', icon: Clock },
    ],
  },
  {
    title: 'Здание',
    items: [
      { label: 'Карта здания', path: '/building/map', icon: Map },
      { label: 'Сервисная заявка', path: '/service-requests', icon: Wrench },
    ],
  },
  {
    title: 'Настройки',
    items: [{ label: 'Уведомления', path: '/settings/notifications', icon: Bell }],
  },
];

const guestNav: NavSection[] = [
  {
    items: [{ label: 'Дашборд', path: '/', icon: LayoutDashboard }],
  },
  {
    title: 'Сервисы',
    items: [
      { label: 'Бронирование', path: '/bookings/catalog', icon: Bookmark },
      { label: 'Карта здания', path: '/building/map', icon: Map },
      { label: 'Объявления', path: '/announcements', icon: Megaphone },
      { label: 'Гостевые пропуска', path: '/passes', icon: ShieldCheck },
      { label: 'Сервисная заявка', path: '/service-requests', icon: Wrench },
    ],
  },
  {
    title: 'Настройки',
    items: [{ label: 'Уведомления', path: '/settings/notifications', icon: Bell }],
  },
];

const receptionNav: NavSection[] = [
  {
    items: [{ label: 'Дашборд', path: '/', icon: LayoutDashboard }],
  },
  {
    title: 'Доступ',
    items: [
      { label: 'Проверка QR', path: '/access/validate', icon: ShieldCheck },
    ],
  },
];

export const sidebarConfig: Record<UserRole, NavSection[]> = {
  [USER_ROLES.SUPERADMIN]: superadminNav,
  [USER_ROLES.RECEPTION]: receptionNav,
  [USER_ROLES.COMPANY_ADMIN]: companyAdminNav,
  [USER_ROLES.EMPLOYEE]: employeeNav,
  [USER_ROLES.GUEST]: guestNav,
};
