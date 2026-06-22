import {
  Bell,
  Calendar,
  X,
  Clock,
  Tag,
  AlertTriangle,
  Check,
  Megaphone,
  UserCheck,
  Sparkles,
  Mail,
  type LucideIcon,
} from 'lucide-react';

interface NotifTypeConfig {
  Icon: LucideIcon;
  color: string;
}

export const NOTIF_TYPE_CONFIG: Record<string, NotifTypeConfig> = {
  booking_confirmed:        { Icon: Calendar,      color: 'var(--brand)' },
  booking_cancelled:        { Icon: X,             color: 'var(--danger)' },
  booking_reminder:         { Icon: Clock,         color: 'var(--info)' },
  booking_completed:        { Icon: Check,         color: 'var(--success)' },
  task_assigned:            { Icon: Tag,           color: 'var(--brand)' },
  task_deadline:            { Icon: AlertTriangle, color: 'var(--danger)' },
  task_deadline_overdue:    { Icon: AlertTriangle, color: 'var(--danger)' },
  task_completed:           { Icon: Check,         color: 'var(--success)' },
  task_moved:               { Icon: Tag,           color: 'var(--brand)' },
  task_comment:             { Icon: Tag,           color: 'var(--brand)' },
  announcement_bc:          { Icon: Megaphone,     color: 'var(--brand)' },
  announcement_building:    { Icon: Megaphone,     color: 'var(--brand)' },
  announcement_co:          { Icon: Megaphone,     color: 'var(--brand)' },
  announcement_company:     { Icon: Megaphone,     color: 'var(--brand)' },
  announcement:             { Icon: Megaphone,     color: 'var(--brand)' },
  guest_arrived:            { Icon: UserCheck,     color: 'var(--success)' },
  guest_validated:          { Icon: UserCheck,     color: 'var(--success)' },
  guest_pass_expiring:      { Icon: Clock,         color: 'var(--warning)' },
  service_updated:          { Icon: Sparkles,      color: 'var(--warning)' },
  service_request_update:   { Icon: Sparkles,      color: 'var(--warning)' },
  leave_approved:           { Icon: Check,         color: 'var(--success)' },
  leave_rejected:           { Icon: X,             color: 'var(--danger)' },
  leave_review:             { Icon: Clock,         color: 'var(--warning)' },
  invitation:               { Icon: Mail,          color: 'var(--brand)' },
  system:                   { Icon: Bell,          color: 'var(--text-muted)' },
};

const FALLBACK_CONFIG: NotifTypeConfig = { Icon: Bell, color: 'var(--text-muted)' };

function getConfig(type: string): NotifTypeConfig {
  return NOTIF_TYPE_CONFIG[type] ?? FALLBACK_CONFIG;
}

interface NotifIconProps {
  type: string;
  size?: number;
}

export function NotifIcon({ type, size = 16 }: NotifIconProps) {
  const cfg = getConfig(type);
  const { Icon } = cfg;
  const boxSize = size + 12;

  return (
    <div
      style={{
        width: boxSize,
        height: boxSize,
        borderRadius: 10,
        flexShrink: 0,
        background: cfg.color + '18',
        border: `1px solid ${cfg.color}28`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      aria-hidden="true"
    >
      <Icon size={size} style={{ color: cfg.color }} />
    </div>
  );
}
