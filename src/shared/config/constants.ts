export const USER_ROLES = {
  SUPERADMIN: 'superadmin',
  RECEPTION: 'reception',
  COMPANY_ADMIN: 'company_admin',
  EMPLOYEE: 'employee',
  GUEST: 'guest',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [USER_ROLES.SUPERADMIN]: 'Суперадмин',
  [USER_ROLES.RECEPTION]: 'Ресепшн',
  [USER_ROLES.COMPANY_ADMIN]: 'Администратор компании',
  [USER_ROLES.EMPLOYEE]: 'Сотрудник',
  [USER_ROLES.GUEST]: 'Гость',
};

/**
 * SPA routes only for the platform superadmin. Kept outside `/admin/` so they never
 * collide with Django admin (`/admin/<app_label>/`).
 */
export const SUPERADMIN_UI_PREFIX = '/superadmin' as const;

/**
 * SPA routes for elevated staff tools shared by superadmin and company admin
 * (e.g. cross-company or company-wide booking management). Not under `/superadmin/`
 * so company admins are not sent through a misleading URL prefix.
 */
export const STAFF_UI_PREFIX = '/staff' as const;

export const RESOURCE_TYPES = {
  DESK: 'desk',
  MEETING_ROOM: 'meeting_room',
  PARKING: 'parking',
  CAPSULE: 'capsule',
} as const;

export type ResourceType = (typeof RESOURCE_TYPES)[keyof typeof RESOURCE_TYPES];

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  [RESOURCE_TYPES.DESK]: 'Рабочее место',
  [RESOURCE_TYPES.MEETING_ROOM]: 'Переговорка',
  [RESOURCE_TYPES.PARKING]: 'Парковка',
  [RESOURCE_TYPES.CAPSULE]: 'Капсула',
};

/** Ключи тела `equipment` для `meeting_room` (совпадают с бэкендом). */
export const RESOURCE_EQUIPMENT_KEYS = [
  'projector',
  'tv',
  'whiteboard',
  'video_conf',
  'monitor',
  'dock',
  'power_outlet',
] as const;

export type ResourceEquipmentKey = (typeof RESOURCE_EQUIPMENT_KEYS)[number];

export const RESOURCE_EQUIPMENT_LABELS: Record<ResourceEquipmentKey, string> = {
  projector: 'Проектор',
  tv: 'ТВ',
  whiteboard: 'Доска',
  video_conf: 'Видеосвязь',
  monitor: 'Монитор',
  dock: 'Док-станция',
  power_outlet: 'Розетка',
};

export const PARKING_TYPES = {
  REGULAR: 'regular',
  VIP: 'vip',
} as const;

export type ParkingType = (typeof PARKING_TYPES)[keyof typeof PARKING_TYPES];

export const CAPSULE_ZONES = {
  QUIET: 'quiet',
  REGULAR: 'regular',
} as const;

export type CapsuleZone = (typeof CAPSULE_ZONES)[keyof typeof CAPSULE_ZONES];

export const BOOKING_STATUSES = {
  CONFIRMED: 'confirmed',
  CHECKED_IN: 'checked_in',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  NO_SHOW: 'no_show',
} as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[keyof typeof BOOKING_STATUSES];

/** Статус занятости в каталоге GET /bookings/resources/ */
export const BOOKING_RESOURCE_CATALOG_STATUS = {
  FREE: 'free',
  OCCUPIED: 'occupied',
  BLOCKED: 'blocked',
  SOON_AVAILABLE: 'soon_available',
} as const;

export type BookingResourceCatalogStatus =
  (typeof BOOKING_RESOURCE_CATALOG_STATUS)[keyof typeof BOOKING_RESOURCE_CATALOG_STATUS];

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

export const SERVICE_REQUEST_TYPE_LABELS: Record<ServiceRequestType, string> = {
  cleaning: 'Уборка',
  repair: 'Ремонт',
  supplies: 'Расходники',
  general: 'Общая',
};

export const SERVICE_REQUEST_STATUSES = {
  NEW: 'new',
  ACCEPTED: 'accepted',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const;

export type ServiceRequestStatus =
  (typeof SERVICE_REQUEST_STATUSES)[keyof typeof SERVICE_REQUEST_STATUSES];

export const SERVICE_REQUEST_STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  new: 'Новая',
  accepted: 'Принята',
  in_progress: 'В работе',
  completed: 'Выполнена',
};

export const SERVICE_REQUEST_STATUS_TRANSITIONS: Record<ServiceRequestStatus, ServiceRequestStatus | null> = {
  new: 'accepted',
  accepted: 'in_progress',
  in_progress: 'completed',
  completed: null,
};

export const LEAVE_TYPES = {
  VACATION: 'vacation',
  DAY_OFF: 'day_off',
  SICK: 'sick_leave',
  SICK_LEAVE: 'sick_leave',
  REMOTE: 'remote',
} as const;

export type LeaveType = (typeof LEAVE_TYPES)[keyof typeof LEAVE_TYPES];

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  [LEAVE_TYPES.VACATION]: 'Отпуск',
  [LEAVE_TYPES.DAY_OFF]: 'Отгул',
  [LEAVE_TYPES.SICK_LEAVE]: 'Больничный',
  [LEAVE_TYPES.REMOTE]: 'Удаленно',
};

export const LEAVE_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type LeaveStatus = (typeof LEAVE_STATUSES)[keyof typeof LEAVE_STATUSES];

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  [LEAVE_STATUSES.PENDING]: 'На рассмотрении',
  [LEAVE_STATUSES.APPROVED]: 'Одобрено',
  [LEAVE_STATUSES.REJECTED]: 'Отклонено',
};

export const COMPANY_TIERS = {
  BASIC: 'basic',
  STANDARD: 'standard',
  PREMIUM: 'premium',
} as const;

export type CompanyTier = (typeof COMPANY_TIERS)[keyof typeof COMPANY_TIERS];

/**
 * Default limits per plan — must stay in sync with `Company.PLAN_DEFAULT_LIMITS`
 * in `apps/companies/models.py` (NewLevelHub-Backend).
 */
export const COMPANY_PLAN_DEFAULT_LIMITS: Record<
  CompanyTier,
  { max_employees: number; max_boards: number; storage_limit_gb: number }
> = {
  [COMPANY_TIERS.BASIC]: { max_employees: 10, max_boards: 1, storage_limit_gb: 5 },
  [COMPANY_TIERS.STANDARD]: { max_employees: 30, max_boards: 5, storage_limit_gb: 20 },
  [COMPANY_TIERS.PREMIUM]: { max_employees: 9999, max_boards: 9999, storage_limit_gb: 100 },
};

/** Alias for COMPANY_TIERS — matches the `plan` field returned by the backend. */
export const COMPANY_PLANS = COMPANY_TIERS;

export const ANNOUNCEMENT_CATEGORIES = {
  INFO: 'info',
  IMPORTANT: 'important',
  EVENT: 'event',
} as const;

export type AnnouncementCategory =
  (typeof ANNOUNCEMENT_CATEGORIES)[keyof typeof ANNOUNCEMENT_CATEGORIES];

export const ANNOUNCEMENT_CATEGORY_LABELS: Record<AnnouncementCategory, string> = {
  [ANNOUNCEMENT_CATEGORIES.INFO]: 'Информация',
  [ANNOUNCEMENT_CATEGORIES.IMPORTANT]: 'Важное',
  [ANNOUNCEMENT_CATEGORIES.EVENT]: 'Мероприятие',
};

export const CALENDAR_EVENT_TYPES = {
  BOOKING: 'booking',
  TASK_DEADLINE: 'task_deadline',
  LEAVE: 'leave',
  GUEST_VISIT: 'guest_visit',
} as const;

export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[keyof typeof CALENDAR_EVENT_TYPES];

export const CALENDAR_EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  [CALENDAR_EVENT_TYPES.BOOKING]: 'Бронирование',
  [CALENDAR_EVENT_TYPES.TASK_DEADLINE]: 'Дедлайн CRM',
  [CALENDAR_EVENT_TYPES.LEAVE]: 'Отпуск/отсутствие',
  [CALENDAR_EVENT_TYPES.GUEST_VISIT]: 'Гостевой визит',
};

export const CALENDAR_VIEWS = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
} as const;

export type CalendarView = (typeof CALENDAR_VIEWS)[keyof typeof CALENDAR_VIEWS];
