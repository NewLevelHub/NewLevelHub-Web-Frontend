import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Mail, Phone, Globe, Edit2, Users, LayoutGrid, FolderOpen, MonitorPlay, ChevronLeft } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { resFileInput } from '@/shared/ui/resourcePageStyles';

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
  COMPANY_PLAN_DEFAULT_LIMITS,
  type CompanyTier,
} from '@/shared/config/constants';
import type { CompanyDetail, CompanyLimits } from '@/shared/types';

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

// ── Edit modal styles ────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  height: 36,
  padding: '0 12px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--text-secondary)',
  display: 'block',
  marginBottom: 6,
};

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

function SettingsTabContent({ companyId }: { companyId?: string }) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const subTab = (searchParams.get('subtab') as SettingsSubTab | null) ?? 'general';

  function setSubTab(tab: SettingsSubTab) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('subtab', tab);
      return next;
    });
  }

  const subTabs: SubTab<SettingsSubTab>[] = [
    { id: 'general', label: t('companyHub.tabSettingsGeneral') },
    { id: 'onboarding', label: t('companyHub.tabSettingsOnboarding') },
    { id: 'team-progress', label: t('companyHub.tabSettingsTeamProgress') },
  ];

  return (
    <div>
      <UnderlineTabBar tabs={subTabs} active={subTab} onChange={setSubTab} />
      {subTab === 'general' && <CompanySettingsPage hideNav companyId={companyId} />}
      {subTab === 'onboarding' && <CompanyOnboardingTemplatesPage hideNav companyId={companyId} />}
      {subTab === 'team-progress' && <TeamOnboardingPage hideNav companyId={companyId} />}
    </div>
  );
}

// ── MembersTabContent ─────────────────────────────────────────────────────────

type MembersSubTab = 'manage' | 'cards' | 'invites';

function MembersTabContent({ isCA, isSuperadmin, companyId }: { isCA: boolean; isSuperadmin: boolean; companyId: string }) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const subTab = (searchParams.get('subtab') as MembersSubTab | null) ?? 'manage';

  function setSubTab(tab: MembersSubTab) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('subtab', tab);
      return next;
    });
  }

  if (!isCA && !isSuperadmin) {
    return <TeamDirectoryPage hideNav companyId={companyId} />;
  }

  const subTabs: SubTab<MembersSubTab>[] = [
    { id: 'manage', label: t('companyHub.tabMembersManage') },
    { id: 'cards', label: t('companyHub.tabMembersCards') },
    { id: 'invites', label: t('companyHub.tabMembersInvites') },
  ];

  return (
    <div>
      <UnderlineTabBar tabs={subTabs} active={subTab} onChange={setSubTab} />
      {subTab === 'manage' && <TeamManagePage hideNav initialView="manage" companyId={companyId} />}
      {subTab === 'cards' && <TeamManagePage hideNav initialView="directory" companyId={companyId} />}
      {subTab === 'invites' && (isCA || isSuperadmin) && <InvitesPanel companyId={companyId} />}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'members' | 'resources' | 'settings';

interface CompanyHubPageProps {
  companyId?: string; // overrides user.company_id when provided (superadmin use-case)
}

export default function CompanyHubPage({ companyId: propCompanyId }: CompanyHubPageProps = {}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;
  const isCA = user?.role === USER_ROLES.COMPANY_ADMIN;
  const companyId = propCompanyId ?? (user?.company_id ? String(user.company_id) : null);

  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab: TabId = isSuperadmin && !!propCompanyId ? 'members' : 'overview';
  const activeTab = (searchParams.get('tab') as TabId | null) ?? defaultTab;

  function setActiveTab(tab: TabId) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      next.delete('subtab');
      return next;
    });
  }

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    categories: [] as string[],
    office_number: '',
    plan: '',
    max_employees: 0,
    storage_limit_gb: 0,
    max_boards: 0,
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [categoriesInput, setCategoriesInput] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { mutate: patchCompany, isPending: editPending } = useMutation({
    mutationFn: async () => {
      if (logoFile) {
        const fd = new FormData();
        (Object.entries(editForm) as [string, string | number | string[]][]).forEach(([k, v]) => {
          if (Array.isArray(v)) {
            fd.append(k, JSON.stringify(v));
          } else if (v !== '' && v !== null && v !== undefined) {
            fd.append(k, String(v));
          }
        });
        fd.append('logo', logoFile);
        return apiClient.patch(API.companies.detail(companyId!), fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      return apiClient.patch(API.companies.detail(companyId!), editForm);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-hub', 'detail', companyId] });
      setEditOpen(false);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setEditError(typeof msg === 'string' ? msg : t('companyHub.editSaveError'));
    },
  });

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

  // Resource count for tab badge — use limits if available
  const resourceCount = undefined; // No separate resource count from limits

  const showSettings = isCA || isSuperadmin;

  const tabs: { id: TabId; labelKey: string; count?: number }[] = [
    { id: 'overview', labelKey: 'companyHub.tabOverview' },
    { id: 'members', labelKey: 'companyHub.tabMembers', count: limits?.employees?.current },
    { id: 'resources', labelKey: 'companyHub.tabResources', count: resourceCount },
    ...(showSettings ? [{ id: 'settings' as TabId, labelKey: 'companyHub.tabSettings' }] : []),
  ];

  const isPremium = company?.plan === COMPANY_TIERS.PREMIUM;
  const canUploadLogo = (isCA && isPremium) || isSuperadmin;

  const tierStyle = company
    ? (TIER_BADGE_STYLE[company.plan] ?? TIER_BADGE_STYLE[COMPANY_TIERS.BASIC])
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Back button ── */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--text-secondary)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 0',
          marginBottom: 4,
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)')}
      >
        <ChevronLeft size={16} />
        {t('common.back')}
      </button>

      <style>{`
        @media (max-width: 767px) {
          .hub-hero-card {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
          .hub-hero-avatar {
            width: 56px !important;
            height: 56px !important;
            font-size: 18px !important;
            border-radius: 12px !important;
          }
          .hub-hero-edit-btn {
            align-self: flex-start !important;
            margin-top: 4px !important;
          }
          .hub-limits-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .nlh-filters {
            justify-content: flex-start !important;
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
            flex-wrap: nowrap !important;
          }
          .hub-quick-stats-grid {
            grid-template-columns: 1fr !important;
          }
          .hub-tariff-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* ── Page header ── */}
      {!isSuperadmin && (
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
      )}

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
          <div className="hub-hero-card" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            {/* Avatar */}
            <CompanyAvatar name={company.name} logo={company.logo} />

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

            {/* Edit button — CA or superadmin */}
            {(isCA || isSuperadmin) && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditForm({
                    name: company?.name ?? '',
                    description: company?.description ?? '',
                    categories: company?.categories ?? [],
                    office_number: company?.office_number ?? '',
                    plan: company?.plan ?? '',
                    max_employees: company?.max_employees ?? 0,
                    storage_limit_gb: company?.storage_limit_gb ?? 0,
                    max_boards: company?.max_boards ?? 0,
                  });
                  setCategoriesInput((company?.categories ?? []).join(', '));
                  setLogoFile(null);
                  setLogoPreview(null);
                  setEditError(null);
                  setCategoriesError(null);
                  setEditOpen(true);
                }}
                className="hub-hero-edit-btn"
                style={{ flexShrink: 0 }}
              >
                <Edit2 size={12} />
                {t('companyHub.editCompany')}
              </Button>
            )}
          </div>
        ) : null}
      </div>

      {/* ── Limit cards — 4-col grid matching DS ── */}
      <div
        className="hub-limits-grid"
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
              value={company.quick_stats?.guests_this_month ?? 0}
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
          <OverviewTab quickStats={company?.quick_stats ?? null} plan={company?.plan ?? null} />
        )}
        {activeTab === 'members' && companyId && <MembersTabContent isCA={isCA} isSuperadmin={isSuperadmin} companyId={companyId} />}
        {activeTab === 'resources' && <CompanyResourcesPage companyId={companyId ?? undefined} />}
        {activeTab === 'settings' && showSettings && <SettingsTabContent companyId={companyId ?? undefined} />}
      </div>

      {/* ── Edit company modal ── */}
      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => e.target === e.currentTarget && setEditOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-[560px] rounded-2xl border border-default bg-surface shadow-xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between px-[22px] pt-[18px] pb-[14px]">
              <div className="min-w-0 pr-4">
                <h2 className="text-base font-semibold text-primary tracking-[-0.015em]">
                  {t('companyHub.editModalTitle')}
                </h2>
                <p className="text-xs text-muted mt-0.5">{t('companyHub.editModalSubtitle')}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-secondary hover:bg-raised hover:text-primary focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
                aria-label={t('common.close')}
              >
                <X size={14} />
              </button>
            </div>

            {/* Body */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (categoriesError) return;
                patchCompany();
              }}
              className="flex flex-col min-h-0 flex-1"
            >
              <div className="px-[22px] pb-4 flex flex-col gap-4 overflow-y-auto flex-1">

                {/* Name */}
                <div>
                  <label style={labelStyle} htmlFor="edit-company-name">
                    {t('companyHub.editFieldName')}
                  </label>
                  <input
                    id="edit-company-name"
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    style={inputStyle}
                  />
                </div>

                {/* Description */}
                <div>
                  <label style={labelStyle} htmlFor="edit-company-description">
                    {t('companyHub.editFieldDescription')}
                  </label>
                  <textarea
                    id="edit-company-description"
                    rows={3}
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    style={{ ...inputStyle, height: 'auto', padding: '8px 12px', resize: 'none', minHeight: 80 }}
                  />
                </div>

                {/* Categories */}
                <div>
                  <label style={labelStyle} htmlFor="edit-company-categories">
                    {t('companyHub.editFieldCategories')}
                  </label>
                  <input
                    id="edit-company-categories"
                    type="text"
                    value={categoriesInput}
                    placeholder={t('companyHub.editFieldCategoriesHint')}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCategoriesInput(v);
                      const parsed = v.split(',').map((s) => s.trim()).filter(Boolean);
                      const tooMany = parsed.length > 10;
                      const tooLong = parsed.some((s) => s.length > 50);
                      if (tooMany) {
                        setCategoriesError(t('companyHub.editCategoriesErrorMax'));
                      } else if (tooLong) {
                        setCategoriesError(t('companyHub.editCategoriesErrorLength'));
                      } else {
                        setCategoriesError(null);
                      }
                      setEditForm((f) => ({ ...f, categories: parsed }));
                    }}
                    style={inputStyle}
                  />
                  {categoriesError ? (
                    <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{categoriesError}</p>
                  ) : (
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      {t('companyHub.editFieldCategoriesHint')}
                    </p>
                  )}
                </div>

                {/* Logo upload — premium CA or superadmin */}
                {canUploadLogo && (
                  <div>
                    <label style={labelStyle} htmlFor="edit-company-logo">
                      {t('companyHub.editFieldLogo')}
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {(logoPreview ?? company?.logo) && (
                        <img
                          src={logoPreview ?? company!.logo!}
                          alt={t('companyHub.editFieldLogo')}
                          style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', flexShrink: 0 }}
                        />
                      )}
                      <input
                        id="edit-company-logo"
                        type="file"
                        accept="image/*"
                        className={resFileInput}
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          setLogoFile(file);
                          setLogoPreview(file ? URL.createObjectURL(file) : null);
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* ── Superadmin-only fields ── */}
                {isSuperadmin && (
                  <>
                    {/* Office number */}
                    <div>
                      <label style={labelStyle} htmlFor="edit-company-office-number">
                        {t('companyHub.editFieldOfficeNumber')}
                      </label>
                      <input
                        id="edit-company-office-number"
                        type="text"
                        value={editForm.office_number}
                        onChange={(e) => setEditForm((f) => ({ ...f, office_number: e.target.value }))}
                        style={inputStyle}
                      />
                    </div>

                    {/* Plan */}
                    <div>
                      <label style={labelStyle} htmlFor="edit-company-plan">
                        {t('companyHub.editFieldPlan')}
                      </label>
                      <select
                        id="edit-company-plan"
                        value={editForm.plan}
                        onChange={(e) => {
                          const newPlan = e.target.value as CompanyTier;
                          const limits =
                            COMPANY_PLAN_DEFAULT_LIMITS[newPlan] ??
                            COMPANY_PLAN_DEFAULT_LIMITS[COMPANY_TIERS.BASIC];
                          setEditForm((f) => ({
                            ...f,
                            plan: newPlan,
                            max_employees: limits.max_employees,
                            storage_limit_gb: limits.storage_limit_gb,
                            max_boards: limits.max_boards,
                          }));
                        }}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                      >
                        <option value={COMPANY_TIERS.BASIC}>{t('common.companyTier.basic')}</option>
                        <option value={COMPANY_TIERS.STANDARD}>{t('common.companyTier.standard')}</option>
                        <option value={COMPANY_TIERS.PREMIUM}>{t('common.companyTier.premium')}</option>
                      </select>
                    </div>

                    {/* Max employees */}
                    <div>
                      <label style={labelStyle} htmlFor="edit-company-max-employees">
                        {t('companyHub.editFieldMaxEmployees')}
                      </label>
                      <input
                        id="edit-company-max-employees"
                        type="number"
                        min={1}
                        value={editForm.max_employees}
                        onChange={(e) => setEditForm((f) => ({ ...f, max_employees: Number(e.target.value) }))}
                        style={inputStyle}
                      />
                    </div>

                    {/* Storage limit */}
                    <div>
                      <label style={labelStyle} htmlFor="edit-company-storage">
                        {t('companyHub.editFieldStorageLimitGb')}
                      </label>
                      <input
                        id="edit-company-storage"
                        type="number"
                        min={1}
                        value={editForm.storage_limit_gb}
                        onChange={(e) => setEditForm((f) => ({ ...f, storage_limit_gb: Number(e.target.value) }))}
                        style={inputStyle}
                      />
                    </div>

                    {/* Max boards */}
                    <div>
                      <label style={labelStyle} htmlFor="edit-company-max-boards">
                        {t('companyHub.editFieldMaxBoards')}
                      </label>
                      <input
                        id="edit-company-max-boards"
                        type="number"
                        min={1}
                        value={editForm.max_boards}
                        onChange={(e) => setEditForm((f) => ({ ...f, max_boards: Number(e.target.value) }))}
                        style={inputStyle}
                      />
                    </div>
                  </>
                )}

                {/* API error banner */}
                {editError && (
                  <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{editError}</p>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 border-t border-[color:var(--border-faint)] px-[22px] pt-[14px] pb-[18px] mt-3">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="h-8 px-4 text-sm font-medium text-secondary hover:bg-raised rounded-[var(--radius-sm)] transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <Button variant="primary" size="sm" loading={editPending} disabled={!!categoriesError}>
                  {t('common.save')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
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

function CompanyAvatar({ name, logo }: { name: string; logo?: string | null }) {
  const [imgError, setImgError] = useState(false);
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  if (logo && !imgError) {
    return (
      <img
        src={logo}
        alt={name}
        className="hub-hero-avatar"
        onError={() => setImgError(true)}
        style={{
          width: 80,
          height: 80,
          borderRadius: 16,
          objectFit: 'cover',
          flexShrink: 0,
          border: '1px solid var(--border)',
        }}
      />
    );
  }

  return (
    <div
      className="hub-hero-avatar"
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

interface QuickStats {
  bookings_this_month: number;
  active_tasks: number;
  guests_this_month: number;
}

interface OverviewTabProps {
  quickStats: QuickStats | null;
  plan: string | null;
}

function OverviewTab({ quickStats, plan }: OverviewTabProps) {
  const { t } = useTranslation();

  const stats: Array<{ value: number; labelKey: string; color: string }> = [
    { value: quickStats?.bookings_this_month ?? 0, labelKey: 'companyHub.statBookings', color: 'var(--brand)' },
    { value: quickStats?.active_tasks ?? 0,        labelKey: 'companyHub.statTasks',    color: 'var(--violet, #8b5cf6)' },
    { value: quickStats?.guests_this_month ?? 0,   labelKey: 'companyHub.statGuests',   color: 'var(--success)' },
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
        <div className="hub-quick-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
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
        <div className="hub-tariff-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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
