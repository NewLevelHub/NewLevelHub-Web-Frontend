import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Save, ListChecks, Pencil, Trash2, Star, Settings2, Users, AlertCircle, CheckCircle2, ClipboardList } from 'lucide-react';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { cn } from '@/shared/lib/cn';
import { companiesCacheRoot } from '@/shared/lib/companyQueryKeys';
import { getApiError } from '@/shared/lib/getApiError';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import type { Company, OnboardingTemplate, OnboardingTemplateStepInput, PaginatedResponse } from '@/shared/types';

interface TemplatesApiResponse {
  results?: OnboardingTemplate[];
}

interface TemplateFormState {
  name: string;
  steps: OnboardingTemplateStepInput[];
}

function getInitialState(): TemplateFormState {
  return {
    name: '',
    steps: [{ title: '', description: '', order: 1 }],
  };
}

function normalizeSteps(steps: OnboardingTemplateStepInput[]): OnboardingTemplateStepInput[] {
  return steps.map((step, index) => ({
    title: step.title.trim(),
    description: step.description.trim(),
    order: index + 1,
  }));
}

const inputClass =
  'mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand';
const labelClass = 'block text-sm font-medium text-secondary';

export default function CompanyOnboardingTemplatesPage() {
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

  const [form, setForm] = useState<TemplateFormState>(getInitialState);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [templatePendingDelete, setTemplatePendingDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const { data: companiesData } = useQuery({
    queryKey: [...companiesCacheRoot(user?.id), 'list'],
    enabled: isSuperadmin,
    queryFn: () =>
      apiClient.get<PaginatedResponse<Company>>(API.companies.list).then((r) => r.data),
  });

  const templatesUrl =
    isSuperadmin && companyId
      ? `${API.onboarding.templates}?company_id=${companyId}`
      : API.onboarding.templates;

  const templatesQuery = useQuery({
    queryKey: ['onboarding-templates', companyId],
    enabled: !isSuperadmin || Boolean(companyId),
    queryFn: async () => {
      const response = await apiClient.get<OnboardingTemplate[] | TemplatesApiResponse>(templatesUrl);
      if (Array.isArray(response.data)) {
        return response.data;
      }
      return response.data.results ?? [];
    },
  });

  const templates = templatesQuery.data ?? [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        steps: normalizeSteps(form.steps).filter((step) => step.title.length > 0),
      };
      if (!payload.name) {
        throw new Error(t('companies.templateNameRequired'));
      }
      if (payload.steps.length === 0) {
        throw new Error(t('companies.templateStepRequired'));
      }

      if (editingTemplateId) {
        await apiClient.patch(API.onboarding.template(editingTemplateId), payload);
        return t('companies.templateUpdated');
      }

      await apiClient.post(templatesUrl, payload);
      return t('companies.templateCreated');
    },
    onSuccess: async (message) => {
      setError(null);
      setSuccess(message);
      setEditingTemplateId(null);
      setForm(getInitialState());
      await queryClient.invalidateQueries({ queryKey: ['onboarding-templates'] });
    },
    onError: (mutationError: unknown) => {
      setSuccess(null);
      setError(getApiError(mutationError).message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (templateId: number) => {
      await apiClient.delete(API.onboarding.template(templateId));
      return t('companies.templateDeleted');
    },
    onSuccess: async (message, templateId) => {
      setError(null);
      setSuccess(message);
      if (editingTemplateId === templateId) {
        setEditingTemplateId(null);
        setForm(getInitialState());
      }
      await queryClient.invalidateQueries({ queryKey: ['onboarding-templates'] });
    },
    onError: (mutationError: unknown) => {
      setSuccess(null);
      setError(getApiError(mutationError).message);
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (templateId: number) =>
      apiClient.post<OnboardingTemplate>(API.onboarding.templateSetDefault(templateId)).then((r) => r.data),
    onSuccess: async () => {
      setError(null);
      setSuccess(t('companies.templateDefaultUpdated'));
      await queryClient.invalidateQueries({ queryKey: ['onboarding-templates'] });
    },
    onError: (mutationError: unknown) => {
      setSuccess(null);
      setError(getApiError(mutationError).message);
    },
  });

  const startEditing = (template: OnboardingTemplate) => {
    setEditingTemplateId(template.id);
    setError(null);
    setSuccess(null);
    setForm({
      name: template.name,
      steps: template.steps
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((step, index) => ({
          title: step.title,
          description: step.description,
          order: index + 1,
        })),
    });
  };

  const addStep = () => {
    setForm((prev) => ({
      ...prev,
      steps: [...prev.steps, { title: '', description: '', order: prev.steps.length + 1 }],
    }));
  };

  const removeStep = (indexToRemove: number) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps
        .filter((_, index) => index !== indexToRemove)
        .map((step, index) => ({ ...step, order: index + 1 })),
    }));
  };

  const updateStep = (indexToUpdate: number, patch: Partial<OnboardingTemplateStepInput>) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.map((step, index) =>
        index === indexToUpdate ? { ...step, ...patch } : step,
      ),
    }));
  };

  const companySelector = isSuperadmin ? (
    <section className="rounded-xl border border-default bg-surface p-4">
      <label className={labelClass} htmlFor="company-select-onboarding">
        {t('common.company')}
      </label>
      <select
        id="company-select-onboarding"
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
  ) : null;

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-3">
          <ListChecks className="h-6 w-6 text-brand" aria-hidden="true" />
          <h1 className="text-2xl font-semibold text-primary">{t('companies.onboardingTitle')}</h1>
        </div>
      </div>

      {/* Tab navigation */}
      <nav className="flex flex-wrap gap-2" aria-label={t('companies.onboardingTitle')}>
        <Link
          to={`/company/settings${companyId ? `?company=${companyId}` : ''}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-default px-4 py-1.5 text-sm text-secondary hover:bg-hover"
        >
          <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
          {t('companies.generalSettings')}
        </Link>
        <Link
          to={`/company/settings/members${companyId ? `?company=${companyId}` : ''}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-default px-4 py-1.5 text-sm text-secondary hover:bg-hover"
        >
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          {t('companies.membersTitle')}
        </Link>
        <span
          className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white"
          aria-current="page"
        >
          <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
          {t('companies.onboardingTemplatesLink')}
        </span>
      </nav>

      {/* Superadmin company selector */}
      {companySelector}

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

      {isSuperadmin && !companyId ? (
        <section className="rounded-xl border border-default bg-surface p-6">
          <p className="text-sm text-secondary">{t('companies.selectCompanyForTemplates')}</p>
        </section>
      ) : (
        <>
          {/* Template form */}
          <section className="rounded-xl border border-default bg-surface p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-primary">
                {editingTemplateId ? t('companies.editTemplate') : t('common.newTemplate')}
              </h2>
              {editingTemplateId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTemplateId(null);
                    setForm(getInitialState());
                    setError(null);
                    setSuccess(null);
                  }}
                  className="rounded-lg border border-default px-3 py-1.5 text-xs text-secondary hover:bg-hover"
                >
                  {t('common.reset')}
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelClass} htmlFor="template-name">
                  {t('companies.templateName')}
                </label>
                <input
                  id="template-name"
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  className={inputClass}
                  placeholder={t('companies.templateNamePlaceholder')}
                />
              </div>

              <div className="space-y-3">
                {form.steps.map((step, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-default bg-raised p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white shrink-0">
                          {index + 1}
                        </span>
                        <span className="text-xs font-medium text-muted">
                          {t('companies.stepLabel', { number: index + 1 })}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeStep(index)}
                        disabled={form.steps.length === 1}
                        className="rounded-lg border border-default bg-danger-subtle px-3 py-1.5 text-xs text-danger disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {t('companies.removeStep')}
                      </button>
                    </div>
                    <div className="grid gap-3">
                      <input
                        type="text"
                        value={step.title}
                        onChange={(event) => updateStep(index, { title: event.target.value })}
                        className="rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                        placeholder={t('companies.stepTitle')}
                      />
                      <textarea
                        value={step.description}
                        onChange={(event) => updateStep(index, { description: event.target.value })}
                        rows={3}
                        className="rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                        placeholder={t('companies.stepDescription')}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={addStep}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-default px-3 py-2 text-sm text-secondary hover:bg-hover"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {t('companies.addStep')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccess(null);
                    saveMutation.mutate();
                  }}
                  disabled={saveMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {saveMutation.isPending
                    ? t('common.savingPlain')
                    : editingTemplateId
                      ? t('common.save')
                      : t('common.create')}
                </button>
              </div>
            </div>
          </section>

          {/* Existing templates */}
          <section className="rounded-xl border border-default bg-surface p-6">
            <h2 className="mb-5 text-base font-semibold text-primary">
              {t('companies.existingTemplates')}
            </h2>

            {templatesQuery.isLoading && (
              <p className="text-sm text-muted">{t('companies.templatesLoading')}</p>
            )}
            {templatesQuery.isError && (
              <div className="rounded-lg border border-default bg-danger-subtle px-4 py-3 text-sm text-danger">
                {t('companies.templatesError')}
              </div>
            )}
            {!templatesQuery.isLoading && !templates.length && (
              <div className="flex flex-col items-center justify-center py-12">
                <ClipboardList className="mb-3 h-10 w-10 text-muted" aria-hidden="true" />
                <p className="text-sm font-medium text-secondary">{t('companies.noTemplates')}</p>
              </div>
            )}

            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={cn(
                    'rounded-lg border bg-surface p-4',
                    template.is_default
                      ? 'border-brand/50 border-l-2 border-l-brand'
                      : 'border-default',
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-primary">{template.name}</p>
                        {template.is_default && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-subtle px-2 py-0.5 text-xs font-medium text-brand">
                            <Star className="h-3 w-3" aria-hidden="true" />
                            {t('companies.templateDefault')}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-secondary">
                        {template.steps.length === 1
                          ? t('companies.stepsCount', { count: template.steps.length })
                          : t('companies.stepsCountMany', { count: template.steps.length })}
                        {' · '}
                        {template.is_active
                          ? t('companies.templateActive')
                          : t('companies.templateInactive')}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {template.is_active && !template.is_default && (
                        <button
                          type="button"
                          disabled={setDefaultMutation.isPending}
                          onClick={() => {
                            setError(null);
                            setSuccess(null);
                            setDefaultMutation.mutate(template.id);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-default px-3 py-1.5 text-xs text-secondary hover:border-brand/50 hover:bg-brand-subtle hover:text-brand disabled:opacity-50"
                          aria-label={t('companies.setDefaultAria', { name: template.name })}
                        >
                          <Star className="h-3.5 w-3.5" aria-hidden="true" />
                          {t('companies.setDefault')}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => startEditing(template)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-default px-3 py-1.5 text-xs text-secondary hover:bg-hover"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('companies.editTemplateBtn')}
                      </button>
                      <button
                        type="button"
                        disabled={deleteMutation.isPending}
                        onClick={() =>
                          setTemplatePendingDelete({ id: template.id, name: template.name })
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-default bg-danger-subtle px-3 py-1.5 text-xs text-danger hover:opacity-80 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('common.delete')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <ConfirmModal
        isOpen={templatePendingDelete !== null}
        onClose={() => !deleteMutation.isPending && setTemplatePendingDelete(null)}
        onConfirm={() => {
          if (!templatePendingDelete) return;
          const { id } = templatePendingDelete;
          setError(null);
          setSuccess(null);
          deleteMutation.mutate(id, { onSettled: () => setTemplatePendingDelete(null) });
        }}
        title={t('companies.deleteTemplateModal')}
        description={
          templatePendingDelete
            ? t('companies.deleteTemplateDesc', { name: templatePendingDelete.name })
            : ''
        }
        variant="danger"
        confirmLabel={t('common.delete')}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
