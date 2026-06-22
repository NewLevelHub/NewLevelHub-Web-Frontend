// ─── Shared badge components for service requests ────────────────────────────

import { AlertTriangle, FileText, Package, Sparkles, Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { ServiceRequestStatus, ServiceRequestType } from '@/shared/config/constants';

// ─── TypeBadge ───────────────────────────────────────────────────────────────

type TypeCfg = { label: string; color: string; bg: string; Icon: React.ElementType };

export function TypeBadge({ type }: { type: ServiceRequestType }) {
  const { t } = useTranslation();

  const TYPE_CONFIG: Record<ServiceRequestType, TypeCfg> = {
    cleaning: { label: t('common.serviceRequestType.cleaning'), color: 'var(--info)',           bg: 'rgba(3,105,161,0.1)',  Icon: Sparkles },
    repair:   { label: t('common.serviceRequestType.repair'),   color: 'var(--danger)',         bg: 'rgba(185,28,28,0.1)',  Icon: Wrench   },
    supplies: { label: t('common.serviceRequestType.supplies'), color: 'var(--warning)',        bg: 'rgba(180,83,9,0.1)',   Icon: Package  },
    general:  { label: t('common.serviceRequestType.general'),  color: 'var(--text-secondary)', bg: 'var(--bg-raised)',     Icon: FileText },
  };

  const cfg: TypeCfg = TYPE_CONFIG[type] ?? {
    label: type,
    color: 'var(--text-muted)',
    bg: 'var(--bg-raised)',
    Icon: FileText,
  };
  const { Icon } = cfg;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 6,
        background: cfg.bg,
        color: cfg.color,
        whiteSpace: 'nowrap',
      }}
    >
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: ServiceRequestStatus }) {
  const { t } = useTranslation();

  const STATUS_CONFIG: Record<ServiceRequestStatus, { label: string; color: string; bg: string }> = {
    new:         { label: t('common.serviceRequestStatus.new'),         color: 'var(--warning)',   bg: 'rgba(180,83,9,0.1)'  },
    accepted:    { label: t('common.serviceRequestStatus.accepted'),    color: 'var(--info)',       bg: 'rgba(3,105,161,0.1)' },
    in_progress: { label: t('common.serviceRequestStatus.in_progress'), color: 'var(--brand)',      bg: 'var(--brand-subtle)' },
    completed:   { label: t('common.serviceRequestStatus.completed'),   color: 'var(--text-muted)', bg: 'var(--bg-raised)'    },
  };

  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    color: 'var(--text-muted)',
    bg: 'var(--bg-raised)',
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 20,
        background: cfg.bg,
        color: cfg.color,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: cfg.color,
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </span>
  );
}

// ─── UrgBadge ────────────────────────────────────────────────────────────────

export function UrgBadge({ urgency }: { urgency: 'normal' | 'urgent' }) {
  const { t } = useTranslation();

  if (urgency === 'urgent') {
    return (
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          padding: '2px 7px',
          borderRadius: 4,
          background: 'rgba(185,28,28,0.1)',
          color: 'var(--danger)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          whiteSpace: 'nowrap',
        }}
      >
        <AlertTriangle size={9} />
        {t('serviceRequests.urgencyUrgent')}
      </span>
    );
  }

  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 500,
        padding: '2px 7px',
        borderRadius: 4,
        background: 'var(--bg-raised)',
        color: 'var(--text-secondary)',
        display: 'inline-flex',
        alignItems: 'center',
        whiteSpace: 'nowrap',
      }}
    >
      {t('serviceRequests.urgencyNormal')}
    </span>
  );
}

// ─── getTypeConfig — used by ServiceRequestCreateModal for the type picker ───

export function getTypeConfig(t: (key: string) => string): Record<ServiceRequestType, TypeCfg> {
  return {
    cleaning: { label: t('common.serviceRequestType.cleaning'), color: 'var(--info)',           bg: 'rgba(3,105,161,0.1)',  Icon: Sparkles },
    repair:   { label: t('common.serviceRequestType.repair'),   color: 'var(--danger)',         bg: 'rgba(185,28,28,0.1)',  Icon: Wrench   },
    supplies: { label: t('common.serviceRequestType.supplies'), color: 'var(--warning)',        bg: 'rgba(180,83,9,0.1)',   Icon: Package  },
    general:  { label: t('common.serviceRequestType.general'),  color: 'var(--text-secondary)', bg: 'var(--bg-raised)',     Icon: FileText },
  };
}

// ─── getStatusConfig — used by ServiceRequestDrawer for status pills ─────────

export function getStatusConfig(t: (key: string) => string): Record<ServiceRequestStatus, { label: string; color: string; bg: string }> {
  return {
    new:         { label: t('common.serviceRequestStatus.new'),         color: 'var(--warning)',   bg: 'rgba(180,83,9,0.1)'  },
    accepted:    { label: t('common.serviceRequestStatus.accepted'),    color: 'var(--info)',       bg: 'rgba(3,105,161,0.1)' },
    in_progress: { label: t('common.serviceRequestStatus.in_progress'), color: 'var(--brand)',      bg: 'var(--brand-subtle)' },
    completed:   { label: t('common.serviceRequestStatus.completed'),   color: 'var(--text-muted)', bg: 'var(--bg-raised)'    },
  };
}
