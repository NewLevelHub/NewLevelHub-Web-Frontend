import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { companiesCacheRoot } from '@/shared/lib/companyQueryKeys';
import { getApiError } from '@/shared/lib/getApiError';
import type {
  Company,
  OnboardingTemplate,
  OnboardingTemplateStep,
  PaginatedResponse,
} from '@/shared/types';

interface TemplatesApiResponse {
  results?: OnboardingTemplate[];
}

export interface EditingStepState {
  title: string;
  description: string;
  url: string;
}

export function useOnboardingTemplates() {
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

  const [form, setForm] = useState({ name: '' });
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [editingTemplateName, setEditingTemplateName] = useState('');
  const [editingStepId, setEditingStepId] = useState<number | null>(null);
  const [editingStepState, setEditingStepState] = useState<EditingStepState>({
    title: '',
    description: '',
    url: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [templatePendingDelete, setTemplatePendingDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [stepPendingDelete, setStepPendingDelete] = useState<{
    id: number;
    title: string;
  } | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────

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

  const templateStepsQuery = useQuery({
    queryKey: ['onboarding-template-steps', editingTemplateId],
    enabled: editingTemplateId !== null,
    queryFn: () =>
      apiClient
        .get<OnboardingTemplateStep[]>(API.onboarding.templateSteps(editingTemplateId!))
        .then((r) => r.data),
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createTemplateMutation = useMutation({
    mutationFn: async () => {
      const name = form.name.trim();
      if (!name) throw new Error(t('companies.templateNameRequired'));
      const response = await apiClient.post<OnboardingTemplate>(templatesUrl, { name, steps: [] });
      return response.data;
    },
    onSuccess: async (newTemplate) => {
      setError(null);
      setForm({ name: '' });
      await queryClient.invalidateQueries({ queryKey: ['onboarding-templates'] });
      startEditingTemplate(newTemplate);
    },
    onError: (mutationError: unknown) => {
      setSuccess(null);
      setError(getApiError(mutationError).message);
    },
  });

  const saveTemplateNameMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const name = editingTemplateName.trim();
      if (!name) throw new Error(t('companies.templateNameRequired'));
      await apiClient.patch(API.onboarding.template(templateId), { name });
      return t('companies.templateUpdated');
    },
    onSuccess: async (message) => {
      setError(null);
      setSuccess(message);
      await queryClient.invalidateQueries({ queryKey: ['onboarding-templates'] });
    },
    onError: (mutationError: unknown) => {
      setSuccess(null);
      setError(getApiError(mutationError).message);
    },
  });

  const addStepMutation = useMutation({
    mutationFn: async (templateId: number) => {
      await apiClient.post(API.onboarding.templateSteps(templateId), {
        title: t('companies.newStepDefaultTitle'),
        description: '',
        order: (templateStepsQuery.data?.length ?? 0) + 1,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['onboarding-template-steps', editingTemplateId],
      });
    },
    onError: (mutationError: unknown) => {
      setError(getApiError(mutationError).message);
    },
  });

  const saveStepMutation = useMutation({
    mutationFn: async ({ templateId, stepId }: { templateId: number; stepId: number }) => {
      await apiClient.patch(API.onboarding.templateStep(templateId, stepId), {
        title: editingStepState.title.trim(),
        description: editingStepState.description.trim(),
        url: editingStepState.url.trim() || null,
      });
    },
    onSuccess: async () => {
      setEditingStepId(null);
      await queryClient.invalidateQueries({
        queryKey: ['onboarding-template-steps', editingTemplateId],
      });
    },
    onError: (mutationError: unknown) => {
      setError(getApiError(mutationError).message);
    },
  });

  const deleteStepMutation = useMutation({
    mutationFn: async ({ templateId, stepId }: { templateId: number; stepId: number }) => {
      await apiClient.delete(API.onboarding.templateStep(templateId, stepId));
    },
    onSuccess: async () => {
      setStepPendingDelete(null);
      await queryClient.invalidateQueries({
        queryKey: ['onboarding-template-steps', editingTemplateId],
      });
    },
    onError: (mutationError: unknown) => {
      setStepPendingDelete(null);
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
      apiClient
        .post<OnboardingTemplate>(API.onboarding.templateSetDefault(templateId))
        .then((r) => r.data),
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

  // ── Handlers ───────────────────────────────────────────────────────────────

  const startEditingTemplate = (template: OnboardingTemplate) => {
    setEditingTemplateId(template.id);
    setEditingTemplateName(template.name);
    setEditingStepId(null);
    setError(null);
    setSuccess(null);
  };

  const cancelEditingTemplate = () => {
    setEditingTemplateId(null);
    setEditingStepId(null);
    setError(null);
    setSuccess(null);
  };

  const startEditingStep = (step: OnboardingTemplateStep) => {
    setEditingStepId(step.id);
    setEditingStepState({
      title: step.title,
      description: step.description,
      url: step.url ?? '',
    });
  };

  const cancelEditingStep = () => {
    setEditingStepId(null);
    setEditingStepState({ title: '', description: '', url: '' });
  };

  const handleCreateTemplate = () => {
    setError(null);
    createTemplateMutation.mutate();
  };

  const handleSaveTemplateName = () => {
    if (editingTemplateId === null) return;
    setError(null);
    setSuccess(null);
    saveTemplateNameMutation.mutate(editingTemplateId);
  };

  const handleAddStep = () => {
    if (editingTemplateId === null) return;
    setError(null);
    addStepMutation.mutate(editingTemplateId);
  };

  const handleSaveStep = (stepId: number) => {
    if (editingTemplateId === null) return;
    setError(null);
    saveStepMutation.mutate({ templateId: editingTemplateId, stepId });
  };

  const handleDeleteTemplate = (id: number) => {
    setError(null);
    setSuccess(null);
    deleteMutation.mutate(id, { onSettled: () => setTemplatePendingDelete(null) });
  };

  const handleSetDefault = (templateId: number) => {
    setError(null);
    setSuccess(null);
    setDefaultMutation.mutate(templateId);
  };

  const handleDeleteStep = () => {
    if (!stepPendingDelete || editingTemplateId === null) return;
    deleteStepMutation.mutate({
      templateId: editingTemplateId,
      stepId: stepPendingDelete.id,
    });
  };

  return {
    // state
    isSuperadmin,
    companyId,
    selectedCompanyId,
    form,
    editingTemplateId,
    editingTemplateName,
    editingStepId,
    editingStepState,
    error,
    success,
    templatePendingDelete,
    stepPendingDelete,
    // data
    companiesData,
    templates: templatesQuery.data ?? [],
    editedSteps: templateStepsQuery.data ?? [],
    templatesQuery,
    templateStepsQuery,
    deleteMutation,
    deleteStepMutation,
    createTemplateMutation,
    saveTemplateNameMutation,
    addStepMutation,
    saveStepMutation,
    setDefaultMutation,
    // setters
    setSelectedCompanyId,
    setForm,
    setEditingTemplateName,
    setEditingStepState,
    setTemplatePendingDelete,
    setStepPendingDelete,
    // handlers
    startEditingTemplate,
    cancelEditingTemplate,
    startEditingStep,
    cancelEditingStep,
    handleCreateTemplate,
    handleSaveTemplateName,
    handleAddStep,
    handleSaveStep,
    handleDeleteTemplate,
    handleSetDefault,
    handleDeleteStep,
  };
}
