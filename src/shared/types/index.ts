import type {
  UserRole,
  ResourceType,
  BookingStatus,
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
  company: { id: number; name: string } | null;
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
  description: string;
  logo: string | null;
  floor: string;
  office_number: string;
  tier: CompanyTier;
  max_employees: number;
  storage_quota_gb: number;
  is_active: boolean;
  created_at: string;
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

export interface Resource {
  id: number;
  name: string;
  type: ResourceType;
  floor: number;
  description: string;
  photo: string | null;
  capacity: number | null;
  equipment: string[];
  is_active: boolean;
  schedule: string | null;
}

export interface Booking {
  id: number;
  resource: Resource;
  user: User;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  description: string | null;
  participants: User[];
  created_at: string;
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
}
