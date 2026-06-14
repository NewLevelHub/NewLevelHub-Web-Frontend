import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Settings2, Plus, Trash2, Users, ListChecks, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { COMPANY_TIERS, USER_ROLES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { cn } from '@/shared/lib/cn';
import { companiesCacheRoot } from '@/shared/lib/companyQueryKeys';
import { getApiError } from '@/shared/lib/getApiError';
import type { Company, CompanySettings, CrmLabel, PaginatedResponse } from '@/shared/types';

function normalizeTimeInput(value: string): string {
  return value.trim().slice(0, 5);
}

const inputClass =
  'mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand';

const labelClass = 'block text-sm font-medium text-secondary';

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
  const [success, setSuccess] = useState<string | null>(null);

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

  const [vacationDays, setVacationDays] = useState('24');
  const [onboardingEnabled, setOnboardingEnabled] = useState(false);
  const [brandColor, setBrandColor] = useState('#4F46E5');
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('18:00');
  const [categoriesText, setCategoriesText] = useState('');
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#6366F1');

  useEffect(() => {
    if (!data) return;
    setVacationDays(String(data.vacation_days_per_year ?? 0));
    setOnboardingEnabled(Boolean(data.onboarding_enabled));
    setBrandColor(data.brand_primary_color || '#4F46E5');
    setWorkStart(data.working_hours.start || '09:00');
    setWorkEnd(data.working_hours.end || '18:00');
    setCategoriesText((data.custom_task_categories || []).join('\n'));
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const parsedCategories = categoriesText
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);

      return apiClient.patch(API.companies.settings(companyId!), {
        vacation_days_per_year: Number(vacationDays),
        onboarding_enabled: onboardingEnabled,
        brand_primary_color: brandColor || null,
        working_hours: {
          start: normalizeTimeInput(workStart),
          end: normalizeTimeInput(workEnd),
        },
        custom_task_categories: parsedCategories,
      });
    },
    onSuccess: async () => {
      setError(null);
      setSuccess(t('companies.settingsSaved'));
      await queryClient.invalidateQueries({ queryKey: ['company-settings', companyId] });
      void queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
      void queryClient.invalidateQueries({ queryKey: ['leave-team-balance'] });
    },
    onError: (mutationError: unknown) => {
      setSuccess(null);
      setError(getApiError(mutationError).message);
    },
  });

  const createLabelMutation = useMutation({
    mutationFn: (payload: { name: string; color: string }) =>
      apiClient.post<CrmLabel>(crmLabelsUrl, payload).then((r) => r.data),
    onSuccess: () => {
      setNewLabelName('');
      setNewLabelColor('#6366F1');
      void queryClient.invalidateQueries({ queryKey: ['crm', 'labels'] });
    },
  });

  const deleteLabelMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(API.crm.labelDetail(id)),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['crm', 'labels'] }),
  });

  const companySelector = (
    <section className="rounded-xl border border-default bg-surface p-4">
      <label className={labelClass} htmlFor="company-select-settings">
        {t('common.company')}
      </label>
      <select
        id="company-select-settings"
        value={selectedCompanyId}
        onChange={(e) => setSelectedCompanyId(e.target.value)}
        className={inputClass}
      >
        <option value="">{t('common.selectCompany')}</option>
        {(companiesData?.results ?? []).map((company) => (
          <option key={company.id} value={String(company.id)}>
            {company.name}
          </option>
        ))}
      </select>
    </section>
  );

  if (!companyId && !isSuperadmin) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Settings2 className="h-6 w-6 text-brand" aria-hidden="true" />
          <h1 className="text-2xl font-semibold text-primary">{t('companies.settingsPageTitle')}</h1>
        </div>
        <p className="text-sm text-secondary">{t('companies.settingsNoCompany')}</p>
      </div>
    );
  }

  if (!companyId && isSuperadmin) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Settings2 className="h-6 w-6 text-brand" aria-hidden="true" />
          <h1 className="text-2xl font-semibold text-primary">{t('companies.settingsPageTitle')}</h1>
        </div>
        {companySelector}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Settings2 className="h-6 w-6 text-brand" aria-hidden="true" />
          <h1 className="text-2xl font-semibold text-primary">{t('companies.settingsPageTitle')}</h1>
        </div>
        <p className="text-sm text-muted">{t('companies.settingsLoading')}</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Settings2 className="h-6 w-6 text-brand" aria-hidden="true" />
          <h1 className="text-2xl font-semibold text-primary">{t('companies.settingsPageTitle')}</h1>
        </div>
        <div className="rounded-lg border border-default bg-danger-subtle px-4 py-3 text-sm text-danger">
          {t('companies.settingsError')}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-3">
          <Settings2 className="h-6 w-6 text-brand" aria-hidden="true" />
          <h1 className="text-2xl font-semibold text-primary">{t('companies.settingsPageTitle')}</h1>
        </div>
        <p className="mt-1 text-sm text-muted">{t('companies.membersSubtitle')}</p>
      </div>

      {/* Tab navigation */}
      <nav className="flex flex-wrap gap-2" aria-label={t('companies.settingsPageTitle')}>
        <span
          className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white"
          aria-current="page"
        >
          <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
          {t('companies.generalSettings')}
        </span>
        <Link
          to={`/company/settings/members${companyId ? `?company=${companyId}` : ''}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-default px-4 py-1.5 text-sm text-secondary hover:bg-hover"
        >
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          {t('companies.membersTitle')}
        </Link>
        <Link
          to={`/company/settings/onboarding${companyId ? `?company=${companyId}` : ''}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-default px-4 py-1.5 text-sm text-secondary hover:bg-hover"
        >
          <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
          {t('companies.onboardingTemplatesLink')}
        </Link>
        <Link
          to={`/company/settings/onboarding/team${companyId ? `?company=${companyId}` : ''}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-default px-4 py-1.5 text-sm text-secondary hover:bg-hover"
        >
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          {t('companies.teamOnboardingTab')}
        </Link>
      </nav>

      {/* Superadmin company selector */}
      {isSuperadmin && companySelector}

      {/* Alert banners */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-default bg-danger-subtle px-4 py-3 text-sm text-danger"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-lg border border-default bg-success-subtle px-4 py-3 text-sm text-success"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{success}</span>
        </div>
      )}

      {/* Section: HR & Brand */}
      <section className="space-y-5 rounded-xl border border-default bg-surface p-6">
        <h2 className="pb-4 mb-4 border-b border-default text-base font-semibold text-primary">
          {t('companies.hrBrand')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="vacation-days">
              {t('companies.vacationDays')}
            </label>
            <input
              id="vacation-days"
              type="number"
              min={0}
              value={vacationDays}
              onChange={(e) => setVacationDays(e.target.value)}
              className={inputClass}
            />
          </div>
          {isPremium && (
            <div>
              <label className={labelClass} htmlFor="brand-color">
                {t('companies.brandColor')}
              </label>
              <div className="mt-1 flex items-center gap-3">
                <input
                  id="brand-color"
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-default bg-surface p-0.5"
                />
                <span className="text-sm font-mono text-secondary">{brandColor}</span>
              </div>
            </div>
          )}
        </div>
        <div className="rounded-lg border border-default bg-raised p-3">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={onboardingEnabled}
              onChange={(e) => setOnboardingEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-default accent-brand"
            />
            <span className="text-sm font-medium text-primary">{t('announcements.enableOnboarding')}</span>
          </label>
        </div>
      </section>

      {/* Section: Working hours & Categories */}
      <section className="space-y-5 rounded-xl border border-default bg-surface p-6">
        <h2 className="pb-4 mb-4 border-b border-default text-base font-semibold text-primary">
          {t('companies.workHours')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="work-start">
              {t('companies.workStart')}
            </label>
            <input
              id="work-start"
              type="time"
              value={workStart}
              onChange={(e) => setWorkStart(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="work-end">
              {t('companies.workEnd')}
            </label>
            <input
              id="work-end"
              type="time"
              value={workEnd}
              onChange={(e) => setWorkEnd(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label className={labelClass} htmlFor="custom-categories">
            {t('companies.customCategories')}
          </label>
          <textarea
            id="custom-categories"
            rows={5}
            value={categoriesText}
            onChange={(e) => setCategoriesText(e.target.value)}
            className={inputClass}
            placeholder={t('companies.customCategoriesPlaceholder')}
          />
        </div>
      </section>

      {/* Section: CRM Labels */}
      <section className="space-y-4 rounded-xl border border-default bg-surface p-6">
        <h2 className="pb-4 mb-4 border-b border-default text-base font-semibold text-primary">
          {t('companies.crmLabels')}
        </h2>

        <div className="space-y-2">
          {(crmLabels ?? []).map((label) => (
            <div
              key={label.id}
              className="flex items-center gap-3 rounded-lg border border-default bg-raised px-3 py-2"
            >
              <span
                className="h-4 w-4 shrink-0 rounded"
                style={{ backgroundColor: label.color }}
                aria-hidden="true"
              />
              <span className="flex-1 truncate text-sm text-primary">{label.name}</span>
              <span className="font-mono text-xs text-muted">{label.color}</span>
              <button
                type="button"
                onClick={() => deleteLabelMutation.mutate(label.id)}
                disabled={deleteLabelMutation.isPending}
                className={cn(
                  'inline-flex items-center justify-center rounded-lg border border-default p-1.5',
                  'text-danger hover:bg-danger-subtle disabled:opacity-50',
                )}
                aria-label={t('companies.labelDeleteAria', { name: label.name })}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
          {(crmLabels ?? []).length === 0 && (
            <p className="text-sm text-muted">{t('companies.noLabels')}</p>
          )}
        </div>

        <form
          className="grid gap-2 sm:grid-cols-[1fr_160px_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = newLabelName.trim();
            if (!trimmed || createLabelMutation.isPending) return;
            createLabelMutation.mutate({ name: trimmed, color: newLabelColor });
          }}
        >
          <input
            type="text"
            value={newLabelName}
            onChange={(e) => setNewLabelName(e.target.value)}
            placeholder={t('companies.labelNamePlaceholder')}
            className="rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
          />
          <input
            type="text"
            value={newLabelColor}
            onChange={(e) => setNewLabelColor(e.target.value)}
            placeholder="#6366F1"
            className="rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
          />
          <button
            type="submit"
            disabled={!newLabelName.trim() || createLabelMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {createLabelMutation.isPending ? t('common.creating') : t('companies.addLabel')}
          </button>
        </form>

        {createLabelMutation.isError && (
          <p className="text-xs text-danger">{t('companies.labelCreateError')}</p>
        )}
      </section>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            setSuccess(null);
            setError(null);
            saveMutation.mutate();
          }}
          disabled={saveMutation.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {saveMutation.isPending ? t('common.savingPlain') : t('companies.saveSettings')}
        </button>
      </div>
    </div>
  );
}
