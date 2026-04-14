import { createBrowserRouter, Navigate } from 'react-router';

import { RequireAuth } from '@/shared/guards/RequireAuth';
import { RequireGuest } from '@/shared/guards/RequireGuest';
import { RequireRole } from '@/shared/guards/RequireRole';
import { AppLayout } from '@/shared/ui/layouts/AppLayout';
import { AuthLayout } from '@/shared/ui/layouts/AuthLayout';
import { USER_ROLES } from '@/shared/config/constants';

// Auth pages
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import InviteAcceptPage from '@/pages/auth/InviteAcceptPage';
import VerifyEmailPage from '@/pages/auth/VerifyEmailPage';

// Dashboard
import DashboardPage from '@/pages/dashboard/DashboardPage';

// Companies (superadmin)
import CompanyListPage from '@/pages/companies/CompanyListPage';
import CompanyCreatePage from '@/pages/companies/CompanyCreatePage';
import CompanyDetailPage from '@/pages/companies/CompanyDetailPage';

// Company settings (company admin)
import CompanySettingsPage from '@/pages/company/CompanySettingsPage';
import CompanyMembersPage from '@/pages/company/CompanyMembersPage';

// Team
import TeamDirectoryPage from '@/pages/team/TeamDirectoryPage';
import TeamManagePage from '@/pages/team/TeamManagePage';

// CRM
import BoardListPage from '@/pages/crm/BoardListPage';
import BoardDetailPage from '@/pages/crm/BoardDetailPage';
import MyTasksPage from '@/pages/crm/MyTasksPage';

// Calendar
import CalendarPage from '@/pages/calendar/CalendarPage';

// Bookings
import BookingCatalogPage from '@/pages/bookings/BookingCatalogPage';
import BookingResourceSchedulePage from '@/pages/bookings/BookingResourceSchedulePage';
import BookingCreatePage from '@/pages/bookings/BookingCreatePage';
import BookingDetailPage from '@/pages/bookings/BookingDetailPage';
import MyBookingsPage from '@/pages/bookings/MyBookingsPage';
import ManageBookingsPage from '@/pages/bookings/ManageBookingsPage';

// Resources (superadmin)
import ResourceListPage from '@/pages/resources/ResourceListPage';
import ResourceCreatePage from '@/pages/resources/ResourceCreatePage';
import ResourceDetailPage from '@/pages/resources/ResourceDetailPage';

// Passes
import PassListPage from '@/pages/passes/PassListPage';
import PassCreatePage from '@/pages/passes/PassCreatePage';
import PassValidatePage from '@/pages/passes/PassValidatePage';

// Access log
import AccessLogPage from '@/pages/access/AccessLogPage';

// Building
import BuildingMapPage from '@/pages/building/BuildingMapPage';
import MapManagePage from '@/pages/building/MapManagePage';

// Service requests
import ServiceRequestListPage from '@/pages/service-requests/ServiceRequestListPage';
import ServiceRequestCreatePage from '@/pages/service-requests/ServiceRequestCreatePage';

// Announcements
import AnnouncementListPage from '@/pages/announcements/AnnouncementListPage';
import AnnouncementCreatePage from '@/pages/announcements/AnnouncementCreatePage';

// Leave
import LeaveRequestListPage from '@/pages/leave/LeaveRequestListPage';
import LeaveRequestCreatePage from '@/pages/leave/LeaveRequestCreatePage';

// Files
import FileBrowserPage from '@/pages/files/FileBrowserPage';

// Notifications
import NotificationListPage from '@/pages/notifications/NotificationListPage';

// Analytics
import AnalyticsDashboardPage from '@/pages/analytics/AnalyticsDashboardPage';

// Profile
import ProfilePage from '@/pages/profile/ProfilePage';
import ProfileSettingsPage from '@/pages/profile/ProfileSettingsPage';

// Users (superadmin)
import UsersListPage from '@/pages/users/UsersListPage';
import UserDetailPage from '@/pages/users/UserDetailPage';

// Errors
import NotFoundPage from '@/pages/errors/NotFoundPage';
import ForbiddenPage from '@/pages/errors/ForbiddenPage';

const { SUPERADMIN, COMPANY_ADMIN, EMPLOYEE } = USER_ROLES;

export const router = createBrowserRouter([
  // ── Public routes (only for non-authenticated) ──
  {
    element: <RequireGuest />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
          { path: '/forgot-password', element: <ForgotPasswordPage /> },
          { path: '/reset-password', element: <ResetPasswordPage /> },
          { path: '/invite', element: <InviteAcceptPage /> },
          { path: '/invite/:token', element: <InviteAcceptPage /> },
        ],
      },
    ],
  },

  // ── Email verification (accessible regardless of auth state) ──
  {
    element: <AuthLayout />,
    children: [{ path: '/verify-email', element: <VerifyEmailPage /> }],
  },

  // ── Protected routes (authenticated) ──
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          // All roles
          { path: '/', element: <DashboardPage /> },
          { path: '/profile', element: <ProfilePage /> },
          { path: '/profile/settings', element: <ProfileSettingsPage /> },
          { path: '/notifications', element: <NotificationListPage /> },
          { path: '/bookings', element: <Navigate to="/bookings/catalog" replace /> },
          { path: '/bookings/catalog', element: <BookingCatalogPage /> },
          { path: '/bookings/resources/:id', element: <BookingResourceSchedulePage /> },
          { path: '/bookings/new', element: <BookingCreatePage /> },
          { path: '/bookings/my', element: <MyBookingsPage /> },
          { path: '/bookings/:id', element: <BookingDetailPage /> },
          { path: '/building/map', element: <BuildingMapPage /> },
          { path: '/announcements', element: <AnnouncementListPage /> },
          { path: '/files', element: <FileBrowserPage /> },
          { path: '/passes', element: <PassListPage /> },
          { path: '/passes/new', element: <PassCreatePage /> },
          { path: '/service-requests', element: <ServiceRequestListPage /> },
          { path: '/service-requests/new', element: <ServiceRequestCreatePage /> },

          // Company users (superadmin + company_admin + employee)
          {
            element: <RequireRole allowed={[SUPERADMIN, COMPANY_ADMIN, EMPLOYEE]} />,
            children: [
              { path: '/crm', element: <BoardListPage /> },
              { path: '/crm/boards/:id', element: <BoardDetailPage /> },
              { path: '/crm/my-tasks', element: <MyTasksPage /> },
              { path: '/team', element: <TeamDirectoryPage /> },
              { path: '/calendar', element: <CalendarPage /> },
              { path: '/leave', element: <LeaveRequestListPage /> },
              { path: '/leave/new', element: <LeaveRequestCreatePage /> },
            ],
          },

          // Company admin + superadmin
          {
            element: <RequireRole allowed={[SUPERADMIN, COMPANY_ADMIN]} />,
            children: [
              { path: '/team/manage', element: <TeamManagePage /> },
              { path: '/announcements/new', element: <AnnouncementCreatePage /> },
              { path: '/analytics', element: <AnalyticsDashboardPage /> },
            ],
          },

          // Company admin + superadmin + employee (read-only for employee)
          {
            element: <RequireRole allowed={[SUPERADMIN, COMPANY_ADMIN, EMPLOYEE]} />,
            children: [
              { path: '/company/settings', element: <CompanySettingsPage /> },
            ],
          },

          // Company admin + superadmin
          {
            element: <RequireRole allowed={[SUPERADMIN, COMPANY_ADMIN]} />,
            children: [
              { path: '/company/settings/members', element: <CompanyMembersPage /> },
            ],
          },

          // Companies — list visible to all company roles, detail to all, create superadmin only
          {
            element: <RequireRole allowed={[SUPERADMIN, COMPANY_ADMIN, EMPLOYEE]} />,
            children: [
              { path: '/companies', element: <CompanyListPage /> },
              { path: '/companies/:id', element: <CompanyDetailPage /> },
            ],
          },
          {
            element: <RequireRole allowed={[SUPERADMIN]} />,
            children: [{ path: '/companies/new', element: <CompanyCreatePage /> }],
          },

          // Superadmin only
          {
            element: <RequireRole allowed={[SUPERADMIN]} />,
            children: [
              { path: '/resources', element: <ResourceListPage /> },
              { path: '/resources/new', element: <ResourceCreatePage /> },
              { path: '/resources/:id', element: <ResourceDetailPage /> },
              { path: '/admin/bookings', element: <ManageBookingsPage /> },
              { path: '/access-log', element: <AccessLogPage /> },
              { path: '/building/map/manage', element: <MapManagePage /> },
              { path: '/passes/validate', element: <PassValidatePage /> },
              { path: '/users', element: <UsersListPage /> },
              { path: '/users/:id', element: <UserDetailPage /> },
            ],
          },

          // Error routes
          { path: '/403', element: <ForbiddenPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },

  // Catch-all for unauthenticated
  { path: '*', element: <NotFoundPage /> },
]);
