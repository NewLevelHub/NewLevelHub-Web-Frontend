import type {
  UserRole,
  ResourceType,
  ResourceEquipmentKey,
  ParkingType,
  BookingStatus,
  BookingResourceCatalogStatus,
  TaskPriority,
  PassStatus,
  ServiceRequestType,
  ServiceRequestStatus,
  LeaveType,
  LeaveStatus,
  CompanyTier,
  AnnouncementCategory,
  CalendarEventType,
} from '@/shared/config/constants';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  company_id: number | null;
  company_name: string | null;
  /** Nested company object returned by /api/v1/auth/me/ */
  company: { id: number; name: string; onboarding_completed?: boolean; logo?: string | null; plan?: string | null } | null;
  avatar: string | null;
  /** Синхронно с бэкендом `is_email_verified` */
  is_email_verified: boolean;
  position: string | null;
  date_joined?: string;
  last_login?: string | null;
}

export interface CompanyAdmin {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar: string | null;
  position: string;
}

export interface Company {
  id: number;
  name: string;
  description: string | null;
  logo: string | null;
  floor_id: number | null;
  floor_number: number | null;
  floor_name: string | null;
  office_number: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  company_admin: CompanyAdmin | null;
  categories: string[];
  plan: CompanyTier;
  max_employees: number;
  max_boards: number;
  storage_limit_gb: number;
  is_active: boolean;
  employee_count: number;
  working_hours_start: string | null;
  working_hours_end: string | null;
  created_at: string;
  updated_at: string;
  domain?: string | null;
}

export interface CompanyDetail extends Company {
  storage_used: number;
}

/** GET /analytics/superadmin/ — обзорные метрики (суперадмин). */
export type SuperadminAnalyticsPeriod = '7d' | '30d' | '90d' | 'custom';

export interface SuperadminAnalyticsOverview {
  total_companies: number;
  active_companies: number;
  total_users: number;
  active_users_7d: number;
  bookings_today: number;
  guests_today: number;
  open_service_requests: number;
}

export interface SuperadminAnalyticsResponse {
  period: SuperadminAnalyticsPeriod;
  date_from: string;
  date_to: string;
  overview: SuperadminAnalyticsOverview;
  resource_utilization: Array<{
    date: string;
    desk_bookings: number;
    room_bookings: number;
    parking_bookings: number;
    capsule_bookings: number;
  }>;
  peak_hours: Array<{
    day_of_week: number;
    hour: number;
    booking_count: number;
  }>;
  new_registrations: Array<{
    week: string;
    count: number;
  }>;
  service_requests_by_type: Array<{
    type: string;
    count: number;
  }>;
  top_resources: Array<{
    resource_id: number;
    name: string;
    resource_type: string;
    booking_count: number;
  }>;
  top_companies: Array<{
    company_id: number;
    company_name: string;
    booking_count: number;
  }>;
  low_utilization: Array<{
    resource_id: number;
    name: string;
    resource_type: string;
    booking_count: number;
    utilization_percent: number;
  }>;
}

/** GET /analytics/resources/ — загруженность в разрезе конкретных ресурсов. */
export interface ResourceUsageRow {
  resource_id: number;
  resource_name: string;
  resource_type: string;
  floor: number;
  total_bookings: number;
  avg_duration_minutes: number;
  total_booked_minutes: number;
  peak_hour: number | null;
  peak_hour_bookings: number;
}

export interface ResourceUsageResponse {
  period: SuperadminAnalyticsPeriod;
  date_from: string;
  date_to: string;
  results: ResourceUsageRow[];
}

export interface CompanyLimits {
  employees: {
    current: number;
    max: number;
  };
  boards: {
    current: number;
    max: number;
  };
  storage: {
    used_gb: number;
    used_bytes: number;
    limit_gb: number;
  };
}

/** GET /companies/:id/members/ — см. CompanyMemberSerializer (бэкенд). */
export interface CompanyMember {
  id: number;
  email: string;
  full_name: string;
  role: string;
  position: string | null;
  avatar: string | null;
  is_active: boolean;
  is_email_verified: boolean;
  date_joined: string;
  last_login: string | null;
}

export interface MemberActivity {
  last_login: string | null;
  active_tasks_count: number;
  completed_tasks_count: number;
  bookings_last_30_days: number;
}

export interface CompanyAnalyticsEmployeeActivity {
  user_id: number;
  full_name: string;
  booking_count_30d: number;
  task_count_active: number;
  last_login: string | null;
}

export interface CompanyAnalytics {
  total_employees: number;
  active_7d: number;
  bookings_month: number;
  storage: {
    used: number;
    limit: number;
  };
  active_crm_tasks: {
    total: number;
    todo: number;
    in_progress: number;
    done: number;
    other: number;
    by_column: Array<{
      column_id: number;
      name: string;
      board_name: string;
      count: number;
    }>;
  };
  guest_visits_month: number;
  employee_activity: CompanyAnalyticsEmployeeActivity[];
}

export interface CompanyDirectoryMember {
  id: number;
  avatar: string | null;
  full_name: string;
  position: string | null;
  email: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  last_login: string | null;
}

export interface CompanyDirectoryMemberProfile extends CompanyDirectoryMember {
  tasks_count: number;
  bookings_last_30_days: number;
}

export interface CompanySettings {
  custom_task_categories: string[];
  custom_labels: Array<{ name: string; color: string }>;
  vacation_days_per_year: number;
  onboarding_enabled: boolean;
  brand_primary_color: string | null;
  working_hours: {
    start: string | null;
    end: string | null;
  };
}

export interface MemberActionResponse {
  detail: string;
  tasks_reassigned?: number;
}

export interface CompanyInvitation {
  id: number;
  email: string;
  role: string;
  token: string;
  invited_by_name: string;
  is_used: boolean;
  is_expired: boolean;
  is_valid: boolean;
  expires_at: string;
  created_at: string;
}

export interface InviteRegistrationPreview {
  company_name: string;
  email: string;
  role: string;
  is_guest_upgrade?: boolean;
}

export type ResourceEquipment = Record<ResourceEquipmentKey, boolean>;

export interface ResourcePhoto {
  id: number;
  image: string;
  image_url: string | null;
  created_at: string;
}

/** Элемент каталога: GET /bookings/resources/ (пагинация). */
export interface BookingResourceListItem {
  id: number;
  type: ResourceType;
  name: string;
  floor?: number;
  floor_id?: number | null;
  floor_number?: number | null;
  floor_name?: string | null;
  zone: string;
  photo: string | null;
  photo_url: string | null;
  photos: ResourcePhoto[];
  capacity: number;
  equipment: ResourceEquipment | null;
  is_active: boolean;
  is_hot_desk: boolean;
  availability_days?: number[];
  parking_type: ParkingType | null;
  capsule_zone: string;
  assigned_company: number | null;
  assigned_company_name: string | null;
  status: BookingResourceCatalogStatus;
  reason: string | null;
  /** Конец текущей занятости; только при status === soon_available */
  available_at: string | null;
}

export interface ResourceBlock {
  id: number;
  resource: number;
  blocked_by: number | null;
  start_time: string;
  end_time: string;
  reason: string;
  created_at: string;
  updated_at: string;
}

/** Занятый интервал: GET …/resources/:id/ (поле schedule) и GET …/schedule/?date|week */
export interface ResourceScheduleSlot {
  start: string;
  end: string;
  booking_id: number | null;
  user_name: string | null;
  status?: 'occupied' | 'soon_available' | 'blocked';
}

/** Полная карточка: GET/PATCH /bookings/resources/:id/ */
export interface BookingResourceDetail {
  id: number;
  type: ResourceType;
  name: string;
  floor?: number;
  floor_id?: number | null;
  floor_number?: number | null;
  floor_name?: string | null;
  zone: string;
  description: string;
  photo: string | null;
  photos: ResourcePhoto[];
  capacity: number;
  equipment: ResourceEquipment | null;
  is_active: boolean;
  has_monitor: boolean;
  has_dock: boolean;
  has_power_outlet: boolean;
  is_hot_desk: boolean;
  assigned_company: number | null;
  assigned_company_name?: string | null;
  min_duration_minutes: number;
  max_duration_minutes: number;
  advance_booking_days: number;
  min_cancel_minutes: number;
  /** HH:MM:SS — рабочее окно ресурса (сериализатор бэкенда) */
  availability_start?: string;
  availability_end?: string;
  availability_days?: number[];
  parking_type: ParkingType | null;
  capsule_zone: string;
  created_at: string;
  updated_at: string;
  /** Текущий статус доступности ресурса */
  status?: BookingResourceCatalogStatus;
  /** Конец текущей занятости; только при status === soon_available */
  available_at?: string | null;
  /** Занятость на 7 календарных дней (только GET retrieve) */
  schedule?: ResourceScheduleSlot[];
}

/** @deprecated Используйте BookingResourceListItem / BookingResourceDetail */
export interface Resource {
  id: number;
  name: string;
  type: ResourceType;
  floor?: number;
  floor_id?: number | null;
  floor_number?: number | null;
  floor_name?: string | null;
  zone: string;
  description: string;
  photo: string | null;
  capacity: number | null;
  equipment: {
    projector?: boolean;
    tv?: boolean;
    whiteboard?: boolean;
    video_conf?: boolean;
    monitor?: boolean;
    dock?: boolean;
    power_outlet?: boolean;
  } | null;
  is_active: boolean;
  availability_start: string;
  availability_end: string;
  availability_days: number[];
}

export interface BookedBy {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar: string | null;
  position: string | null;
  role: string;
}

/** Бронирование: сериализатор бэкенда (resource — id, participants — email-строки). */
export interface Booking {
  id: number;
  resource: number;
  resource_name: string;
  resource_type: ResourceType;
  user: number;
  user_name: string;
  booked_by?: BookedBy | null;
  company: number | null;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  description: string;
  cancelled_by: number | null;
  cancel_reason: string;
  checked_in_at: string | null;
  participants: { id: number; email: string; full_name: string }[];
  recurring_booking_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface RecurringBooking {
  id: number;
  resource: number;
  resource_id: number;
  user: number;
  user_name?: string;
  user_role?: UserRole;
  company: number | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecurringBookingCreatePayload {
  resource_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  repeat_until: string;
}

export interface RecurringBookingCreateResponse extends RecurringBooking {
  skipped_dates: string[];
}

export interface CancellationAuditEntry {
  id: number;
  booking_id: number;
  cancelled_by: { id: number; full_name: string } | null;
  cancel_reason: string;
  cancelled_at: string;
}

export interface Board {
  id: number;
  name: string;
  company_id: number;
  columns: Column[];
  is_archived: boolean;
  created_at: string;
}

export interface Column {
  id: number;
  name: string;
  position: number;
  wip_limit: number | null;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  board_id: number;
  column_id: number;
  assignee: User | null;
  priority: TaskPriority;
  deadline: string | null;
  labels: string[];
  position: number;
  checklist: ChecklistItem[];
  created_at: string;
}

export interface ChecklistItem {
  id: number;
  text: string;
  is_done: boolean;
}

export interface GuestPass {
  id: number;
  created_by: number;
  created_by_name: string;
  created_by_email?: string;
  created_by_company_name?: string | null;
  company: number | null;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  purpose: string;
  valid_from: string;
  valid_until: string;
  qr_code: string;
  qr_image: string;
  usage_type: 'single' | 'multi';
  is_single_use: boolean;
  times_used: number;
  status: PassStatus;
  created_at: string;
  last_validated_at?: string | null;
  last_validated_by?: string | null;
  last_method?: string | null;
}

export interface PassValidationSuccess {
  valid: true;
  guest_name: string;
  purpose: string;
  invited_by: string;
  valid_from: string;
  valid_until: string;
}

export interface PassValidationLog {
  id: number;
  validated_at: string;
  validated_by: string | null;
  method: 'qr' | 'manual' | string;
  entry_point: string;
}

export interface PassValidationsResponse {
  total: number;
  results: PassValidationLog[];
}

export interface PassValidationFailure {
  valid: false;
  reason: 'expired' | 'revoked' | 'already_used' | 'not_found';
}

export interface PassValidationNotYetActive {
  valid: false;
  reason: 'not_yet_active';
  available_from: string;
}

export type PassValidationResponse = PassValidationSuccess | PassValidationFailure | PassValidationNotYetActive;

export interface AccessLogEntry {
  id: number;
  guest_pass: number | null;
  invited_by: string | null;
  validated_at: string;
  validated_by: string | null;
  checked_by: number | null;
  user: number | null;
  entry_point: string;
  method: string;
  is_entry: boolean;
  created_at: string;
}

export interface ServiceRequest {
  id: number;
  user: number;
  user_name: string;
  request_type: ServiceRequestType;
  floor: number | null;
  floor_number?: number | null;
  floor_name?: string | null;
  location: string;
  description: string;
  urgency: 'normal' | 'urgent';
  photo: string | null;
  status: ServiceRequestStatus;
  rating: number | null;
  assigned_to: number | null;
  assigned_to_name: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceRequestCreatePayload {
  request_type: ServiceRequestType;
  description: string;
  floor?: number | null;
  location?: string;
  urgency?: 'normal' | 'urgent';
}

export interface ServiceRequestCleaningPayload {
  description?: string;
  floor?: number | null;
}

export interface ServiceRequestUpdateStatusPayload {
  status: ServiceRequestStatus;
}

export interface ServiceRequestRatePayload {
  rating: number;
}

export interface ServiceRequestAssignPayload {
  assigned_to: number | null;
}

export interface Announcement {
  id: number;
  title: string;
  /** Backend AC vocabulary (DEV-100). Maps to model field ``body``. */
  text: string;
  category: AnnouncementCategory;
  image: string | null;
  is_pinned: boolean;
  /** ``null`` means a building-wide (БЦ) announcement. */
  company_id: number | null;
  author: number | null;
  author_name: string;
  /** Whether the current user has read this announcement (DEV-110). */
  is_read: boolean;
  /** Total number of users who have read this announcement (DEV-110). */
  read_count: number;
  notify_email: boolean;
  /** Derived on the backend from ``company_id``. */
  scope: 'building' | 'company';
  created_at: string;
}

export interface LeaveRequest {
  id: number;
  user: number;
  user_name?: string;
  company: number;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  duration_days?: number;
  comment: string;
  status: LeaveStatus;
  assigned_reviewer: number | null;
  assigned_reviewer_name?: string | null;
  reviewed_by: number | null;
  reviewer?: number | null;
  review_comment: string;
  reviewed_at: string | null;
  created_at: string;
}

export interface LeaveBalance {
  year: number;
  total_days: number;
  used_days: number;
  remaining_days: number;
}

export interface TeamLeaveBalance extends LeaveBalance {
  user_id: number;
  user_name: string;
}

export interface CalendarEvent {
  type: CalendarEventType;
  title: string;
  start: string;
  end: string;
  user: {
    id: number;
    full_name: string;
  };
  task_id?: number;
  board_id?: number;
  guest_pass_id?: number;
}

export interface CalendarBusySlot {
  start: string;
  end: string;
  type?: CalendarEventType;
}

export interface FileItem {
  id: number;
  name: string;
  type: 'file' | 'folder';
  size: number | null;
  mime_type: string | null;
  parent_folder_id: number | null;
  is_shared: boolean;
  created_at: string;
}

export interface StorageFolder {
  id: number;
  name: string;
  scope: 'personal' | 'company';
  parent: number | null;
  owner: number;
  children_count: number;
  files_count: number;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
  deleted_at?: string | null;
  is_restricted?: boolean;
  user_permission?: FolderPermissionLevel | null;
}

export type FolderPermissionLevel = 'view' | 'upload' | 'full';

export interface FolderPermission {
  id: number;
  folder: number;
  user: number | null;
  user_name: string | null;
  role: string | null;
  permission: FolderPermissionLevel;
  granted_by: number | null;
  granted_by_name: string | null;
  created_at: string;
}

export interface StorageFile {
  id: number;
  name: string;
  file: string;
  file_size: number;
  content_type: string;
  size?: number;
  mime_type?: string;
  download_url?: string;
  folder: number | null;
  owner: number;
  owner_name: string;
  uploaded_by?: string;
  company: number | null;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
  deleted_at?: string | null;
}

export interface StorageFolderDetail extends StorageFolder {
  folders: StorageFolder[];
  files: StorageFile[];
}

export interface StorageUsageBreakdown {
  document: number;
  image: number;
  archive: number;
  media: number;
  other: number;
}

export interface StorageUsage {
  personal: {
    used_bytes: number;
    file_count: number;
    limit_bytes: number | null;
    trash_bytes: number;
    breakdown: StorageUsageBreakdown;
  };
  company: {
    used_bytes: number;
    limit_bytes: number;
    file_count: number;
    trash_bytes: number;
    breakdown: StorageUsageBreakdown;
  };
}

export type StorageSharePermission = 'view' | 'download' | 'full';

export interface StorageFileShare {
  id: number;
  file: number;
  file_id: number;
  file_name: string;
  file_owner_id: number;
  file_owner_name: string;
  shared_with: number;
  shared_with_user_id: number;
  shared_with_name: string;
  shared_by: number;
  shared_by_name: string;
  permission: StorageSharePermission;
  comment: string;
  created_at: string;
}

export interface TrashItem {
  id: number;
  name: string;
  item_type: 'file' | 'folder';
  deleted_at: string;
  scope: 'personal' | 'company';
  file_size?: number;
  content_type?: string;
  files_count?: number;
  children_count?: number;
}

export interface Notification {
  id: number;
  /** Legacy/alternate name — list API exposes `type` (see DRF `NotificationSerializer`). */
  type?: string;
  notification_type?: string;
  title: string;
  body?: string;
  message?: string;
  url?: string | null;
  link?: string | null;
  is_read: boolean;
  created_at: string;
}

export type NotificationType =
  | 'booking_confirmed'
  | 'booking_reminder'
  | 'booking_cancelled'
  | 'booking_completed'
  | 'task_assigned'
  | 'task_moved'
  | 'task_comment'
  | 'task_deadline'
  | 'guest_validated'
  | 'guest_pass_expiring'
  | 'service_request_update'
  | 'announcement'
  | 'invitation'
  | 'leave_review'
  | 'new_employee'
  | 'system';

export interface NotificationPreferenceEntry {
  in_app: boolean;
  email: boolean;
}

export interface NotificationPreferences {
  dnd_enabled: boolean;
  dnd_until: string | null;
  booking_confirmed: NotificationPreferenceEntry;
  booking_reminder: NotificationPreferenceEntry;
  booking_cancelled: NotificationPreferenceEntry;
  booking_completed: NotificationPreferenceEntry;
  task_assigned: NotificationPreferenceEntry;
  task_moved: NotificationPreferenceEntry;
  task_comment: NotificationPreferenceEntry;
  task_deadline: NotificationPreferenceEntry;
  guest_validated: NotificationPreferenceEntry;
  guest_pass_expiring: NotificationPreferenceEntry;
  service_request_update: NotificationPreferenceEntry;
  announcement: NotificationPreferenceEntry;
  invitation: NotificationPreferenceEntry;
  leave_review: NotificationPreferenceEntry;
  new_employee: NotificationPreferenceEntry;
  system: NotificationPreferenceEntry;
}

export interface FloorPlan {
  id: number;
  floor_number: number;
  name: string;
  image_url: string;
  markers: MapMarker[];
}

export interface MapMarker {
  id: number;
  type: 'resource' | 'office' | 'utility';
  label: string;
  x: number;
  y: number;
  resource_id: number | null;
}

export type MapPointType = 'desk' | 'meeting_room' | 'parking' | 'capsule' | 'office';
export type MapPointStatus = 'free' | 'soon_available' | 'occupied' | 'blocked';
export type MapPointStatusReason =
  | 'active_block'
  | 'active_booking'
  | 'active_booking_ends_within_threshold'
  | 'no_active_booking_or_block'
  | 'not_a_bookable_resource';

export interface MapPoint {
  id: number;
  point_type: MapPointType;
  label: string;
  x: number;
  y: number;
  width: number | null;   // % от ширины canvas, null → дефолт 12
  height: number | null;  // % от высоты canvas, null → дефолт 8
  resource_id: number | null;
  resource_name: string | null;
  resource_status: MapPointStatus | null;
  resource_status_reason: MapPointStatusReason;
  next_free_at: string | null;
}

export interface FloorMap {
  floor_id: number;
  floor_name: string;
  at_time: string;
  points: MapPoint[];
}

export interface ServiceFloor {
  id: number;
  name: string;
  number: number;
  plan_image: string | null;
  plan_image_url: string | null;
  occupancy_pct?: number;
  created_at: string;
  updated_at: string;
}

/** POST /services/floors/ (JSON). `plan_image` передаётся только через multipart. */
export interface ServiceFloorCreatePayload {
  number: number;
  name?: string;
}

/** PATCH /services/floors/{id}/ */
export interface ServiceFloorUpdatePayload {
  number?: number;
  name?: string;
}

export interface MapPointSearchResult {
  id: number;
  label: string;
  point_type: MapPointType;
  x: number;
  y: number;
  floor_id: number;
  floor_name: string;
  resource_id: number | null;
  resource_name: string | null;
}

export interface MapPointCreatePayload {
  floor: number;
  point_type: MapPointType;
  label: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  resource?: number | null;
  company?: number | null;
}

export type MapPointUpdatePayload = Partial<MapPointCreatePayload>;

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
  /**
   * Только GET /bookings/resources/: ключи оборудования, которые есть хотя бы у одной
   * переговорки в выборке с теми же фильтрами, но без фильтра по equipment.
   */
  meeting_room_equipment_keys?: ResourceEquipmentKey[];
}

/**
 * Cursor-based paginated response (used by the announcements feed for infinite
 * scroll). Differs from {@link PaginatedResponse} in that it has no ``count``:
 * cursor pagination treats the dataset as a stream.
 */
export interface CursorPaginatedResponse<T> {
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface UserListItem {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  position: string | null;
  avatar: string | null;
  role: string;
  company: { id: number; name: string } | null;
  is_email_verified: boolean;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
}

export interface UserDetail extends UserListItem {
  bookings_count: number;
  tasks_count: number;
}

export interface OnboardingStep {
  id: number;
  title: string;
  is_completed: boolean;
  is_system?: boolean;
  completed_at?: string | null;
  url?: string | null;
}

export interface OnboardingStatus {
  completed: boolean;
  steps: OnboardingStep[];
}

export interface OnboardingTemplateStepInput {
  title: string;
  description: string;
  order: number;
  url?: string | null;
}

export interface OnboardingTemplateStep {
  id: number;
  title: string;
  description: string;
  url?: string | null;
  order: number;
  is_system: boolean;
}

export interface OnboardingTemplate {
  id: number;
  name: string;
  is_active: boolean;
  is_default: boolean;
  steps: OnboardingTemplateStep[];
  created_at: string;
}

export interface TeamMemberProgress {
  user: number;
  first_name: string;
  last_name: string;
  avatar: string | null;
  role: string;
  completed_steps: number;
  total_steps: number;
}

export interface TeamMemberProgressStep {
  id: number;
  title: string;
  is_system: boolean;
  is_completed: boolean;
  completed_at: string | null;
}

export interface TeamMemberProgressDetail {
  user: {
    id: number;
    first_name: string;
    last_name: string;
    avatar: string | null;
  };
  completed_steps: number;
  total_steps: number;
  steps: TeamMemberProgressStep[];
}

export interface CrmAttachmentUploader {
  id: number;
  full_name: string;
  avatar: string | null;
}

export interface CrmAttachment {
  id: number;
  filename: string;
  size: number;
  mime_type: string;
  url: string;
  uploaded_by: CrmAttachmentUploader;
  created_at: string;
}

export interface CrmBoard {
  id: number;
  name: string;
  description: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  company: number;
}

export interface CrmColumn {
  id: number;
  name: string;
  order: number;
  board: number;
  wip_limit: number | null;
}

export interface CrmChecklistItem {
  id: number;
  text: string;
  is_completed: boolean;
  order: number;
}

export interface CrmChecklistProgress {
  total: number;
  completed: number;
}

export interface CrmChecklist {
  id: number;
  title: string;
  items: CrmChecklistItem[];
  checklist_progress: CrmChecklistProgress;
}

export interface CrmCommentAuthor {
  id: number;
  full_name: string;
  avatar: string | null;
}

export interface CrmComment {
  id: number;
  text: string;
  author: CrmCommentAuthor;
  created_at: string;
}

export interface CrmHistoryUser {
  id: number;
  full_name: string;
  avatar: string | null;
}

export interface CrmTaskHistory {
  id: number;
  user: CrmHistoryUser;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface CrmLabel {
  id: number;
  name: string;
  color: string; // hex, e.g. "#ef4444"
}

export interface CrmTask {
  id: number;
  board: CrmBoard;
  column_id: number;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  deadline: string | null; // ISO date
  assignee: { id: number; first_name: string; last_name: string; avatar?: string } | null;
  label_ids: number[];
  labels: CrmLabel[];
  comments_count: number;
  attachments_count: number;
  position: number;
  is_archived: boolean;
  created_at: string;
  checklists: CrmChecklist[];
}

export interface MyTaskGroup {
  board_id: number;
  board_name: string;
  tasks: CrmTask[];
  total: number;
  has_more: boolean;
}

export interface MyTasksGroupedResponse {
  groups: MyTaskGroup[];
}

// ── Dashboard pending-approval sub-types ─────────────────────────────────

export interface PendingLeave {
  id: number;
  employee: { id: number; full_name: string; avatar: string | null };
  leave_type: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface PendingGuestPass {
  id: number;
  guest_name: string;
  guest_email: string;
  host: { id: number; full_name: string; avatar: string | null };
  visit_date: string;
  valid_from: string;
  valid_until: string;
  created_at: string;
}

// ── Dashboard API (GET /api/v1/dashboard/) ────────────────────────────────

export interface DashboardUserInfo {
  id: number;
  full_name: string;
  avatar: string | null;
}

export interface DashboardAnnouncementItem {
  id: number;
  title: string;
  body: string;
  category: AnnouncementCategory;
  scope: string;
  created_at: string;
}

export interface DashboardRecentEvent {
  event_type: string;
  id: number;
  title: string;
  start_time: string;
  status: string;
}

export interface DashboardBookingItem {
  id: number;
  resource_name: string;
  user_name: string;
  company_name: string | null;
  start_time: string;
  end_time: string;
  status: string;
}

export interface DashboardAnnouncementRecentItem {
  id: number;
  title: string;
  text: string;
  created_at: string;
}

export interface FloorLoadItem {
  floor_id: number;
  floor_number: number;
  floor_name: string;
  total: number;
  occupied: number;
  occupancy_pct: number;
}

export interface TeamBookingItem {
  user_full_name: string;
  user_initials: string;
  resource_name: string;
  start_time: string;
  end_time: string;
  status: string;
}

export interface DashboardTaskItem {
  id: number;
  title: string;
  board_name: string;
  due_date: string | null;
  priority: string;
  is_overdue: boolean;
}

export interface EmployeeUpcomingBooking {
  id: number;
  resource_name: string;
  resource_type: string;
  resource_capacity: number | null;
  resource_row: null;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  status: string;
}

export interface SuperadminDashboardData {
  role: 'superadmin';
  user: DashboardUserInfo;
  total_companies: number;
  total_users: number;
  bookings_today: number;
  recent_events: DashboardRecentEvent[];
  quick_actions: string[];
  bookings_recent: DashboardBookingItem[];
  announcements_recent: DashboardAnnouncementRecentItem[];
  bookings_week_delta: number;
  space_load_pct: number;
  open_service_requests: number;
  service_requests_closed_today: number;
  new_companies_last_7d: number;
  floor_load: FloorLoadItem[];
}

export interface CompanyAdminDashboardData {
  role: 'company_admin';
  user: DashboardUserInfo;
  employee_count: number;
  active_tasks: number;
  bookings_today: number;
  announcement_feed: DashboardAnnouncementItem[];
  pending_approvals?: { leaves: PendingLeave[]; guest_passes: PendingGuestPass[] };
  free_resources_now: number;
  team_bookings_today: TeamBookingItem[];
  my_tasks: DashboardTaskItem[];
}

export interface EmployeeDashboardData {
  role: 'employee';
  user: DashboardUserInfo;
  my_tasks_today: number;
  my_bookings_today: number;
  announcement_feed: DashboardAnnouncementItem[];
  unread_notifications_count: number;
  my_upcoming_bookings: EmployeeUpcomingBooking[];
  my_tasks: DashboardTaskItem[];
}

export interface GuestDashboardData {
  role: 'guest';
  user: DashboardUserInfo;
  my_bookings_today: number;
  quick_booking: { available_desks: number; available_rooms: number };
  bc_announcements: DashboardAnnouncementItem[];
}

export type DashboardData =
  | SuperadminDashboardData
  | CompanyAdminDashboardData
  | EmployeeDashboardData
  | GuestDashboardData;

// ── Profile activity ──────────────────────────────────────────────────

export interface BookingActivity {
  id: number;
  resource_name: string;
  start_time: string;
  end_time: string;
  status: string;
}

export interface TaskActivity {
  id: number;
  title: string;
  priority: string;
  deadline: string | null;
  board_name: string;
  board_id: number;
}

export interface PassActivity {
  id: number;
  guest_name: string;
  status: string;
  valid_from: string;
  valid_until: string;
}

export interface UserActivityResponse {
  bookings: BookingActivity[];
  tasks: TaskActivity[];
  passes: PassActivity[];
}
