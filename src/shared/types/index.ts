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
  company: { id: number; name: string; onboarding_completed?: boolean } | null;
  avatar: string | null;
  /** Синхронно с бэкендом `is_email_verified` */
  is_email_verified: boolean;
  position: string | null;
  date_joined?: string;
  last_login?: string | null;
}

export interface Company {
  id: number;
  name: string;
  description: string | null;
  logo: string | null;
  floor: number | null;
  office_number: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  plan: CompanyTier;
  max_employees: number;
  max_boards: number;
  storage_limit_gb: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyDetail extends Company {
  employee_count: number;
  storage_used: number;
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
  date_joined: string;
  last_login: string | null;
}

export interface MemberActivity {
  last_login: string | null;
  active_tasks_count: number;
  completed_tasks_count: number;
  bookings_last_30_days: number;
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
}

export type ResourceEquipment = Record<ResourceEquipmentKey, boolean>;

/** Элемент каталога: GET /bookings/resources/ (пагинация). */
export interface BookingResourceListItem {
  id: number;
  type: ResourceType;
  name: string;
  floor: number;
  zone: string;
  photo: string | null;
  photo_url: string | null;
  capacity: number;
  equipment: ResourceEquipment | null;
  is_active: boolean;
  is_hot_desk: boolean;
  availability_days?: number[];
  parking_type: ParkingType | null;
  capsule_zone: string;
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
}

/** Полная карточка: GET/PATCH /bookings/resources/:id/ */
export interface BookingResourceDetail {
  id: number;
  type: ResourceType;
  name: string;
  floor: number;
  zone: string;
  description: string;
  photo: string | null;
  capacity: number;
  equipment: ResourceEquipment | null;
  is_active: boolean;
  has_monitor: boolean;
  has_dock: boolean;
  has_power_outlet: boolean;
  is_hot_desk: boolean;
  assigned_company: number | null;
  min_duration_minutes: number;
  max_duration_minutes: number;
  /** HH:MM:SS — рабочее окно ресурса (сериализатор бэкенда) */
  availability_start?: string;
  availability_end?: string;
  availability_days?: number[];
  parking_type: ParkingType | null;
  capsule_zone: string;
  created_at: string;
  updated_at: string;
  /** Занятость на 7 календарных дней (только GET retrieve) */
  schedule?: ResourceScheduleSlot[];
}

/** @deprecated Используйте BookingResourceListItem / BookingResourceDetail */
export interface Resource {
  id: number;
  name: string;
  type: ResourceType;
  floor: number;
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

/** Бронирование: сериализатор бэкенда (resource — id, participants — email-строки). */
export interface Booking {
  id: number;
  resource: number;
  resource_name: string;
  resource_type: ResourceType;
  user: number;
  user_name: string;
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
}

export interface PassValidationSuccess {
  valid: true;
  guest_name: string;
  purpose: string;
  invited_by: string;
  valid_from: string;
  valid_until: string;
}

export interface PassValidationFailure {
  valid: false;
  reason: 'expired' | 'revoked' | 'already_used' | 'not_found';
}

export type PassValidationResponse = PassValidationSuccess | PassValidationFailure;

export interface AccessLogEntry {
  id: number;
  person_name: string;
  company: string | null;
  entry_type: 'guest' | 'employee';
  method: string;
  timestamp: string;
}

export interface ServiceRequest {
  id: number;
  user: number;
  user_name: string;
  request_type: ServiceRequestType;
  floor: number | null;
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

export interface Announcement {
  id: number;
  title: string;
  content: string;
  category: AnnouncementCategory;
  image: string | null;
  is_pinned: boolean;
  company_id: number | null;
  created_by: User;
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
  children_count: number;
  files_count: number;
  created_at: string;
  updated_at: string;
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
}

export interface StorageFolderDetail extends StorageFolder {
  folders: StorageFolder[];
  files: StorageFile[];
}

export interface StorageUsage {
  personal: {
    used_bytes: number;
    file_count: number;
  };
  company: {
    used_bytes: number;
    limit_bytes: number;
    file_count: number;
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
  created_at: string;
}

export interface Notification {
  id: number;
  notification_type: string;
  /** @deprecated backend now sends `type` */
  type?: string;
  title: string;
  body: string;
  /** @deprecated backend now sends `message` */
  message?: string;
  url: string | null;
  /** @deprecated backend now sends `link` */
  link?: string | null;
  is_read: boolean;
  created_at: string;
}

export type NotificationType =
  | 'booking_confirmed'
  | 'booking_reminder'
  | 'booking_cancelled'
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
}

export interface OnboardingStatus {
  completed: boolean;
  steps: OnboardingStep[];
}

export interface OnboardingTemplateStepInput {
  title: string;
  description: string;
  order: number;
}

export interface OnboardingTemplate {
  id: number;
  name: string;
  is_active: boolean;
  steps: Array<OnboardingTemplateStepInput & { id: number }>;
  created_at: string;
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
  created_at: string;
  checklists: CrmChecklist[];
}
