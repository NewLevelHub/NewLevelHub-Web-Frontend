import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building, Check, ChevronDown, Lock, Plus, Trash2 } from 'lucide-react';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { COMPANY_TIERS, USER_ROLES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { companiesCacheRoot } from '@/shared/lib/companyQueryKeys';
import { getApiError } from '@/shared/lib/getApiError';
import type { Company, CompanySettings, CrmLabel, PaginatedResponse } from '@/shared/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const BRAND_COLORS = ['#059669', '#0369a1', '#7c3aed', '#b91c1c', '#b45309', '#0891b2'];
const CRM_LABEL_COLORS = ['#059669', '#0369a1', '#b45309', '#b91c1c', '#7c3aed', '#0891b2', '#475569'];

const TIME_OPTIONS: string[] = [];
for (let h = 7; h <= 20; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:00`);
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const fieldStyle: React.CSSProperties = {
  padding: '9px 12px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg-raised)',
  color: 'var(--text-primary)',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
  width: '100%',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: '18px 20px',
};

const primaryBtnClass =
  'inline-flex items-center gap-1.5 h-[34px] px-3 text-[13px] font-medium bg-[color:var(--brand)] text-white rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity disabled:opacity-50';

function normalizeTimeInput(value: string): string {
  return value.trim().slice(0, 5);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 14,
        borderBottom: '1px solid var(--border-faint)',
        marginBottom: 14,
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
    </div>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}
    >
      {children}
    </label>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CompanySettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;
  const initialCompanyId = searchParams.get('company') ?? '';
  const [selectedCompanyId, setSelectedCompanyId] = useState(initialCompanyId);

  const companyId = isSuperadmin
    ? selectedCompanyId || null
    : user?.company_id != null
      ? String(user.company_id)
      : null;

  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: companiesData } = useQuery({
    queryKey: [...companiesCacheRoot(user?.id), 'list'],
    enabled: isSuperadmin,
    queryFn: () =>
      apiClient.get<PaginatedResponse<Company>>(API.companies.list).then((r) => r.data),
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['company-settings', companyId],
    enabled: Boolean(companyId),
    queryFn: () =>
      apiClient
        .get<CompanySettings>(API.companies.settings(companyId!))
        .then((r) => r.data),
  });

  const { data: companyData } = useQuery({
    queryKey: ['company', companyId],
    enabled: Boolean(companyId),
    queryFn: () =>
      apiClient.get<Company>(API.companies.detail(companyId!)).then((r) => r.data),
  });

  const isPremium = companyData?.plan === COMPANY_TIERS.PREMIUM;

  const crmLabelsUrl =
    isSuperadmin && companyId ? `${API.crm.labels}?company_id=${companyId}` : API.crm.labels;

  const { data: crmLabels } = useQuery({
    queryKey: ['crm', 'labels', companyId],
    enabled: Boolean(companyId),
    queryFn: () =>
      apiClient.get<CrmLabel[]>(crmLabelsUrl).then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : (d as { results: CrmLabel[] }).results;
      }),
  });

  // ── Form state ───────────────────────────────────────────────────────────

  const [vacationDays, setVacationDays] = useState('24');
  const [onboardingEnabled, setOnboardingEnabled] = useState(false);
  const [brandColor, setBrandColor] = useState('#059669');
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('18:00');
  const [categoriesText, setCategoriesText] = useState('');
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#059669');

  useEffect(() => {
    if (!data) return;
    setVacationDays(String(data.vacation_days_per_year ?? 0));
    setOnboardingEnabled(Boolean(data.onboarding_enabled));
    setBrandColor(data.brand_primary_color || '#059669');
    setWorkStart(data.working_hours.start || '09:00');
    setWorkEnd(data.working_hours.end || '18:00');
    setCategoriesText((data.custom_task_categories || []).join('\n'));
  }, [data]);

  // ── Mutations ────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: () => {
      const parsedCategories = categoriesText
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);

      return apiClient.patch(API.companies.settings(companyId!), {
        vacation_days_per_year: Number(vacationDays),
        onboarding_enabled: onboardingEnabled,
        ...(isPremium ? { brand_primary_color: brandColor || null } : {}),
        working_hours: {
          start: normalizeTimeInput(workStart),
          end: normalizeTimeInput(workEnd),
        },
        custom_task_categories: parsedCategories,
      });
    },
    onSuccess: async () => {
      setError(null);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
      await queryClient.invalidateQueries({ queryKey: ['company-settings', companyId] });
      void queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
      void queryClient.invalidateQueries({ queryKey: ['leave-team-balance'] });
    },
    onError: (mutationError: unknown) => {
      setError(getApiError(mutationError).message);
    },
  });

  const createLabelMutation = useMutation({
    mutationFn: (payload: { name: string; color: string }) =>
      apiClient.post<CrmLabel>(crmLabelsUrl, payload).then((r) => r.data),
    onSuccess: () => {
      setNewLabelName('');
      setNewLabelColor('#059669');
      void queryClient.invalidateQueries({ queryKey: ['crm', 'labels'] });
    },
  });

  const deleteLabelMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(API.crm.labelDetail(id)),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['crm', 'labels'] }),
  });

  // ── Early returns ────────────────────────────────────────────────────────

  if (!companyId && !isSuperadmin) {
    return (
      <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
          {t('companies.settingsPageTitle')}
        </h1>
        <p>{t('companies.settingsNoCompany')}</p>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Page header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {t('companies.settingsPageTitle')}
          </h1>
        </div>

        {/* SA company dropdown */}
        {isSuperadmin && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg-raised)',
              cursor: 'pointer',
            }}
          >
            <Building size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              <option value="">{t('common.selectCompany')}</option>
              {(companiesData?.results ?? []).map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          </div>
        )}
      </div>

      {/* ── General Settings ────────────────────────────────────────────── */}
      <>
        {/* Loading / error states */}
        {!companyId && isSuperadmin && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {t('companies.selectCompanyFirst')}
          </p>
        )}
        {companyId && isLoading && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('companies.settingsLoading')}</p>
        )}
        {companyId && isError && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 8,
              background: 'var(--danger-bg)',
              color: 'var(--danger-text)',
              fontSize: 13,
            }}
          >
            {t('companies.settingsError')}
          </div>
        )}

        {companyId && !isLoading && !isError && data && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
              {/* Card: HR & Brand */}
              <div style={cardStyle}>
                <SectionHeader title={t('companies.hrBrand')} />

                {/* Vacation days stepper */}
                <div style={{ marginBottom: 16 }}>
                  <FieldLabel htmlFor="vac-days">{t('companies.vacDaysLabel')}</FieldLabel>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setVacationDays((v) => String(Math.max(0, Number(v) - 1)))}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-raised)',
                        color: 'var(--text-primary)',
                        fontSize: 16,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                      aria-label="−"
                    >
                      −
                    </button>
                    <input
                      id="vac-days"
                      type="number"
                      min={0}
                      value={vacationDays}
                      onChange={(e) => setVacationDays(e.target.value)}
                      style={{ ...fieldStyle, width: 70, textAlign: 'center' }}
                    />
                    <button
                      type="button"
                      onClick={() => setVacationDays((v) => String(Number(v) + 1))}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-raised)',
                        color: 'var(--text-primary)',
                        fontSize: 16,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                      aria-label="+"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Brand color swatches */}
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <FieldLabel>{t('companies.brandColorLabel')}</FieldLabel>
                    {!isPremium && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 500,
                          color: 'var(--text-muted)',
                          background: 'var(--bg-raised)',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          padding: '2px 7px',
                        }}
                      >
                        <Lock size={10} />
                        {t('companies.premiumOnly')}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {BRAND_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        disabled={!isPremium}
                        onClick={() => isPremium && setBrandColor(c)}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: c,
                          border: brandColor === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                          outline: brandColor === c ? '2px solid var(--bg-surface)' : 'none',
                          cursor: isPremium ? 'pointer' : 'not-allowed',
                          opacity: isPremium ? 1 : 0.5,
                          flexShrink: 0,
                          padding: 0,
                        }}
                        aria-label={c}
                      />
                    ))}
                    {/* Divider */}
                    <div
                      style={{
                        width: 1,
                        height: 24,
                        background: 'var(--border)',
                        flexShrink: 0,
                        marginLeft: 4,
                        marginRight: 4,
                      }}
                      aria-hidden="true"
                    />
                    {/* Preview circle */}
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: isPremium ? brandColor : 'var(--bg-raised)',
                        border: '1px solid var(--border)',
                        flexShrink: 0,
                      }}
                      aria-hidden="true"
                    />
                    {/* Divider */}
                    <div
                      style={{
                        width: 1,
                        height: 24,
                        background: 'var(--border)',
                        flexShrink: 0,
                        marginLeft: 4,
                        marginRight: 4,
                      }}
                      aria-hidden="true"
                    />
                    {/* Custom color picker */}
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      disabled={!isPremium}
                      title={t('companies.customColor')}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        padding: 2,
                        cursor: isPremium ? 'pointer' : 'not-allowed',
                        opacity: isPremium ? 1 : 0.5,
                        background: 'var(--bg-raised)',
                        flexShrink: 0,
                      }}
                    />
                  </div>
                </div>

                {/* Onboarding toggle */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border-faint)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {t('companies.onboardingToggleTitle')}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {t('companies.onboardingToggleDesc')}
                    </div>
                  </div>
                  <div
                    role="switch"
                    aria-checked={onboardingEnabled}
                    tabIndex={0}
                    onClick={() => setOnboardingEnabled((v) => !v)}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        setOnboardingEnabled((v) => !v);
                      }
                    }}
                    style={{
                      width: 36,
                      height: 20,
                      borderRadius: 10,
                      cursor: 'pointer',
                      background: onboardingEnabled ? 'var(--brand)' : 'var(--border-strong)',
                      position: 'relative',
                      transition: 'background 0.18s',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 3,
                        left: onboardingEnabled ? 19 : 3,
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: '#fff',
                        transition: 'left 0.18s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Card: Working Hours */}
              <div style={cardStyle}>
                <SectionHeader title={t('companies.workHours')} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <FieldLabel htmlFor="work-start">{t('companies.workStart')}</FieldLabel>
                    <select
                      id="work-start"
                      value={workStart}
                      onChange={(e) => setWorkStart(e.target.value)}
                      style={fieldStyle}
                    >
                      {TIME_OPTIONS.map((t_) => (
                        <option key={t_} value={t_}>{t_}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel htmlFor="work-end">{t('companies.workEnd')}</FieldLabel>
                    <select
                      id="work-end"
                      value={workEnd}
                      onChange={(e) => setWorkEnd(e.target.value)}
                      style={fieldStyle}
                    >
                      {TIME_OPTIONS.map((t_) => (
                        <option key={t_} value={t_}>{t_}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <FieldLabel htmlFor="task-cats">{t('companies.taskCatsLabel')}</FieldLabel>
                  <textarea
                    id="task-cats"
                    rows={5}
                    value={categoriesText}
                    onChange={(e) => setCategoriesText(e.target.value)}
                    placeholder={t('companies.taskCatsHint')}
                    style={{ ...fieldStyle, resize: 'vertical' }}
                  />
                </div>
              </div>

              {/* Card: CRM Labels (full-width) */}
              <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: 14,
                    borderBottom: '1px solid var(--border-faint)',
                    marginBottom: 14,
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {t('companies.crmLabels')}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {t('companies.crmLabelsCount', { count: (crmLabels ?? []).length })}
                  </span>
                </div>

                {/* Existing labels */}
                {(crmLabels ?? []).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                    {(crmLabels ?? []).map((label) => (
                      <div
                        key={label.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px',
                          borderRadius: 20,
                          background: label.color + '22',
                          border: `1px solid ${label.color}44`,
                          fontSize: 12,
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: label.color,
                            flexShrink: 0,
                          }}
                          aria-hidden="true"
                        />
                        {label.name}
                        <button
                          type="button"
                          onClick={() => deleteLabelMutation.mutate(label.id)}
                          disabled={deleteLabelMutation.isPending}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            color: 'var(--text-muted)',
                            opacity: deleteLabelMutation.isPending ? 0.5 : 1,
                          }}
                          aria-label={t('companies.labelDeleteAria', { name: label.name })}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {(crmLabels ?? []).length === 0 && (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
                    {t('companies.noLabels')}
                  </p>
                )}

                {/* Add label form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const trimmed = newLabelName.trim();
                    if (!trimmed || createLabelMutation.isPending) return;
                    createLabelMutation.mutate({ name: trimmed, color: newLabelColor });
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}
                >
                  {/* Color swatches */}
                  <div style={{ display: 'flex', gap: 5 }}>
                    {CRM_LABEL_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewLabelColor(c)}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: c,
                          border: newLabelColor === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                          outline: newLabelColor === c ? '2px solid var(--bg-surface)' : 'none',
                          cursor: 'pointer',
                          padding: 0,
                          flexShrink: 0,
                        }}
                        aria-label={c}
                      />
                    ))}
                  </div>
                  <input
                    type="text"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    placeholder={t('companies.labelNamePlaceholder')}
                    style={{ ...fieldStyle, width: 180 }}
                  />
                  <button
                    type="submit"
                    disabled={!newLabelName.trim() || createLabelMutation.isPending}
                    className={primaryBtnClass}
                  >
                    <Plus size={13} />
                    {createLabelMutation.isPending ? t('common.creating') : t('companies.addLabel')}
                  </button>
                </form>

                {createLabelMutation.isError && (
                  <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 8 }}>
                    {t('companies.labelCreateError')}
                  </p>
                )}
              </div>

              {/* Save bar (full-width) */}
              <div
                style={{
                  gridColumn: '1 / -1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 12,
                }}
              >
                {error && (
                  <span style={{ fontSize: 13, color: 'var(--danger)' }}>{error}</span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    saveMutation.mutate();
                  }}
                  disabled={saveMutation.isPending}
                  className={primaryBtnClass}
                  style={{ height: 36, paddingLeft: 16, paddingRight: 16 }}
                >
                  {savedFlash ? (
                    <>
                      <Check size={13} />
                      {t('companies.savedSuccess')}
                    </>
                  ) : saveMutation.isPending ? (
                    t('common.savingPlain')
                  ) : (
                    t('companies.saveSettings')
                  )}
                </button>
              </div>
          </div>
        )}
      </>
    </div>
  );
}
