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
  UserPlus,
  Clock,
  ListTodo,
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
      { label: 'Компании', path: '/companies', icon: Building2 },
      { label: 'Ресурсы', path: '/resources', icon: Bookmark },
      { label: 'Бронирования', path: '/admin/bookings', icon: CalendarDays },
      { label: 'Пропуска', path: '/passes', icon: ShieldCheck },
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
    title: 'Аналитика',
    items: [{ label: 'Аналитика', path: '/analytics', icon: BarChart3 }],
  },
];

const companyAdminNav: NavSection[] = [
  {
    items: [{ label: 'Дашборд', path: '/', icon: LayoutDashboard }],
  },
  {
    title: 'Компания',
    items: [
      { label: 'Команда', path: '/team', icon: Users },
      { label: 'Приглашения', path: '/team/manage', icon: UserPlus },
      { label: 'Настройки', path: '/company/settings', icon: Settings },
    ],
  },
  {
    title: 'Работа',
    items: [
      { label: 'CRM Доски', path: '/crm', icon: Columns3 },
      { label: 'Мои задачи', path: '/crm/my-tasks', icon: ListTodo },
      { label: 'Календарь', path: '/calendar', icon: CalendarDays },
    ],
  },
  {
    title: 'Сервисы',
    items: [
      { label: 'Бронирование', path: '/bookings', icon: Bookmark },
      { label: 'Гостевые пропуска', path: '/passes', icon: ShieldCheck },
      { label: 'Файлы', path: '/files', icon: FileText },
      { label: 'Объявления', path: '/announcements', icon: Megaphone },
      { label: 'Отпуска', path: '/leave', icon: Clock },
    ],
  },
  {
    title: 'Аналитика',
    items: [{ label: 'Аналитика', path: '/analytics', icon: BarChart3 }],
  },
];

const employeeNav: NavSection[] = [
  {
    items: [{ label: 'Дашборд', path: '/', icon: LayoutDashboard }],
  },
  {
    title: 'Работа',
    items: [
      { label: 'CRM Доски', path: '/crm', icon: Columns3 },
      { label: 'Мои задачи', path: '/crm/my-tasks', icon: ListTodo },
      { label: 'Команда', path: '/team', icon: Users },
      { label: 'Календарь', path: '/calendar', icon: CalendarDays },
    ],
  },
  {
    title: 'Сервисы',
    items: [
      { label: 'Бронирование', path: '/bookings', icon: Bookmark },
      { label: 'Гостевые пропуска', path: '/passes', icon: ShieldCheck },
      { label: 'Файлы', path: '/files', icon: FileText },
      { label: 'Объявления', path: '/announcements', icon: Megaphone },
      { label: 'Отпуска', path: '/leave', icon: Clock },
    ],
  },
  {
    title: 'Здание',
    items: [
      { label: 'Карта здания', path: '/building/map', icon: Map },
      { label: 'Сервисная заявка', path: '/service-requests', icon: Wrench },
    ],
  },
];

const guestNav: NavSection[] = [
  {
    items: [{ label: 'Дашборд', path: '/', icon: LayoutDashboard }],
  },
  {
    title: 'Сервисы',
    items: [
      { label: 'Бронирование', path: '/bookings', icon: Bookmark },
      { label: 'Карта здания', path: '/building/map', icon: Map },
      { label: 'Мои файлы', path: '/files', icon: FileText },
      { label: 'Объявления', path: '/announcements', icon: Megaphone },
      { label: 'Гостевые пропуска', path: '/passes', icon: ShieldCheck },
      { label: 'Сервисная заявка', path: '/service-requests', icon: Wrench },
    ],
  },
];

export const sidebarConfig: Record<UserRole, NavSection[]> = {
  [USER_ROLES.SUPERADMIN]: superadminNav,
  [USER_ROLES.COMPANY_ADMIN]: companyAdminNav,
  [USER_ROLES.EMPLOYEE]: employeeNav,
  [USER_ROLES.GUEST]: guestNav,
};
