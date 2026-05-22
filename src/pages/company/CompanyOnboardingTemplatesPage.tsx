import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Save, ListChecks, Pencil, Trash2, Star } from 'lucide-react';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
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

export default function CompanyOnboardingTemplatesPage() {
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
        throw new Error('Введите название шаблона.');
      }
      if (payload.steps.length === 0) {
        throw new Error('Добавьте хотя бы один шаг.');
      }

      if (editingTemplateId) {
        await apiClient.patch(API.onboarding.template(editingTemplateId), payload);
        return 'Шаблон обновлён.';
      }

      await apiClient.post(templatesUrl, payload);
      return 'Шаблон создан.';
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
      return 'Шаблон удалён.';
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
      setSuccess('Шаблон по умолчанию обновлён.');
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
    <section className="rounded-xl border border-default bg-surface/50 p-4">
      <label className="block text-sm font-medium text-secondary" htmlFor="company-select-onboarding">
        Компания
      </label>
      <select
        id="company-select-onboarding"
        value={selectedCompanyId}
        onChange={(e) => setSelectedCompanyId(e.target.value)}
        className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
      >
        <option value="">Выберите компанию</option>
        {(companiesData?.results ?? []).map((company) => (
          <option key={company.id} value={String(company.id)}>
            {company.name}
          </option>
        ))}
      </select>
    </section>
  ) : null;

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center gap-2">
        <ListChecks className="h-5 w-5 text-brand" aria-hidden="true" />
        <h1 className="text-2xl font-semibold text-primary">Шаблоны онбординга</h1>
      </div>

      {companySelector}

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

      {isSuperadmin && !companyId ? (
        <p className="text-sm text-secondary">Выберите компанию, чтобы управлять шаблонами онбординга.</p>
      ) : (
        <>
          <section className="rounded-xl border border-default bg-surface/50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-primary">
                {editingTemplateId ? 'Редактирование шаблона' : 'Новый шаблон'}
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
                  Сбросить
                </button>
              )}
            </div>

            <div className="space-y-4">
              <label className="block text-sm text-secondary">
                Название шаблона
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-primary"
                  placeholder="Employee onboarding"
                />
              </label>

              <div className="space-y-3">
                {form.steps.map((step, index) => (
                  <div key={index} className="rounded-lg border border-default bg-surface p-4">
                    <p className="mb-2 text-xs uppercase tracking-wide text-muted">Шаг {index + 1}</p>
                    <div className="grid gap-3">
                      <input
                        type="text"
                        value={step.title}
                        onChange={(event) => updateStep(index, { title: event.target.value })}
                        className="rounded-lg border border-default bg-page px-3 py-2 text-sm text-primary"
                        placeholder="Название шага"
                      />
                      <textarea
                        value={step.description}
                        onChange={(event) => updateStep(index, { description: event.target.value })}
                        rows={3}
                        className="rounded-lg border border-default bg-page px-3 py-2 text-sm text-primary"
                        placeholder="Описание шага"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeStep(index)}
                          disabled={form.steps.length === 1}
                          className="rounded-lg border border-red-200 dark:border-red-800 bg-danger-subtle px-3 py-1.5 text-xs text-danger disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Удалить шаг
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={addStep}
                  className="inline-flex items-center gap-1 rounded-lg border border-default px-3 py-2 text-sm text-secondary hover:bg-hover"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Добавить шаг
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccess(null);
                    saveMutation.mutate();
                  }}
                  disabled={saveMutation.isPending}
                  className="inline-flex items-center gap-1 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
                >
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {saveMutation.isPending ? 'Сохранение...' : editingTemplateId ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-default bg-surface/50 p-6">
            <h2 className="mb-4 text-base font-semibold text-primary">Существующие шаблоны</h2>
            {templatesQuery.isLoading && <p className="text-sm text-secondary">Загрузка шаблонов...</p>}
            {templatesQuery.isError && (
              <p className="text-sm text-red-400">Не удалось загрузить шаблоны онбординга.</p>
            )}
            {!templatesQuery.isLoading && !templates.length && (
              <p className="text-sm text-muted">Шаблоны пока не созданы.</p>
            )}
            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`rounded-lg border bg-surface p-4 ${template.is_default ? 'border-brand/50' : 'border-default'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-primary">{template.name}</p>
                        {template.is_default && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-subtle px-2 py-0.5 text-xs font-medium text-brand">
                            <Star className="h-3 w-3" aria-hidden="true" />
                            По умолчанию
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-secondary">
                        {template.steps.length} {template.steps.length === 1 ? 'шаг' : 'шагов'}
                        {' · '}
                        {template.is_active ? 'активный' : 'неактивный'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {template.is_active && !template.is_default && (
                        <button
                          type="button"
                          disabled={setDefaultMutation.isPending}
                          onClick={() => {
                            setError(null);
                            setSuccess(null);
                            setDefaultMutation.mutate(template.id);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-default px-3 py-1.5 text-xs text-secondary hover:border-brand/50 hover:bg-brand-subtle hover:text-brand disabled:opacity-50"
                          aria-label={`Сделать шаблон «${template.name}» шаблоном по умолчанию`}
                        >
                          <Star className="h-3.5 w-3.5" aria-hidden="true" />
                          Сделать дефолтным
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => startEditing(template)}
                        className="inline-flex items-center gap-1 rounded-lg border border-default px-3 py-1.5 text-xs text-secondary hover:bg-hover"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        Изменить
                      </button>
                      <button
                        type="button"
                        disabled={deleteMutation.isPending}
                        onClick={() => setTemplatePendingDelete({ id: template.id, name: template.name })}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 dark:border-red-800 bg-danger-subtle px-3 py-1.5 text-xs text-danger hover:bg-danger-subtle disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Удалить
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
        title="Удалить шаблон?"
        description={
          templatePendingDelete
            ? `Шаблон «${templatePendingDelete.name}» будет удалён без возможности восстановления.`
            : ''
        }
        variant="danger"
        confirmLabel="Удалить"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
