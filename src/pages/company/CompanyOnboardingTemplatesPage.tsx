import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Save,
  Pencil,
  Trash2,
  Building,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  X,
  Check,
} from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { useOnboardingTemplates } from '@/pages/company/hooks/useOnboardingTemplates';

interface CompanyOnboardingTemplatesPageProps {
  hideNav?: boolean;
  companyId?: string;
}

export default function CompanyOnboardingTemplatesPage({ hideNav, companyId: propCompanyId }: CompanyOnboardingTemplatesPageProps = {}) {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

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
    setSelectedCompanyId,
    setForm,
    setEditingTemplateName,
    setEditingStepState,
    setTemplatePendingDelete,
    setStepPendingDelete,
    startEditingTemplate,
    cancelEditingTemplate,
    startEditingStep,
    cancelEditingStep,
    handleCreateTemplate,
    handleSaveTemplateName,
    handleAddStep,
    handleSaveStep,
    handleDeleteTemplate,
    handleDeleteStep,
  } = useOnboardingTemplates(propCompanyId);

  return (
    <div className="space-y-4">
      {/* Page header */}
      {!hideNav && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              {t('companies.onboardingTitle')}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                <Building size={13} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  aria-label={t('common.selectCompany')}
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
                <ChevronDown size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} aria-hidden="true" />
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowCreateForm((v) => !v)}
              className="inline-flex items-center gap-1.5 h-[34px] px-3 text-[13px] font-medium bg-[color:var(--brand)] text-white rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity"
            >
              <Plus size={13} aria-hidden="true" />
              {t('companies.createTemplateBtn')}
            </button>
          </div>
        </div>
      )}

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

      {/* Inline create form */}
      {showCreateForm && (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 20px',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 12,
            }}
          >
            {t('companies.createTemplateTitle')}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <label className="sr-only" htmlFor="template-name-inline">
              {t('companies.templateName')}
            </label>
            <input
              id="template-name-inline"
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && form.name.trim()) {
                  handleCreateTemplate();
                  setShowCreateForm(false);
                }
              }}
              placeholder={t('companies.templateNamePlaceholder')}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg-raised)',
                color: 'var(--text-primary)',
                fontSize: 13,
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={() => {
                handleCreateTemplate();
                setShowCreateForm(false);
              }}
              disabled={createTemplateMutation.isPending || !form.name.trim()}
              className="inline-flex items-center gap-1.5 h-[34px] px-3 text-[13px] font-medium bg-[color:var(--brand)] text-white rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Plus size={13} aria-hidden="true" />
              {t('companies.createTemplateBtn')}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              style={{
                padding: '0 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Guard: SA without selected company */}
      {isSuperadmin && !companyId ? (
        <section className="rounded-xl border border-default bg-surface p-6">
          <p className="text-sm text-secondary">{t('companies.selectCompanyForTemplates')}</p>
        </section>
      ) : editingTemplateId !== null ? (
        /* ── Edit mode ── */
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: '1px solid var(--border-faint)',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              {t('companies.editTemplate')}
            </span>
            <button
              type="button"
              onClick={cancelEditingTemplate}
              style={{
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--bg-raised)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <X size={12} aria-hidden="true" />
              {t('common.cancel')}
            </button>
          </div>

          {/* Template name field */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-faint)',
            }}
          >
            <label
              htmlFor="edit-template-name"
              style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}
            >
              {t('companies.templateName')}
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="edit-template-name"
                type="text"
                value={editingTemplateName}
                onChange={(e) => setEditingTemplateName(e.target.value)}
                placeholder={t('companies.templateNamePlaceholder')}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-raised)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={handleSaveTemplateName}
                disabled={saveTemplateNameMutation.isPending}
                style={{
                  padding: '0 14px',
                  height: 36,
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: 6,
                  border: 'none',
                  background: 'var(--brand)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  opacity: saveTemplateNameMutation.isPending ? 0.6 : 1,
                }}
              >
                <Save size={13} aria-hidden="true" />
                {saveTemplateNameMutation.isPending ? t('common.savingPlain') : t('common.save')}
              </button>
            </div>
          </div>

          {/* Steps section */}
          <div style={{ padding: '12px 16px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
              {t('companies.stepsTitle')}
            </div>

            {templateStepsQuery.isLoading && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('companies.stepsLoading')}</p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {editedSteps
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((step, i) => {
                  const isEditing = editingStepId === step.id;

                  if (isEditing) {
                    return (
                      <div
                        key={step.id}
                        style={{
                          background: 'var(--bg-raised)',
                          border: '1px solid var(--border)',
                          borderRadius: 7,
                          padding: '10px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}
                      >
                        <input
                          type="text"
                          value={editingStepState.title}
                          onChange={(e) =>
                            setEditingStepState((prev) => ({ ...prev, title: e.target.value }))
                          }
                          placeholder={t('companies.stepTitle')}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '7px 10px',
                            borderRadius: 6,
                            border: '1px solid var(--border)',
                            background: 'var(--bg-surface)',
                            color: 'var(--text-primary)',
                            fontSize: 13,
                            fontFamily: 'inherit',
                            outline: 'none',
                          }}
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
                          placeholder={t('companies.stepDescription')}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '7px 10px',
                            borderRadius: 6,
                            border: '1px solid var(--border)',
                            background: 'var(--bg-surface)',
                            color: 'var(--text-primary)',
                            fontSize: 13,
                            fontFamily: 'inherit',
                            outline: 'none',
                            resize: 'none',
                          }}
                        />
                        <input
                          type="url"
                          value={editingStepState.url}
                          onChange={(e) =>
                            setEditingStepState((prev) => ({ ...prev, url: e.target.value }))
                          }
                          placeholder={t('companies.stepLinkUrlPlaceholder')}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '7px 10px',
                            borderRadius: 6,
                            border: '1px solid var(--border)',
                            background: 'var(--bg-surface)',
                            color: 'var(--text-primary)',
                            fontSize: 13,
                            fontFamily: 'inherit',
                            outline: 'none',
                          }}
                        />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => handleSaveStep(step.id)}
                            disabled={saveStepMutation.isPending}
                            style={{
                              padding: '4px 10px',
                              fontSize: 12,
                              fontWeight: 500,
                              borderRadius: 6,
                              border: 'none',
                              background: 'var(--brand)',
                              color: '#fff',
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              opacity: saveStepMutation.isPending ? 0.6 : 1,
                            }}
                          >
                            <Check size={11} aria-hidden="true" />
                            {t('common.save')}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditingStep}
                            style={{
                              padding: '4px 10px',
                              fontSize: 12,
                              fontWeight: 500,
                              borderRadius: 6,
                              border: '1px solid var(--border)',
                              background: 'transparent',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <X size={11} aria-hidden="true" />
                            {t('common.cancel')}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={step.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 12px',
                        borderRadius: 7,
                        background: 'var(--bg-raised)',
                        border: '1px solid var(--border-faint)',
                      }}
                    >
                      {/* Step number circle */}
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          flexShrink: 0,
                          background: 'var(--brand-subtle)',
                          color: 'var(--brand-text)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                        aria-hidden="true"
                      >
                        {i + 1}
                      </div>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1 }}>
                        {step.title}
                      </span>
                      {step.description && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', flex: 2 }}>
                          {step.description}
                        </span>
                      )}
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => startEditingStep(step)}
                          aria-label={t('companies.editStepAria', { title: step.title })}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 5,
                            border: '1px solid var(--border)',
                            background: 'transparent',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Pencil size={11} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setStepPendingDelete({ id: step.id, title: step.title })}
                          aria-label={t('companies.deleteStepAria', { title: step.title })}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 5,
                            border: '1px solid var(--border)',
                            background: 'transparent',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                        >
                          <Trash2 size={11} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Add step */}
            <button
              type="button"
              onClick={handleAddStep}
              disabled={addStepMutation.isPending}
              style={{
                alignSelf: 'flex-start',
                marginTop: 8,
                padding: '5px 12px',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                opacity: addStepMutation.isPending ? 0.5 : 1,
              }}
            >
              <Plus size={12} aria-hidden="true" />
              {t('companies.addStep')}
            </button>
          </div>
        </div>
      ) : (
        /* ── Accordion list ── */
        <div>
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {templates.map((template) => {
              const isExpanded = expandedId === template.id;

              return (
                <div
                  key={template.id}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Card header — clickable to expand */}
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onClick={() => setExpandedId(isExpanded ? null : template.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpandedId(isExpanded ? null : template.id);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px 16px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {template.name}
                        {template.is_default && (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 10,
                              fontWeight: 600,
                              padding: '2px 7px',
                              borderRadius: 4,
                              background: 'var(--brand-subtle)',
                              color: 'var(--brand-text)',
                            }}
                          >
                            {t('companies.templateDefault')}
                          </span>
                        )}
                      </div>
                      <div
                        style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}
                      >
                        {template.steps.length === 1
                          ? t('companies.stepsCount', { count: template.steps.length })
                          : t('companies.stepsCountMany', { count: template.steps.length })}
                      </div>
                    </div>

                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditingTemplate(template);
                      }}
                      style={{
                        padding: '4px 10px',
                        fontSize: 12,
                        fontWeight: 500,
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-raised)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <Pencil size={12} aria-hidden="true" />
                      {t('companies.editTemplateBtn')}
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTemplatePendingDelete({ id: template.id, name: template.name });
                      }}
                      disabled={deleteMutation.isPending}
                      aria-label={t('companies.deleteTemplateModal')}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = 'var(--danger)')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = 'var(--text-muted)')
                      }
                    >
                      <Trash2 size={13} aria-hidden="true" />
                    </button>

                    {/* Chevron */}
                    <ChevronRight
                      size={14}
                      aria-hidden="true"
                      style={{
                        color: 'var(--text-muted)',
                        flexShrink: 0,
                        transform: isExpanded ? 'rotate(90deg)' : 'none',
                        transition: 'transform 0.15s',
                      }}
                    />
                  </div>

                  {/* Expanded steps */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: '0 16px 16px',
                        borderTop: '1px solid var(--border-faint)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          marginTop: 12,
                        }}
                      >
                        {template.steps.length === 0 && (
                          <p
                            className={cn('text-sm text-muted')}
                            style={{ padding: '8px 0' }}
                          >
                            {t('companies.noTemplates')}
                          </p>
                        )}
                        {template.steps
                          .slice()
                          .sort((a, b) => a.order - b.order)
                          .map((step, i) => (
                            <div
                              key={step.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '8px 12px',
                                borderRadius: 7,
                                background: 'var(--bg-raised)',
                                border: '1px solid var(--border-faint)',
                              }}
                            >
                              {/* Step number circle */}
                              <div
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: '50%',
                                  flexShrink: 0,
                                  background: 'var(--brand-subtle)',
                                  color: 'var(--brand-text)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 11,
                                  fontWeight: 700,
                                }}
                                aria-hidden="true"
                              >
                                {i + 1}
                              </div>
                              <span
                                style={{
                                  fontSize: 13,
                                  color: 'var(--text-secondary)',
                                  flex: 1,
                                }}
                              >
                                {step.title}
                              </span>
                              {/* Step actions */}
                              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditingTemplate(template);
                                    startEditingStep(step);
                                  }}
                                  aria-label={t('companies.editStepAria', { title: step.title })}
                                  style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: 5,
                                    border: '1px solid var(--border)',
                                    background: 'transparent',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <Pencil size={11} aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditingTemplate(template);
                                    setStepPendingDelete({ id: step.id, title: step.title });
                                  }}
                                  aria-label={t('companies.deleteStepAria', { title: step.title })}
                                  style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: 5,
                                    border: '1px solid var(--border)',
                                    background: 'transparent',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <Trash2 size={11} aria-hidden="true" />
                                </button>
                              </div>
                            </div>
                          ))}

                        {/* Add step */}
                        <button
                          type="button"
                          onClick={() => {
                            startEditingTemplate(template);
                          }}
                          style={{
                            alignSelf: 'flex-start',
                            marginTop: 4,
                            padding: '5px 12px',
                            fontSize: 12,
                            fontWeight: 500,
                            borderRadius: 6,
                            border: '1px solid var(--border)',
                            background: 'transparent',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          <Plus size={12} aria-hidden="true" />
                          {t('companies.addStep')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
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
