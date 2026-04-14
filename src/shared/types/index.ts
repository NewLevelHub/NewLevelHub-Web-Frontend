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
  storage_limit_gb: number;
  is_active: boolean;
  created_at: string;
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
    limit_gb: number;
  };
}

/** GET /companies/:id/members/ — см. CompanyMemberSerializer (бэкенд). */
export interface CompanyMember {
  id: number;
  email: string;
  full_name: string;
  role: string;
  position: string;
  avatar: string | null;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
}

export interface MemberActivity {
  last_login: string | null;
  tasks_active: number;
  tasks_completed: number;
  bookings_last_30_days: number;
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
  parking_type: ParkingType | null;
  capsule_zone: string;
  status: BookingResourceCatalogStatus;
  /** Конец текущей занятости; только при status === soon_available */
  available_at: string | null;
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
  user: number;
  user_name: string;
  company: number | null;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  description: string;
  cancelled_by: number | null;
  cancel_reason: string;
  participants: string[];
  created_at: string;
  updated_at: string;
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
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  purpose: string;
  valid_from: string;
  valid_until: string;
  qr_code: string;
  max_uses: number;
  times_used: number;
  status: PassStatus;
  created_by: User;
  created_at: string;
}

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
  type: ServiceRequestType;
  floor: number;
  location: string;
  description: string;
  urgency: 'normal' | 'urgent';
  photo: string | null;
  status: ServiceRequestStatus;
  rating: number | null;
  created_by: User;
  assigned_to: User | null;
  created_at: string;
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
  type: LeaveType;
  start_date: string;
  end_date: string;
  comment: string | null;
  status: LeaveStatus;
  reviewer_comment: string | null;
  user: User;
  created_at: string;
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

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
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

export interface CompanySettings {
  custom_task_categories: string[];
  custom_labels: { name: string; color: string }[];
  vacation_days_per_year: number;
  onboarding_enabled: boolean;
  working_hours: { start: string; end: string } | null;
  brand_primary_color: string | null;
}

export interface OnboardingStep {
  key: 'upload_logo' | 'fill_description' | 'create_first_board' | 'invite_first_employee';
  title: string;
  completed: boolean;
}

export interface OnboardingStatus {
  completed: boolean;
  steps: OnboardingStep[];
}
