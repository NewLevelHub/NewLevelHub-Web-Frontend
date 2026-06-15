import { createBrowserRouter, Navigate, useLocation, useParams } from 'react-router';

import { RequireAuth } from '@/shared/guards/RequireAuth';
import { RequireGuest } from '@/shared/guards/RequireGuest';
import { RequireRole } from '@/shared/guards/RequireRole';
import { AppLayout } from '@/shared/ui/layouts/AppLayout';
import { AuthLayout } from '@/shared/ui/layouts/AuthLayout';
import { STAFF_UI_PREFIX, SUPERADMIN_UI_PREFIX, USER_ROLES } from '@/shared/config/constants';

// Auth pages
import WelcomePage from '@/pages/home/WelcomePage';
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
import CompanyOnboardingTemplatesPage from '@/pages/company/CompanyOnboardingTemplatesPage';
import TeamOnboardingPage from '@/pages/company/TeamOnboardingPage';

// Team
import TeamDirectoryPage from '@/pages/team/TeamDirectoryPage';
import TeamManagePage from '@/pages/team/TeamManagePage';

// CRM
import BoardListPage from '@/pages/crm/BoardListPage';
import BoardDetailPage from '@/pages/crm/BoardDetailPage';
import TaskDetailPage from '@/pages/crm/TaskDetailPage';
import MyTasksPage from '@/pages/crm/MyTasksPage';
import AdminBoardsPage from '@/pages/crm/AdminBoardsPage';

// Calendar
import CalendarPage from '@/pages/calendar/CalendarPage';

// Bookings
import BookingCatalogPage from '@/pages/bookings/BookingCatalogPage';
import BookingResourceSchedulePage from '@/pages/bookings/BookingResourceSchedulePage';
import BookingCreatePage from '@/pages/bookings/BookingCreatePage';
import BookingDetailPage from '@/pages/bookings/BookingDetailPage';
import MyBookingsPage from '@/pages/bookings/MyBookingsPage';
import ManageBookingsPage from '@/pages/bookings/ManageBookingsPage';
import RecurringBookingsPage from '@/pages/bookings/RecurringBookingsPage';
import CancellationAuditPage from '@/pages/bookings/CancellationAuditPage';

// Resources (superadmin)
import ResourceListPage from '@/pages/resources/ResourceListPage';
import ResourceCreatePage from '@/pages/resources/ResourceCreatePage';
import ResourceDetailPage from '@/pages/resources/ResourceDetailPage';

// Passes
import PassListPage from '@/pages/passes/PassListPage';
import PassCreatePage from '@/pages/passes/PassCreatePage';
import PassDetailPage from '@/pages/passes/PassDetailPage';
import PassValidatePage from '@/pages/passes/PassValidatePage';

// Building
import MapManagePage from '@/pages/building/MapManagePage';
import BuildingStaffPage from '@/pages/building/BuildingStaffPage';

// Service requests
import ServiceRequestListPage from '@/pages/service-requests/ServiceRequestListPage';
import ServiceRequestCreatePage from '@/pages/service-requests/ServiceRequestCreatePage';

// Announcements
import AnnouncementListPage from '@/pages/announcements/AnnouncementListPage';
import AnnouncementCreatePage from '@/pages/announcements/AnnouncementCreatePage';

// Leave
import LeaveRequestListPage from '@/pages/leave/LeaveRequestListPage';
import LeaveRequestCreatePage from '@/pages/leave/LeaveRequestCreatePage';
import LeaveRequestEditPage from '@/pages/leave/LeaveRequestEditPage';

// Files
import FileBrowserPage from '@/pages/files/FileBrowserPage';
import TrashPage from '@/pages/files/trash/TrashPage';

// Notifications
import NotificationListPage from '@/pages/notifications/NotificationListPage';
import NotificationPreferencesPage from '@/pages/notifications/NotificationPreferencesPage';

// Analytics
import AnalyticsDashboardPage from '@/pages/analytics/AnalyticsDashboardPage';
import SuperadminAnalyticsPage from '@/pages/analytics/SuperadminAnalyticsPage';

// Profile
import ProfilePage from '@/pages/profile/ProfilePage';
import ProfileSettingsPage from '@/pages/profile/ProfileSettingsPage';

// Users (superadmin)
import UsersListPage from '@/pages/users/UsersListPage';
import UserDetailPage from '@/pages/users/UserDetailPage';

// Map
import MapPage from '@/pages/map/MapPage';

// Onboarding
import OnboardingWizardPage from '@/pages/onboarding/OnboardingWizardPage';

// Unsubscribe
import UnsubscribeSuccessPage from '@/pages/unsubscribe/UnsubscribeSuccessPage';
import UnsubscribeInvalidPage from '@/pages/unsubscribe/UnsubscribeInvalidPage';

// Errors
import NotFoundPage from '@/pages/errors/NotFoundPage';
import ForbiddenPage from '@/pages/errors/ForbiddenPage';

const { SUPERADMIN, RECEPTION, SERVICE_MANAGER, COMPANY_ADMIN, EMPLOYEE, GUEST } = USER_ROLES;

/** Old `/admin/bookings` SPA URLs → `/staff/bookings` (shared staff UI, not Django admin). */
function SuperadminLegacyRedirect() {
  const location = useLocation();
  if (location.pathname === '/admin/bookings' || location.pathname.startsWith('/admin/bookings/')) {
    const tail = location.pathname.slice('/admin/bookings'.length);
    return <Navigate to={`${STAFF_UI_PREFIX}/bookings${tail}${location.search}${location.hash}`} replace />;
  }
  if (!location.pathname.startsWith('/admin/')) {
    return <Navigate to="/dashboard" replace />;
  }
  const suffix = location.pathname.slice('/admin'.length);
  return <Navigate to={`${SUPERADMIN_UI_PREFIX}${suffix}${location.search}${location.hash}`} replace />;
}

function RedirectSuperadminBookingsListToStaff() {
  return <Navigate to={`${STAFF_UI_PREFIX}/bookings`} replace />;
}

function RedirectSuperadminBookingDetailToStaff() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`${STAFF_UI_PREFIX}/bookings/${id}`} replace />;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <WelcomePage />,
  },

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

  // ── Unsubscribe pages (public, no auth required) ──
  {
    element: <AuthLayout />,
    children: [
      { path: '/unsubscribe/success', element: <UnsubscribeSuccessPage /> },
      { path: '/unsubscribe/invalid', element: <UnsubscribeInvalidPage /> },
    ],
  },

  // ── Protected routes (authenticated) ──
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          // Guest-accessible routes
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/profile', element: <ProfilePage /> },
          { path: '/profile/settings', element: <ProfileSettingsPage /> },

          // Notifications — all authenticated roles
          {
            element: <RequireRole allowed={[SUPERADMIN, COMPANY_ADMIN, EMPLOYEE, RECEPTION, GUEST]} />,
            children: [
              { path: '/notifications', element: <NotificationListPage /> },
              { path: '/settings/notifications', element: <NotificationPreferencesPage /> },
            ],
          },

          // Bookings + map + passes — available to guests
          {
            element: <RequireRole allowed={[SUPERADMIN, COMPANY_ADMIN, EMPLOYEE, RECEPTION, GUEST]} />,
            children: [
              { path: '/bookings', element: <Navigate to="/bookings/catalog" replace /> },
              { path: '/bookings/catalog', element: <BookingCatalogPage /> },
              { path: '/bookings/resources/:id', element: <BookingResourceSchedulePage /> },
              { path: '/bookings/new', element: <BookingCreatePage /> },
              { path: '/bookings/my', element: <MyBookingsPage /> },
              { path: '/bookings/:id', element: <BookingDetailPage /> },
              { path: 'building/map', element: <MapPage /> },
              { path: '/passes', element: <PassListPage /> },
              { path: '/passes/new', element: <PassCreatePage /> },
              { path: '/passes/:id', element: <PassDetailPage /> },
            ],
          },

          // Company admin + employee onboarding
          {
            element: <RequireRole allowed={[COMPANY_ADMIN, EMPLOYEE]} />,
            children: [
              { path: '/onboarding', element: <OnboardingWizardPage /> },
            ],
          },

          // service_manager is building-wide and only needs access to the
          // service-requests views (no /new since they can't create on behalf).
          {
            element: <RequireRole allowed={[SUPERADMIN, COMPANY_ADMIN, EMPLOYEE, SERVICE_MANAGER, GUEST]} />,
            children: [
              { path: '/service-requests', element: <ServiceRequestListPage /> },
            ],
          },

          // Service request creation + files/storage — available to guests
          {
            element: <RequireRole allowed={[SUPERADMIN, COMPANY_ADMIN, EMPLOYEE, GUEST]} />,
            children: [
              { path: '/service-requests/new', element: <ServiceRequestCreatePage /> },
              { path: '/files', element: <FileBrowserPage /> },
              { path: '/storage', element: <FileBrowserPage /> },
              { path: '/storage/trash', element: <TrashPage /> },
            ],
          },

          // Company users (superadmin + company_admin + employee)
          {
            element: <RequireRole allowed={[SUPERADMIN, COMPANY_ADMIN, EMPLOYEE]} />,
            children: [
              { path: '/bookings/recurring', element: <RecurringBookingsPage /> },
              { path: '/crm', element: <BoardListPage /> },
              { path: '/crm/boards/:id', element: <BoardDetailPage /> },
              { path: '/crm/tasks/:id', element: <TaskDetailPage /> },
              { path: '/crm/my-tasks', element: <MyTasksPage /> },
              { path: '/team', element: <TeamDirectoryPage /> },
              { path: '/company/calendar', element: <CalendarPage /> },
              { path: '/calendar', element: <Navigate to="/company/calendar" replace /> },
              { path: '/hr/leaves', element: <LeaveRequestListPage /> },
              { path: '/hr/leaves/new', element: <LeaveRequestCreatePage /> },
              { path: '/hr/leaves/:id/edit', element: <LeaveRequestEditPage /> },
              { path: '/leave', element: <Navigate to="/hr/leaves" replace /> },
              { path: '/leave/new', element: <Navigate to="/hr/leaves/new" replace /> },
            ],
          },

          // Announcements — company users only (not guests)
          {
            element: <RequireRole allowed={[SUPERADMIN, COMPANY_ADMIN, EMPLOYEE]} />,
            children: [
              { path: '/announcements', element: <AnnouncementListPage /> },
            ],
          },

          // Company admin + superadmin
          {
            element: <RequireRole allowed={[SUPERADMIN, COMPANY_ADMIN]} />,
            children: [
              { path: '/team/manage', element: <TeamManagePage /> },
              { path: '/announcements/new', element: <AnnouncementCreatePage /> },
              { path: '/analytics', element: <AnalyticsDashboardPage /> },
              { path: '/company/analytics', element: <AnalyticsDashboardPage /> },

            ],
          },

          // Company admin + superadmin
          {
            element: <RequireRole allowed={[SUPERADMIN, COMPANY_ADMIN]} />,
            children: [
              { path: '/company/settings', element: <CompanySettingsPage /> },
            ],
          },

          // Company admin + superadmin
          {
            element: <RequireRole allowed={[SUPERADMIN, COMPANY_ADMIN]} />,
            children: [
              { path: '/company/settings/members', element: <CompanyMembersPage /> },
              { path: '/company/settings/onboarding', element: <CompanyOnboardingTemplatesPage /> },
              { path: '/company/settings/onboarding/team', element: <TeamOnboardingPage /> },
            ],
          },

          // Companies — list visible to all company roles, detail to all, create superadmin only
          {
            element: <RequireRole allowed={[SUPERADMIN, COMPANY_ADMIN, EMPLOYEE]} />,
            children: [
              { path: '/companies', element: <CompanyListPage /> },
              { path: `${SUPERADMIN_UI_PREFIX}/companies`, element: <CompanyListPage /> },
              { path: '/companies/:id', element: <CompanyDetailPage /> },
              { path: `${SUPERADMIN_UI_PREFIX}/companies/:id`, element: <CompanyDetailPage /> },
            ],
          },
          {
            element: <RequireRole allowed={[SUPERADMIN]} />,
            children: [
              { path: '/companies/new', element: <CompanyCreatePage /> },
              { path: `${SUPERADMIN_UI_PREFIX}/companies/new`, element: <CompanyCreatePage /> },
            ],
          },

          // Superadmin + company_admin (neutral `/staff/` — not under `/superadmin/`)
          {
            element: <RequireRole allowed={[SUPERADMIN, COMPANY_ADMIN]} />,
            children: [
              { path: `${STAFF_UI_PREFIX}/bookings`, element: <ManageBookingsPage /> },
              { path: `${STAFF_UI_PREFIX}/bookings/cancellation-audit`, element: <CancellationAuditPage /> },
              { path: `${STAFF_UI_PREFIX}/bookings/:id`, element: <BookingDetailPage /> },
            ],
          },
          { path: `${SUPERADMIN_UI_PREFIX}/bookings`, element: <RedirectSuperadminBookingsListToStaff /> },
          { path: `${SUPERADMIN_UI_PREFIX}/bookings/:id`, element: <RedirectSuperadminBookingDetailToStaff /> },

          // Superadmin + reception
          {
            element: <RequireRole allowed={[SUPERADMIN, RECEPTION]} />,
            children: [
              { path: '/access/validate', element: <PassValidatePage /> },
              { path: '/passes/validate', element: <Navigate to="/access/validate" replace /> },
            ],
          },

          // Superadmin only
          {
            element: <RequireRole allowed={[SUPERADMIN]} />,
            children: [
              { path: `${SUPERADMIN_UI_PREFIX}/analytics`, element: <SuperadminAnalyticsPage /> },
              { path: `${SUPERADMIN_UI_PREFIX}/crm/boards`, element: <AdminBoardsPage /> },
              { path: '/resources', element: <ResourceListPage /> },
              { path: '/resources/new', element: <ResourceCreatePage /> },
              { path: '/resources/:id', element: <ResourceDetailPage /> },
              { path: '/building/map/manage', element: <MapManagePage /> },
              { path: '/building/staff', element: <BuildingStaffPage /> },
              { path: '/users', element: <UsersListPage /> },
              { path: '/users/:id', element: <UserDetailPage /> },
              { path: `${SUPERADMIN_UI_PREFIX}/users`, element: <UsersListPage /> },
              { path: `${SUPERADMIN_UI_PREFIX}/users/:id`, element: <UserDetailPage /> },
            ],
          },

          { path: '/admin/*', element: <SuperadminLegacyRedirect /> },

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
