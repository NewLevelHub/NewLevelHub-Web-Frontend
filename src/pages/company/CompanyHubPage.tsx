import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Check, X, Mail, Phone, Globe, Edit2, Users, LayoutGrid, FolderOpen, MonitorPlay } from 'lucide-react';

import CompanyResourcesPage from '@/pages/company/CompanyResourcesPage';
import CompanySettingsPage from '@/pages/company/CompanySettingsPage';
import CompanyOnboardingTemplatesPage from '@/pages/company/CompanyOnboardingTemplatesPage';
import TeamOnboardingPage from '@/pages/company/TeamOnboardingPage';
import TeamManagePage from '@/pages/team/TeamManagePage';
import TeamDirectoryPage from '@/pages/team/TeamDirectoryPage';
import InvitesPanel from '@/pages/company/components/InvitesPanel';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { useAuth } from '@/shared/hooks/useAuth';
import { cn } from '@/shared/lib/cn';
import {
  USER_ROLES,
  COMPANY_TIERS,
  COMPANY_TIER_LABEL_KEYS,
  type CompanyTier,
} from '@/shared/config/constants';
import type { CompanyDetail, CompanyLimits, CompanyAnalytics } from '@/shared/types';

// ── Tier badge styles ────────────────────────────────────────────────────────

const TIER_BADGE_STYLE: Record<string, { background: string; color: string }> = {
  [COMPANY_TIERS.BASIC]: {
    background: 'var(--bg-raised)',
    color: 'var(--text-muted)',
  },
  [COMPANY_TIERS.STANDARD]: {
    background: 'var(--brand-subtle)',
    color: 'var(--brand-text, var(--brand))',
  },
  [COMPANY_TIERS.PREMIUM]: {
    background: 'var(--bg-raised)',
    color: 'var(--text-primary)',
  },
};

// ── Tariff features ──────────────────────────────────────────────────────────

interface TariffFeature {
  labelKey: string;
  tiers: string[];
}

const TARIFF_FEATURES: TariffFeature[] = [
  { labelKey: 'companyHub.tariffFeatureBookings', tiers: [COMPANY_TIERS.BASIC, COMPANY_TIERS.STANDARD, COMPANY_TIERS.PREMIUM] },
  { labelKey: 'companyHub.tariffFeatureStorage',  tiers: [COMPANY_TIERS.BASIC, COMPANY_TIERS.STANDARD, COMPANY_TIERS.PREMIUM] },
  { labelKey: 'companyHub.tariffFeatureCrm',      tiers: [COMPANY_TIERS.STANDARD, COMPANY_TIERS.PREMIUM] },
  { labelKey: 'companyHub.tariffFeatureGuests',   tiers: [COMPANY_TIERS.STANDARD, COMPANY_TIERS.PREMIUM] },
  { labelKey: 'companyHub.tariffFeatureAnalytics', tiers: [COMPANY_TIERS.STANDARD, COMPANY_TIERS.PREMIUM] },
  { labelKey: 'companyHub.tariffFeatureReports',  tiers: [COMPANY_TIERS.PREMIUM] },
  { labelKey: 'companyHub.tariffFeatureSla',      tiers: [COMPANY_TIERS.PREMIUM] },
  { labelKey: 'companyHub.tariffFeatureApi',      tiers: [COMPANY_TIERS.PREMIUM] },
];

// ── Underline sub-tab bar ────────────────────────────────────────────────────

interface SubTab<T extends string> {
  id: T;
  label: string;
  count?: number;
}

function UnderlineTabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: SubTab<T>[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          style={{
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 500,
            color: active === tab.id ? 'var(--brand)' : 'var(--text-secondary)',
            background: 'none',
            border: 'none',
            borderBottom: active === tab.id ? '2px solid var(--brand)' : '2px solid transparent',
            marginBottom: -1,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            transition: 'color 0.15s, border-color 0.15s',
          }}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: 10,
                background: active === tab.id ? 'var(--brand-subtle)' : 'var(--bg-raised)',
                color: active === tab.id ? 'var(--brand-text, var(--brand))' : 'var(--text-muted)',
              }}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── SettingsTabContent ────────────────────────────────────────────────────────

type SettingsSubTab = 'general' | 'onboarding' | 'team-progress';

function SettingsTabContent() {
  const { t } = useTranslation();
  const [subTab, setSubTab] = useState<SettingsSubTab>('general');

  const subTabs: SubTab<SettingsSubTab>[] = [
    { id: 'general', label: t('companyHub.tabSettingsGeneral') },
    { id: 'onboarding', label: t('companyHub.tabSettingsOnboarding') },
    { id: 'team-progress', label: t('companyHub.tabSettingsTeamProgress') },
  ];

  return (
    <div>
      <UnderlineTabBar tabs={subTabs} active={subTab} onChange={setSubTab} />
      {subTab === 'general' && <CompanySettingsPage />}
      {subTab === 'onboarding' && <CompanyOnboardingTemplatesPage />}
      {subTab === 'team-progress' && <TeamOnboardingPage />}
    </div>
  );
}

// ── MembersTabContent ─────────────────────────────────────────────────────────

type MembersSubTab = 'manage' | 'cards' | 'invites';

function MembersTabContent({ isCA, companyId }: { isCA: boolean; companyId: string }) {
  const { t } = useTranslation();
  const [subTab, setSubTab] = useState<MembersSubTab>('manage');

  const subTabs: SubTab<MembersSubTab>[] = [
    { id: 'manage', label: t('companyHub.tabMembersManage') },
    { id: 'cards', label: t('companyHub.tabMembersCards') },
    ...(isCA ? [{ id: 'invites' as MembersSubTab, label: t('companyHub.tabMembersInvites') }] : []),
  ];

  return (
    <div>
      <UnderlineTabBar tabs={subTabs} active={subTab} onChange={setSubTab} />
      {subTab === 'manage' && (isCA ? <TeamManagePage hideNav initialView="manage" /> : <TeamDirectoryPage />)}
      {subTab === 'cards' && <TeamManagePage hideNav initialView="directory" />}
      {subTab === 'invites' && isCA && <InvitesPanel companyId={companyId} />}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'members' | 'resources' | 'settings';

export default function CompanyHubPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const isCA = user?.role === USER_ROLES.COMPANY_ADMIN;
  const companyId = user?.company_id ? String(user.company_id) : null;

  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Inject style once to hide inner page headers when sub-pages render inside the hub
  useEffect(() => {
    const STYLE_ID = 'nlh-hub-embed-style';
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = '.nlh-hub-embed > div > .nlh-page-head { display: none !important; }';
    document.head.appendChild(el);
  }, []);

  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ['company-hub', 'detail', companyId],
    queryFn: () =>
      apiClient.get<CompanyDetail>(API.companies.detail(companyId!)).then((r) => r.data),
    enabled: !!companyId,
  });

  const { data: limits, isLoading: limitsLoading } = useQuery({
    queryKey: ['company-hub', 'limits', companyId],
    queryFn: () =>
      apiClient.get<CompanyLimits>(API.companies.limits(companyId!)).then((r) => r.data),
    enabled: !!companyId,
  });

  const { data: analytics } = useQuery({
    queryKey: ['company-hub', 'analytics', companyId],
    queryFn: () =>
      apiClient.get<CompanyAnalytics>(API.analytics.companyDashboard).then((r) => r.data),
    enabled: !!companyId,
  });

  // Resource count for tab badge — use limits if available
  const resourceCount = undefined; // No separate resource count from limits

  const tabs: { id: TabId; labelKey: string; count?: number }[] = [
    { id: 'overview', labelKey: 'companyHub.tabOverview' },
    { id: 'members', labelKey: 'companyHub.tabMembers', count: limits?.employees?.current },
    { id: 'resources', labelKey: 'companyHub.tabResources', count: resourceCount },
    ...(isCA ? [{ id: 'settings' as TabId, labelKey: 'companyHub.tabSettings' }] : []),
  ];

  const tierStyle = company
    ? (TIER_BADGE_STYLE[company.plan] ?? TIER_BADGE_STYLE[COMPANY_TIERS.BASIC])
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
          {t('companyHub.title')}
        </h1>
        {company && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>
            {company.name} · {t(COMPANY_TIER_LABEL_KEYS[company.plan as CompanyTier] ?? '')}
          </p>
        )}
      </div>

      {/* ── Hero card ── */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px 20px',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {companyLoading ? (
          <HeroSkeleton />
        ) : company ? (
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            {/* Avatar */}
            <CompanyAvatar name={company.name} />

            {/* Info */}
            <div style={{ flex: 1 }}>
              {/* Name + badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  {company.name}
                </span>

                {company.is_active && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 9px',
                      borderRadius: 20,
                      background: 'rgba(52,211,153,0.1)',
                      color: 'var(--success)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
                    {t('companyHub.statusActive')}
                  </span>
                )}

                {tierStyle && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '2px 9px',
                      borderRadius: 20,
                      ...tierStyle,
                    }}
                  >
                    + {t(COMPANY_TIER_LABEL_KEYS[company.plan as CompanyTier] ?? '')}
                  </span>
                )}
              </div>

              {/* Description */}
              {company.description && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  {company.description}
                </div>
              )}

              {/* Contacts */}
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {company.contact_email && (
                  <ContactItem icon={<Mail size={12} />} label={company.contact_email} />
                )}
                {company.contact_phone && (
                  <ContactItem icon={<Phone size={12} />} label={company.contact_phone} />
                )}
                {company.domain && (
                  <ContactItem icon={<Globe size={12} />} label={company.domain} />
                )}
              </div>
            </div>

            {/* Edit button — CA only */}
            {isCA && (
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 30,
                  padding: '0 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  background: 'var(--bg-raised)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <Edit2 size={12} />
                {t('companyHub.editCompany')}
              </button>
            )}
          </div>
        ) : null}
      </div>

      {/* ── Limit cards — 4-col grid matching DS ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
        }}
      >
        {limitsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <LimitCardSkeleton key={i} />)
        ) : limits && company ? (
          <>
            <LimitCard
              label={t('companyHub.limitsEmployees')}
              value={limits.employees.current}
              max={limits.employees.max}
              showBar
              icon={<Users size={14} />}
            />
            <LimitCard
              label={t('companyHub.limitsBoards')}
              value={limits.boards.current}
              max={limits.boards.max}
              showBar
              icon={<LayoutGrid size={14} />}
            />
            <LimitCard
              label={t('companyHub.limitsStorage')}
              value={Math.round(limits.storage.used_gb * 10) / 10}
              max={limits.storage.limit_gb}
              showBar
              icon={<FolderOpen size={14} />}
              formatLabel={(v, m) => t('companyHub.storageGb', { used: v, max: m })}
            />
            <LimitCard
              label={t('companyHub.limitsGuests')}
              value={company.employee_count}
              max={0}
              showBar={false}
              icon={<MonitorPlay size={14} />}
            />
          </>
        ) : null}
      </div>

      {/* ── Tab chips — DS style ── */}
      <div className="nlh-filters">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn('nlh-chip', activeTab === tab.id && 'active')}
          >
            {t(tab.labelKey)}
            {tab.count !== undefined && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  opacity: 0.75,
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="nlh-hub-embed">
        {activeTab === 'overview' && (
          <OverviewTab analytics={analytics ?? null} plan={company?.plan ?? null} />
        )}
        {activeTab === 'members' && companyId && <MembersTabContent isCA={isCA} companyId={companyId} />}
        {activeTab === 'resources' && <CompanyResourcesPage />}
        {activeTab === 'settings' && isCA && <SettingsTabContent />}
      </div>
    </div>
  );
}

// ── HeroSkeleton ──────────────────────────────────────────────────────────────

function HeroSkeleton() {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <div style={{ width: 68, height: 68, borderRadius: 14, background: 'var(--bg-raised)', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ height: 20, width: 200, borderRadius: 6, background: 'var(--bg-raised)' }} />
        <div style={{ height: 12, width: 300, borderRadius: 6, background: 'var(--bg-raised)' }} />
        <div style={{ height: 12, width: 180, borderRadius: 6, background: 'var(--bg-raised)' }} />
      </div>
    </div>
  );
}

// ── CompanyAvatar ─────────────────────────────────────────────────────────────

function CompanyAvatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div
      style={{
        width: 80,
        height: 80,
        borderRadius: 16,
        background: 'var(--brand-subtle)',
        color: 'var(--brand-text, var(--brand))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 26,
        fontWeight: 800,
        flexShrink: 0,
        userSelect: 'none',
        border: '1px solid var(--border)',
      }}
    >
      {initials || name.slice(0, 2).toUpperCase()}
    </div>
  );
}

// ── ContactItem ───────────────────────────────────────────────────────────────

function ContactItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        color: 'var(--text-muted)',
      }}
    >
      {icon}
      {label}
    </span>
  );
}

// ── LimitCard ─────────────────────────────────────────────────────────────────

interface LimitCardProps {
  label: string;
  value: number;
  max: number;
  showBar: boolean;
  icon?: React.ReactNode;
  formatLabel?: (value: number, max: number) => string;
}

function LimitCard({ label, value, max, showBar, icon, formatLabel }: LimitCardProps) {
  const displayValue = formatLabel
    ? formatLabel(value, max)
    : showBar && max > 0
    ? `${value} / ${max}`
    : String(value);

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 16px',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon && (
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'var(--brand-subtle)',
              color: 'var(--brand-text, var(--brand))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        )}
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
        {displayValue}
      </div>
      {showBar && max > 0 && <LimitProgressBar value={value} max={max} />}
    </div>
  );
}

function LimitCardSkeleton() {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ height: 11, width: 80, borderRadius: 4, background: 'var(--bg-raised)' }} />
      <div style={{ height: 22, width: 60, borderRadius: 4, background: 'var(--bg-raised)' }} />
      <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-raised)' }} />
    </div>
  );
}

// ── LimitProgressBar ──────────────────────────────────────────────────────────

interface LimitProgressBarProps {
  value: number;
  max: number;
}

function LimitProgressBar({ value, max }: LimitProgressBarProps) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const isDanger = pct >= 85;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          flex: 1,
          height: 4,
          borderRadius: 2,
          background: 'var(--border)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.min(pct, 100)}%`,
            borderRadius: 2,
            background: isDanger ? 'var(--danger)' : 'var(--brand)',
            transition: 'width 0.4s',
          }}
        />
      </div>
      <span
        style={{
          fontSize: 10,
          color: isDanger ? 'var(--danger)' : 'var(--text-muted)',
          minWidth: 28,
          textAlign: 'right',
        }}
      >
        {pct}%
      </span>
    </div>
  );
}

// ── Tab: Overview ─────────────────────────────────────────────────────────────

interface OverviewTabProps {
  analytics: CompanyAnalytics | null;
  plan: string | null;
}

function OverviewTab({ analytics, plan }: OverviewTabProps) {
  const { t } = useTranslation();

  const stats: Array<{ value: number; labelKey: string; color: string }> = [
    { value: analytics?.bookings_month ?? 0,           labelKey: 'companyHub.statBookings', color: 'var(--brand)' },
    { value: analytics?.active_crm_tasks?.total ?? 0,  labelKey: 'companyHub.statTasks',    color: 'var(--violet, #8b5cf6)' },
    { value: analytics?.guest_visits_month ?? 0,       labelKey: 'companyHub.statGuests',   color: 'var(--success)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Quick stats */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px 22px',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
          {t('companyHub.quickStats')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {stats.map((s) => (
            <div
              key={s.labelKey}
              style={{
                textAlign: 'center',
                padding: '16px',
                borderRadius: 10,
                background: 'var(--bg-raised)',
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: s.color,
                  marginBottom: 4,
                  letterSpacing: '-0.03em',
                }}
              >
                {s.value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {t(s.labelKey)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tariff features */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px 22px',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
          {t('companyHub.tariffTitle')}
          {plan && (
            <span style={{ marginLeft: 6, fontWeight: 500, color: 'var(--text-muted)' }}>
              · {t(COMPANY_TIER_LABEL_KEYS[plan as CompanyTier] ?? '')}
            </span>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {TARIFF_FEATURES.map((feature) => {
            const included = plan ? feature.tiers.includes(plan) : false;
            return (
              <div
                key={feature.labelKey}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  color: included ? 'var(--text-secondary)' : 'var(--text-subtle)',
                  opacity: included ? 1 : 0.5,
                }}
              >
                <span
                  style={{
                    color: included ? 'var(--success)' : 'var(--text-subtle)',
                    fontSize: 13,
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  {included ? <Check size={13} /> : <X size={13} />}
                </span>
                {t(feature.labelKey)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
