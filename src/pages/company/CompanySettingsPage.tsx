import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Settings2, Plus, Trash2 } from 'lucide-react';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { companiesCacheRoot } from '@/shared/lib/companyQueryKeys';
import { getApiError } from '@/shared/lib/getApiError';
import type { Company, CompanySettings, CrmLabel, PaginatedResponse } from '@/shared/types';

function normalizeTimeInput(value: string): string {
  return value.trim().slice(0, 5);
}

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
      setSuccess('Настройки сохранены.');
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
    <section className="rounded-xl border border-default bg-surface/50 p-4">
      <label className="block text-sm font-medium text-secondary" htmlFor="company-select-settings">{t('common.company')}</label>
      <select
        id="company-select-settings"
        value={selectedCompanyId}
        onChange={(e) => setSelectedCompanyId(e.target.value)}
        className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
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
      <div className="max-w-3xl space-y-2">
        <h1 className="text-2xl font-semibold text-primary">Настройки компании</h1>
        <p className="text-sm text-secondary">Профиль пользователя не привязан к компании.</p>
      </div>
    );
  }

  if (!companyId && isSuperadmin) {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-brand" aria-hidden="true" />
          <h1 className="text-2xl font-semibold text-primary">Настройки компании</h1>
        </div>
        {companySelector}
      </div>
    );
  }

  if (isLoading) {
    return <p className="text-sm text-secondary">Загрузка настроек...</p>;
  }

  if (isError || !data) {
    return <p className="text-sm text-red-400">Не удалось загрузить настройки компании.</p>;
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <Settings2 className="h-5 w-5 text-brand" aria-hidden="true" />
        <h1 className="text-2xl font-semibold text-primary">Настройки компании</h1>
      </div>
      {isSuperadmin && companySelector}
      <div className="flex flex-wrap gap-2">
        <Link
          to={`/company/settings/members${companyId ? `?company=${companyId}` : ''}`}
          className="rounded-lg border border-default px-3 py-1.5 text-xs text-secondary hover:bg-hover"
        >
          Перейти к инвайтам сотрудников
        </Link>
        <Link
          to={`/company/settings/onboarding${companyId ? `?company=${companyId}` : ''}`}
          className="rounded-lg border border-default px-3 py-1.5 text-xs text-secondary hover:bg-hover"
        >
          Шаблоны онбординга
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-900/40 bg-danger-subtle px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-900/70 bg-success-subtle px-4 py-3 text-sm text-success">
          {success}
        </div>
      )}

      <section className="space-y-5 rounded-xl border border-default bg-surface/50 p-6">
        <h2 className="text-base font-semibold text-primary">HR и бренд</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-secondary">
            Отпускных дней в год
            <input
              type="number"
              min={0}
              value={vacationDays}
              onChange={(e) => setVacationDays(e.target.value)}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-primary"
            />
          </label>
          <label className="block text-sm text-secondary">
            Бренд-цвет
            <input
              type="text"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-primary"
              placeholder="#6366F1"
            />
          </label>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-secondary">
          <input
            type="checkbox"
            checked={onboardingEnabled}
            onChange={(e) => setOnboardingEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-default bg-surface text-brand"
          />{t('announcements.enableOnboarding')}</label>
      </section>

      <section className="space-y-5 rounded-xl border border-default bg-surface/50 p-6">
        <h2 className="text-base font-semibold text-primary">Рабочие часы и категории</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-secondary">
            Начало рабочего дня
            <input
              type="time"
              value={workStart}
              onChange={(e) => setWorkStart(e.target.value)}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-primary"
            />
          </label>
          <label className="block text-sm text-secondary">
            Конец рабочего дня
            <input
              type="time"
              value={workEnd}
              onChange={(e) => setWorkEnd(e.target.value)}
              className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-primary"
            />
          </label>
        </div>
        <label className="block text-sm text-secondary">
          Кастомные категории задач (каждая с новой строки)
          <textarea
            rows={5}
            value={categoriesText}
            onChange={(e) => setCategoriesText(e.target.value)}
            className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-primary"
            placeholder={'Продажи\nРазработка\nПоддержка'}
          />
        </label>
      </section>

      <section className="space-y-4 rounded-xl border border-default bg-surface/50 p-6">
        <h2 className="text-base font-semibold text-primary">Кастомные лейблы CRM</h2>
        <div className="space-y-2">
          {(crmLabels ?? []).map((label) => (
            <div key={label.id} className="flex items-center gap-3 rounded-lg border border-default bg-raised px-3 py-2">
              <span
                className="h-4 w-4 shrink-0 rounded"
                style={{ backgroundColor: label.color }}
                aria-hidden="true"
              />
              <span className="flex-1 text-sm text-secondary truncate">{label.name}</span>
              <span className="text-xs text-muted font-mono">{label.color}</span>
              <button
                type="button"
                onClick={() => deleteLabelMutation.mutate(label.id)}
                disabled={deleteLabelMutation.isPending}
                className="inline-flex items-center justify-center rounded-lg border border-red-200 dark:border-red-800 bg-danger-subtle p-1.5 text-danger hover:bg-danger-subtle disabled:opacity-50"
                aria-label={`Удалить метку ${label.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
          {(crmLabels ?? []).length === 0 && (
            <p className="text-sm text-muted">Лейблы пока не добавлены.</p>
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
            placeholder="Название лейбла"
            className="rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
          />
          <input
            type="text"
            value={newLabelColor}
            onChange={(e) => setNewLabelColor(e.target.value)}
            placeholder="#6366F1"
            className="rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
          />
          <button
            type="submit"
            disabled={!newLabelName.trim() || createLabelMutation.isPending}
            className="inline-flex items-center gap-1 rounded-lg border border-default px-3 py-2 text-xs text-secondary hover:bg-hover disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {createLabelMutation.isPending ? '...' : 'Добавить'}
          </button>
        </form>
        {createLabelMutation.isError && (
          <p className="text-xs text-red-400">Не удалось создать лейбл.</p>
        )}
      </section>

      <button
        type="button"
        onClick={() => {
          setSuccess(null);
          setError(null);
          saveMutation.mutate();
        }}
        disabled={saveMutation.isPending}
        className="inline-flex items-center rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
      >
        {saveMutation.isPending ? t('common.savingPlain') : 'Сохранить настройки'}
      </button>
    </div>
  );
}
