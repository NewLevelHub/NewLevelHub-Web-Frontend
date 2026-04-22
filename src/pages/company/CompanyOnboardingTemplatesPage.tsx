import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Save, ListChecks, Pencil, Trash2 } from 'lucide-react';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import type { OnboardingTemplate, OnboardingTemplateStepInput } from '@/shared/types';

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
  const [form, setForm] = useState<TemplateFormState>(getInitialState);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const templatesQuery = useQuery({
    queryKey: ['onboarding-templates'],
    queryFn: async () => {
      const response = await apiClient.get<OnboardingTemplate[] | TemplatesApiResponse>(API.onboarding.templates);
      if (Array.isArray(response.data)) {
        return response.data;
      }
      return response.data.results ?? [];
    },
  });

  const templates = templatesQuery.data ?? [];

  const activeTemplate = useMemo(
    () => templates.find((template) => template.is_active) ?? null,
    [templates],
  );

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

      await apiClient.post(API.onboarding.templates, payload);
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
      setError(getApiErrorMessage(mutationError, 'Не удалось сохранить шаблон онбординга.'));
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
      setError(getApiErrorMessage(mutationError, 'Не удалось удалить шаблон онбординга.'));
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

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center gap-2">
        <ListChecks className="h-5 w-5 text-indigo-400" aria-hidden="true" />
        <h1 className="text-2xl font-semibold text-white">Шаблоны онбординга</h1>
      </div>

      {error && (
        <div className="rounded-lg border border-red-900/70 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-900/70 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
          {success}
        </div>
      )}

      <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">
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
              className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-800"
            >
              Сбросить
            </button>
          )}
        </div>

        <div className="space-y-4">
          <label className="block text-sm text-gray-300">
            Название шаблона
            <input
              type="text"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white"
              placeholder="Employee onboarding"
            />
          </label>

          <div className="space-y-3">
            {form.steps.map((step, index) => (
              <div key={index} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
                <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">Шаг {index + 1}</p>
                <div className="grid gap-3">
                  <input
                    type="text"
                    value={step.title}
                    onChange={(event) => updateStep(index, { title: event.target.value })}
                    className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
                    placeholder="Название шага"
                  />
                  <textarea
                    value={step.description}
                    onChange={(event) => updateStep(index, { description: event.target.value })}
                    rows={3}
                    className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
                    placeholder="Описание шага"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeStep(index)}
                      disabled={form.steps.length === 1}
                      className="rounded-lg border border-red-800 bg-red-900/30 px-3 py-1.5 text-xs text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
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
              className="inline-flex items-center gap-1 rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-200 hover:bg-gray-800"
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
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {saveMutation.isPending ? 'Сохранение...' : editingTemplateId ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <h2 className="mb-4 text-base font-semibold text-white">Существующие шаблоны</h2>
        {templatesQuery.isLoading && <p className="text-sm text-gray-400">Загрузка шаблонов...</p>}
        {templatesQuery.isError && (
          <p className="text-sm text-red-400">Не удалось загрузить шаблоны онбординга.</p>
        )}
        {!templatesQuery.isLoading && !templates.length && (
          <p className="text-sm text-gray-500">Шаблоны пока не созданы.</p>
        )}
        <div className="space-y-3">
          {templates.map((template) => (
            <div key={template.id} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-white">{template.name}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {template.steps.length} шагов
                    {template.is_active ? ' · активный' : ' · неактивный'}
                    {activeTemplate?.id === template.id ? ' (используется по умолчанию)' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startEditing(template)}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-800"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    Изменить
                  </button>
                  <button
                    type="button"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      const isConfirmed = window.confirm(
                        `Удалить шаблон "${template.name}"? Это действие нельзя отменить.`,
                      );
                      if (!isConfirmed) return;
                      setError(null);
                      setSuccess(null);
                      deleteMutation.mutate(template.id);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-800 bg-red-900/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-900/50 disabled:opacity-50"
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
    </div>
  );
}
