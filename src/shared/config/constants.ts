export const USER_ROLES = {
  SUPERADMIN: 'superadmin',
  COMPANY_ADMIN: 'company_admin',
  EMPLOYEE: 'employee',
  GUEST: 'guest',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const RESOURCE_TYPES = {
  DESK: 'desk',
  MEETING_ROOM: 'meeting_room',
  PARKING: 'parking',
  CAPSULE: 'capsule',
} as const;

export type ResourceType = (typeof RESOURCE_TYPES)[keyof typeof RESOURCE_TYPES];

export const BOOKING_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  NO_SHOW: 'no_show',
} as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[keyof typeof BOOKING_STATUSES];

export const TASK_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[keyof typeof TASK_PRIORITIES];

export const PASS_STATUSES = {
  ACTIVE: 'active',
  USED: 'used',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
} as const;

export type PassStatus = (typeof PASS_STATUSES)[keyof typeof PASS_STATUSES];

export const SERVICE_REQUEST_TYPES = {
  CLEANING: 'cleaning',
  REPAIR: 'repair',
  SUPPLIES: 'supplies',
  GENERAL: 'general',
} as const;

export type ServiceRequestType = (typeof SERVICE_REQUEST_TYPES)[keyof typeof SERVICE_REQUEST_TYPES];

export const SERVICE_REQUEST_STATUSES = {
  NEW: 'new',
  ACCEPTED: 'accepted',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const;

export type ServiceRequestStatus =
  (typeof SERVICE_REQUEST_STATUSES)[keyof typeof SERVICE_REQUEST_STATUSES];

export const LEAVE_TYPES = {
  VACATION: 'vacation',
  DAY_OFF: 'day_off',
  SICK: 'sick',
  REMOTE: 'remote',
} as const;

export type LeaveType = (typeof LEAVE_TYPES)[keyof typeof LEAVE_TYPES];

export const LEAVE_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type LeaveStatus = (typeof LEAVE_STATUSES)[keyof typeof LEAVE_STATUSES];

export const COMPANY_TIERS = {
  BASIC: 'basic',
  STANDARD: 'standard',
  PREMIUM: 'premium',
} as const;

export type CompanyTier = (typeof COMPANY_TIERS)[keyof typeof COMPANY_TIERS];

export const ANNOUNCEMENT_CATEGORIES = {
  INFO: 'info',
  IMPORTANT: 'important',
  EVENT: 'event',
} as const;

export type AnnouncementCategory =
  (typeof ANNOUNCEMENT_CATEGORIES)[keyof typeof ANNOUNCEMENT_CATEGORIES];
