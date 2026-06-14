import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import {
  Plus,
  Save,
  ListChecks,
  Pencil,
  Trash2,
  Star,
  Settings2,
  Users,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Lock,
  X,
  Check,
} from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { useOnboardingTemplates } from '@/pages/company/hooks/useOnboardingTemplates';

const inputClass =
  'mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand';
const labelClass = 'block text-sm font-medium text-secondary';

export default function CompanyOnboardingTemplatesPage() {
  const { t } = useTranslation();
  const {
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
    companiesData,
    templates,
    editedSteps,
    templatesQuery,
    templateStepsQuery,
    deleteMutation,
    deleteStepMutation,
    createTemplateMutation,
    saveTemplateNameMutation,
    addStepMutation,
    saveStepMutation,
    setDefaultMutation,
    setSelectedCompanyId,
    setForm,
    setEditingTemplateName,
    setEditingStepState,
    setTemplatePendingDelete,
    setStepPendingDelete,
    startEditingTemplate,
    cancelEditingTemplate,
    startEditingStep,
    handleCreateTemplate,
    handleSaveTemplateName,
    handleAddStep,
    handleSaveStep,
    handleDeleteTemplate,
    handleSetDefault,
    handleDeleteStep,
  } = useOnboardingTemplates();

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
        <Link
          to={`/company/settings/onboarding/team${companyId ? `?company=${companyId}` : ''}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-default px-4 py-1.5 text-sm text-secondary hover:bg-hover"
        >
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          {t('companies.teamOnboardingTab')}
        </Link>
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
      ) : editingTemplateId !== null ? (
        /* ── Edit mode: template name + step management via nested endpoint ── */
        <section className="rounded-xl border border-default bg-surface p-6 space-y-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-primary">{t('companies.editTemplate')}</h2>
            <button
              type="button"
              onClick={cancelEditingTemplate}
              className="rounded-lg border border-default px-3 py-1.5 text-xs text-secondary hover:bg-hover"
            >
              {t('common.cancel')}
            </button>
          </div>

          {/* Template name */}
          <div>
            <label className={labelClass} htmlFor="edit-template-name">
              {t('companies.templateName')}
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="edit-template-name"
                type="text"
                value={editingTemplateName}
                onChange={(e) => setEditingTemplateName(e.target.value)}
                className="flex-1 rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                placeholder={t('companies.templateNamePlaceholder')}
              />
              <button
                type="button"
                onClick={handleSaveTemplateName}
                disabled={saveTemplateNameMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                {saveTemplateNameMutation.isPending ? t('common.savingPlain') : t('common.save')}
              </button>
            </div>
          </div>

          {/* Steps */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-secondary">{t('companies.stepsTitle')}</h3>

            {templateStepsQuery.isLoading && (
              <p className="text-sm text-muted">{t('companies.stepsLoading')}</p>
            )}

            <div className="space-y-2">
              {editedSteps
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((step) => {
                  const isEditing = editingStepId === step.id;

                  if (step.is_system) {
                    return (
                      <div
                        key={step.id}
                        className="flex items-start gap-3 rounded-lg border border-default bg-raised/50 px-4 py-3 opacity-70"
                        aria-label={t('companies.systemStepAria', { title: step.title })}
                      >
                        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-secondary">{step.title}</p>
                          {step.description && (
                            <p className="mt-0.5 text-xs text-muted">{step.description}</p>
                          )}
                          {step.url && (
                            <p className="mt-0.5 text-xs text-muted truncate">
                              {t('companies.stepLinkUrl')}: {step.url}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 rounded-full bg-muted/20 px-2 py-0.5 text-xs text-muted">
                          {t('companies.systemStep')}
                        </span>
                      </div>
                    );
                  }

                  if (isEditing) {
                    return (
                      <div
                        key={step.id}
                        className="rounded-lg border border-brand/30 bg-surface p-4 space-y-3"
                      >
                        <input
                          type="text"
                          value={editingStepState.title}
                          onChange={(e) =>
                            setEditingStepState((prev) => ({ ...prev, title: e.target.value }))
                          }
                          className="w-full rounded-lg border border-default bg-raised px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                          placeholder={t('companies.stepTitle')}
                        />
                        <textarea
                          value={editingStepState.description}
                          onChange={(e) =>
                            setEditingStepState((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                          rows={2}
                          className="w-full rounded-lg border border-default bg-raised px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                          placeholder={t('companies.stepDescription')}
                        />
                        <input
                          type="url"
                          value={editingStepState.url}
                          onChange={(e) =>
                            setEditingStepState((prev) => ({ ...prev, url: e.target.value }))
                          }
                          className="w-full rounded-lg border border-default bg-raised px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                          placeholder={t('companies.stepLinkUrlPlaceholder')}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveStep(step.id)}
                            disabled={saveStepMutation.isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                          >
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            {t('common.save')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingStepState({ title: '', description: '', url: '' })}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-default px-3 py-1.5 text-xs text-secondary hover:bg-hover"
                          >
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                            {t('common.cancel')}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={step.id}
                      className="flex items-start gap-3 rounded-lg border border-default bg-surface px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-primary">{step.title}</p>
                        {step.description && (
                          <p className="mt-0.5 text-xs text-secondary">{step.description}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <button
                          type="button"
                          onClick={() => startEditingStep(step)}
                          className="inline-flex items-center gap-1 rounded-lg border border-default px-2.5 py-1.5 text-xs text-secondary hover:bg-hover"
                          aria-label={t('companies.editStepAria', { title: step.title })}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          {t('companies.editTemplateBtn')}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setStepPendingDelete({ id: step.id, title: step.title })
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-default bg-danger-subtle px-2.5 py-1.5 text-xs text-danger hover:opacity-80"
                          aria-label={t('companies.deleteStepAria', { title: step.title })}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          {t('common.delete')}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>

            <button
              type="button"
              onClick={handleAddStep}
              disabled={addStepMutation.isPending}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-default px-3 py-2 text-sm text-secondary hover:bg-hover disabled:opacity-50"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t('companies.addStep')}
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* Create template form */}
          <section className="rounded-xl border border-default bg-surface p-6">
            <div className="mb-5">
              <h2 className="text-base font-semibold text-primary">
                {t('companies.createTemplateTitle')}
              </h2>
              <p className="mt-1 text-sm text-secondary">{t('companies.createTemplateHint')}</p>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="sr-only" htmlFor="template-name">
                  {t('companies.templateName')}
                </label>
                <input
                  id="template-name"
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateTemplate();
                  }}
                  className={inputClass}
                  placeholder={t('companies.templateNamePlaceholder')}
                />
              </div>
              <button
                type="button"
                onClick={handleCreateTemplate}
                disabled={createTemplateMutation.isPending}
                className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {createTemplateMutation.isPending
                  ? t('common.savingPlain')
                  : t('companies.createTemplateBtn')}
              </button>
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
                          onClick={() => handleSetDefault(template.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-default px-3 py-1.5 text-xs text-secondary hover:border-brand/50 hover:bg-brand-subtle hover:text-brand disabled:opacity-50"
                          aria-label={t('companies.setDefaultAria', { name: template.name })}
                        >
                          <Star className="h-3.5 w-3.5" aria-hidden="true" />
                          {t('companies.setDefault')}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => startEditingTemplate(template)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-default px-3 py-1.5 text-xs text-secondary hover:bg-hover"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('companies.editTemplateBtn')}
                      </button>
                      <button
                        type="button"
                        disabled={deleteMutation.isPending || templates.length <= 1}
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

      {/* Delete template modal */}
      <ConfirmModal
        isOpen={templatePendingDelete !== null}
        onClose={() => !deleteMutation.isPending && setTemplatePendingDelete(null)}
        onConfirm={() => {
          if (!templatePendingDelete) return;
          handleDeleteTemplate(templatePendingDelete.id);
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

      {/* Delete step modal */}
      <ConfirmModal
        isOpen={stepPendingDelete !== null}
        onClose={() => !deleteStepMutation.isPending && setStepPendingDelete(null)}
        onConfirm={handleDeleteStep}
        title={t('companies.deleteStepModal')}
        description={
          stepPendingDelete
            ? t('companies.deleteStepDesc', { title: stepPendingDelete.title })
            : ''
        }
        variant="danger"
        confirmLabel={t('common.delete')}
        isLoading={deleteStepMutation.isPending}
      />
    </div>
  );
}
