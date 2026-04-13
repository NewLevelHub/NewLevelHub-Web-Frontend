import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Check } from 'lucide-react';
import { useSearchParams, Link } from 'react-router';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { useAuth } from '@/shared/hooks/useAuth';
import type { CompanySettings } from '@/shared/types';

// ─── Style tokens (matching project dark theme) ───────────────────────────────
const inputClass =
  'w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';
const labelClass = 'block text-sm font-medium text-gray-300 mb-1';
const btnPrimary =
  'inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50';
const btnGhost =
  'inline-flex items-center justify-center gap-1 rounded-lg border border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-gray-800 disabled:opacity-50';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'general' | 'tasks' | 'labels';

// Partial diff — only fields that differ from the original are sent
function diffSettings(
  original: CompanySettings,
  current: CompanySettings,
): Partial<CompanySettings> {
  const patch: Partial<CompanySettings> = {};

  if (current.vacation_days_per_year !== original.vacation_days_per_year) {
    patch.vacation_days_per_year = current.vacation_days_per_year;
  }
  if (current.onboarding_enabled !== original.onboarding_enabled) {
    patch.onboarding_enabled = current.onboarding_enabled;
  }
  if (current.brand_primary_color !== original.brand_primary_color) {
    patch.brand_primary_color = current.brand_primary_color;
  }

  // working_hours: compare as JSON strings for simplicity
  if (JSON.stringify(current.working_hours) !== JSON.stringify(original.working_hours)) {
    patch.working_hours = current.working_hours;
  }
  if (
    JSON.stringify(current.custom_task_categories) !==
    JSON.stringify(original.custom_task_categories)
  ) {
    patch.custom_task_categories = current.custom_task_categories;
  }
  if (JSON.stringify(current.custom_labels) !== JSON.stringify(original.custom_labels)) {
    patch.custom_labels = current.custom_labels;
  }

  return patch;
}

const HEX_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

// ─── Sub-components ───────────────────────────────────────────────────────────

interface FeedbackProps {
  success: boolean;
  error: string;
}

function SaveFeedback({ success, error }: FeedbackProps) {
  if (success) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-green-400">
        <Check className="h-4 w-4" />
        Настройки сохранены
      </span>
    );
  }
  if (error) {
    return <span className="text-sm text-red-400">{error}</span>;
  }
  return null;
}

// ─── Tab: General ─────────────────────────────────────────────────────────────

interface GeneralTabProps {
  settings: CompanySettings;
  isReadOnly: boolean;
  onSave: (patch: Partial<CompanySettings>) => void;
  isSaving: boolean;
  saveSuccess: boolean;
  saveError: string;
  originalSettings: CompanySettings;
}

function GeneralTab({
  settings,
  isReadOnly,
  onSave,
  isSaving,
  saveSuccess,
  saveError,
  originalSettings,
}: GeneralTabProps) {
  const [vacationDays, setVacationDays] = useState(settings.vacation_days_per_year);
  const [onboardingEnabled, setOnboardingEnabled] = useState(settings.onboarding_enabled);
  const [brandColor, setBrandColor] = useState(settings.brand_primary_color ?? '');
  const [whStart, setWhStart] = useState(settings.working_hours?.start ?? '');
  const [whEnd, setWhEnd] = useState(settings.working_hours?.end ?? '');
  const [validationError, setValidationError] = useState('');

  // Sync when settings prop changes (after fetch/refetch)
  useEffect(() => {
    setVacationDays(settings.vacation_days_per_year);
    setOnboardingEnabled(settings.onboarding_enabled);
    setBrandColor(settings.brand_primary_color ?? '');
    setWhStart(settings.working_hours?.start ?? '');
    setWhEnd(settings.working_hours?.end ?? '');
    setValidationError('');
  }, [settings]);

  function buildCurrentSettings(): CompanySettings {
    let working_hours: { start: string; end: string } | null = null;
    if (whStart && whEnd) {
      working_hours = { start: whStart, end: whEnd };
    }
    return {
      ...originalSettings,
      vacation_days_per_year: vacationDays,
      onboarding_enabled: onboardingEnabled,
      brand_primary_color: brandColor.trim() === '' ? null : brandColor.trim(),
      working_hours,
    };
  }

  function handleSave() {
    setValidationError('');

    // Validate working hours
    if ((whStart && !whEnd) || (!whStart && whEnd)) {
      setValidationError('Укажите и начало, и конец рабочего времени');
      return;
    }
    if (whStart && whEnd && whStart >= whEnd) {
      setValidationError('Начало рабочего времени должно быть раньше конца');
      return;
    }

    // Validate brand color
    const colorVal = brandColor.trim();
    if (colorVal !== '' && !HEX_REGEX.test(colorVal)) {
      setValidationError('Цвет бренда должен быть в формате HEX (например, #3b82f6)');
      return;
    }

    const current = buildCurrentSettings();
    const patch = diffSettings(originalSettings, current);
    onSave(patch);
  }

  const displayError = validationError || saveError;

  return (
    <div className="max-w-lg space-y-6">
      {/* Working hours */}
      <fieldset>
        <legend className="text-sm font-semibold text-gray-200 mb-3">Рабочие часы</legend>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="wh-start" className={labelClass}>
              Начало
            </label>
            <input
              id="wh-start"
              type="time"
              value={whStart}
              onChange={(e) => setWhStart(e.target.value)}
              disabled={isReadOnly}
              className={cn(inputClass, isReadOnly && 'opacity-60 cursor-not-allowed')}
            />
          </div>
          <div>
            <label htmlFor="wh-end" className={labelClass}>
              Конец
            </label>
            <input
              id="wh-end"
              type="time"
              value={whEnd}
              onChange={(e) => setWhEnd(e.target.value)}
              disabled={isReadOnly}
              className={cn(inputClass, isReadOnly && 'opacity-60 cursor-not-allowed')}
            />
          </div>
        </div>
      </fieldset>

      {/* Vacation days */}
      <div>
        <label htmlFor="vacation-days" className={labelClass}>
          Дней отпуска в год
        </label>
        <input
          id="vacation-days"
          type="number"
          min={0}
          value={vacationDays}
          onChange={(e) => setVacationDays(Math.max(0, Number(e.target.value)))}
          disabled={isReadOnly}
          className={cn(inputClass, 'max-w-[120px]', isReadOnly && 'opacity-60 cursor-not-allowed')}
        />
      </div>

      {/* Onboarding toggle */}
      <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-900/50 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-gray-200">Онбординг</p>
          <p className="text-xs text-gray-500">Показывать руководство новым сотрудникам</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={onboardingEnabled}
          disabled={isReadOnly}
          onClick={() => !isReadOnly && setOnboardingEnabled((v) => !v)}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
            'transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-950',
            onboardingEnabled ? 'bg-indigo-600' : 'bg-gray-700',
            isReadOnly && 'opacity-60 cursor-not-allowed',
          )}
        >
          <span
            className={cn(
              'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0',
              'transition-transform duration-200 ease-in-out',
              onboardingEnabled ? 'translate-x-5' : 'translate-x-0',
            )}
          />
        </button>
      </div>

      {/* Brand primary color */}
      <div>
        <label htmlFor="brand-color-text" className={labelClass}>
          Цвет бренда (HEX)
        </label>
        <div className="flex items-center gap-3">
          <input
            id="brand-color-picker"
            type="color"
            aria-label="Выбрать цвет бренда"
            value={brandColor.trim() === '' ? '#6366f1' : brandColor}
            onChange={(e) => setBrandColor(e.target.value)}
            disabled={isReadOnly}
            className={cn(
              'h-9 w-12 cursor-pointer rounded border border-gray-700 bg-gray-900 p-0.5',
              isReadOnly && 'opacity-60 cursor-not-allowed',
            )}
          />
          <input
            id="brand-color-text"
            type="text"
            value={brandColor}
            onChange={(e) => setBrandColor(e.target.value)}
            disabled={isReadOnly}
            placeholder="#6366f1"
            className={cn(inputClass, 'max-w-[140px]', isReadOnly && 'opacity-60 cursor-not-allowed')}
          />
          {brandColor.trim() !== '' && !isReadOnly && (
            <button
              type="button"
              onClick={() => setBrandColor('')}
              className={btnGhost}
              aria-label="Сбросить цвет бренда"
            >
              Сбросить
            </button>
          )}
        </div>
      </div>

      {/* Save row */}
      {!isReadOnly && (
        <div className="flex items-center gap-4 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={btnPrimary}
          >
            {isSaving ? 'Сохранение…' : 'Сохранить'}
          </button>
          <FeedbackProps success={saveSuccess} error={displayError} />
        </div>
      )}
    </div>
  );
}

// ─── Tab: Tasks ───────────────────────────────────────────────────────────────

interface TasksTabProps {
  settings: CompanySettings;
  isReadOnly: boolean;
  onSave: (patch: Partial<CompanySettings>) => void;
  isSaving: boolean;
  saveSuccess: boolean;
  saveError: string;
  originalSettings: CompanySettings;
}

function TasksTab({
  settings,
  isReadOnly,
  onSave,
  isSaving,
  saveSuccess,
  saveError,
  originalSettings,
}: TasksTabProps) {
  const [categories, setCategories] = useState<string[]>(settings.custom_task_categories);
  const [newCategory, setNewCategory] = useState('');
  const [inputError, setInputError] = useState('');

  useEffect(() => {
    setCategories(settings.custom_task_categories);
    setNewCategory('');
    setInputError('');
  }, [settings]);

  function addCategory() {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    if (categories.length >= 50) {
      setInputError('Максимум 50 категорий');
      return;
    }
    if (categories.includes(trimmed)) {
      setInputError('Такая категория уже существует');
      return;
    }
    setCategories((prev) => [...prev, trimmed]);
    setNewCategory('');
    setInputError('');
  }

  function removeCategory(index: number) {
    setCategories((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    const current: CompanySettings = { ...originalSettings, custom_task_categories: categories };
    const patch = diffSettings(originalSettings, current);
    onSave(patch);
  }

  return (
    <div className="max-w-lg space-y-5">
      <p className="text-sm text-gray-400">
        Категории отображаются при создании задач в CRM. Максимум 50.
      </p>

      <ul
        className="divide-y divide-gray-800 rounded-xl border border-gray-800"
        aria-label="Список категорий задач"
      >
        {categories.map((cat, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-2 px-4 py-2.5"
          >
            <span className="text-sm text-white">{cat}</span>
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => removeCategory(i)}
                className="text-gray-500 hover:text-red-400 transition-colors"
                aria-label={`Удалить категорию ${cat}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
        {categories.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-gray-500">Нет категорий</li>
        )}
      </ul>

      {!isReadOnly && (
        <>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => {
                setNewCategory(e.target.value);
                setInputError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && addCategory()}
              placeholder="Новая категория"
              maxLength={100}
              className={cn(inputClass, 'flex-1')}
              aria-label="Новая категория задач"
            />
            <button
              type="button"
              onClick={addCategory}
              disabled={!newCategory.trim() || categories.length >= 50}
              className={btnPrimary}
            >
              <Plus className="h-4 w-4" />
              Добавить
            </button>
          </div>
          {inputError && <p className="text-xs text-red-400">{inputError}</p>}

          <div className="flex items-center gap-4 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={btnPrimary}
            >
              {isSaving ? 'Сохранение…' : 'Сохранить'}
            </button>
            <FeedbackProps success={saveSuccess} error={saveError} />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tab: Labels ──────────────────────────────────────────────────────────────

interface LabelsTabProps {
  settings: CompanySettings;
  isReadOnly: boolean;
  onSave: (patch: Partial<CompanySettings>) => void;
  isSaving: boolean;
  saveSuccess: boolean;
  saveError: string;
  originalSettings: CompanySettings;
}

function LabelsTab({
  settings,
  isReadOnly,
  onSave,
  isSaving,
  saveSuccess,
  saveError,
  originalSettings,
}: LabelsTabProps) {
  const [labels, setLabels] = useState(settings.custom_labels);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');
  const [inputError, setInputError] = useState('');

  useEffect(() => {
    setLabels(settings.custom_labels);
    setNewName('');
    setNewColor('#6366f1');
    setInputError('');
  }, [settings]);

  function addLabel() {
    const name = newName.trim();
    if (!name) {
      setInputError('Введите название метки');
      return;
    }
    if (!HEX_REGEX.test(newColor)) {
      setInputError('Укажите корректный HEX-цвет (например, #3b82f6)');
      return;
    }
    if (labels.length >= 30) {
      setInputError('Максимум 30 меток');
      return;
    }
    if (labels.some((l) => l.name === name)) {
      setInputError('Метка с таким названием уже существует');
      return;
    }
    setLabels((prev) => [...prev, { name, color: newColor }]);
    setNewName('');
    setNewColor('#6366f1');
    setInputError('');
  }

  function removeLabel(index: number) {
    setLabels((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    const current: CompanySettings = { ...originalSettings, custom_labels: labels };
    const patch = diffSettings(originalSettings, current);
    onSave(patch);
  }

  return (
    <div className="max-w-lg space-y-5">
      <p className="text-sm text-gray-400">
        Метки используются для маркировки задач в CRM. Максимум 30.
      </p>

      <ul
        className="divide-y divide-gray-800 rounded-xl border border-gray-800"
        aria-label="Список меток"
      >
        {labels.map((label, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-3 px-4 py-2.5"
          >
            <div className="flex items-center gap-3">
              <span
                className="h-4 w-4 rounded-full shrink-0 border border-white/10"
                style={{ backgroundColor: label.color }}
                aria-hidden="true"
              />
              <span className="text-sm text-white">{label.name}</span>
              <span className="text-xs text-gray-500 font-mono">{label.color}</span>
            </div>
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => removeLabel(i)}
                className="text-gray-500 hover:text-red-400 transition-colors"
                aria-label={`Удалить метку ${label.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
        {labels.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-gray-500">Нет меток</li>
        )}
      </ul>

      {!isReadOnly && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[160px]">
              <label htmlFor="label-name" className={labelClass}>
                Название метки
              </label>
              <input
                id="label-name"
                type="text"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setInputError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && addLabel()}
                placeholder="Название"
                maxLength={50}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="label-color-picker" className={labelClass}>
                Цвет
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="label-color-picker"
                  type="color"
                  value={newColor}
                  onChange={(e) => {
                    setNewColor(e.target.value);
                    setInputError('');
                  }}
                  aria-label="Выбрать цвет метки"
                  className="h-9 w-12 cursor-pointer rounded border border-gray-700 bg-gray-900 p-0.5"
                />
                <input
                  type="text"
                  value={newColor}
                  onChange={(e) => {
                    setNewColor(e.target.value);
                    setInputError('');
                  }}
                  placeholder="#6366f1"
                  className={cn(inputClass, 'w-[110px] font-mono text-xs')}
                  aria-label="HEX-цвет метки"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={addLabel}
              disabled={!newName.trim() || labels.length >= 30}
              className={cn(btnPrimary, 'self-end')}
            >
              <Plus className="h-4 w-4" />
              Добавить
            </button>
          </div>
          {inputError && <p className="text-xs text-red-400">{inputError}</p>}

          <div className="flex items-center gap-4 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={btnPrimary}
            >
              {isSaving ? 'Сохранение…' : 'Сохранить'}
            </button>
            <FeedbackProps success={saveSuccess} error={saveError} />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Rename helper — resolves FeedbackProps name collision ────────────────────
// FeedbackProps is used both as interface and JSX component name above.
// Alias to avoid the confusion inside this file.
function FeedbackProps(props: FeedbackProps) {
  return <SaveFeedback {...props} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompanySettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const companyId =
    user?.role === USER_ROLES.SUPERADMIN
      ? (searchParams.get('company') ?? null)
      : user?.company_id != null
        ? String(user.company_id)
        : null;

  const isReadOnly = user?.role === USER_ROLES.EMPLOYEE;

  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: settings, isLoading, isError } = useQuery({
    queryKey: ['company-settings', companyId],
    enabled: Boolean(companyId),
    queryFn: () =>
      apiClient
        .get<CompanySettings>(API.companies.settings(companyId!))
        .then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: (patch: Partial<CompanySettings>) =>
      apiClient
        .patch<CompanySettings>(API.companies.settings(companyId!), patch)
        .then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['company-settings', companyId] });
      setSaveError('');
      setSaveSuccess(true);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (err: unknown) => {
      setSaveSuccess(false);
      const message =
        err instanceof Error ? err.message : 'Не удалось сохранить настройки';
      setSaveError(message);
    },
  });

  const handleSave = useCallback(
    (patch: Partial<CompanySettings>) => {
      if (Object.keys(patch).length === 0) return;
      setSaveError('');
      setSaveSuccess(false);
      mutation.mutate(patch);
    },
    [mutation],
  );

  if (!companyId) {
    if (user?.role === USER_ROLES.SUPERADMIN) {
      return (
        <div className="max-w-2xl space-y-3">
          <h1 className="text-2xl font-semibold text-white">Настройки компании</h1>
          <p className="text-gray-400">
            Укажите компанию в URL:{' '}
            <code className="rounded bg-gray-800 px-1.5 py-0.5 text-sm text-indigo-300">
              /company/settings?company=&lt;id&gt;
            </code>
          </p>
          <Link
            to="/companies"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
          >
            Перейти к списку компаний
          </Link>
        </div>
      );
    }
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold text-white">Настройки компании</h1>
        <p className="mt-2 text-gray-400">Профиль не привязан к компании.</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'general', label: 'Основное' },
    { id: 'tasks', label: 'Задачи' },
    { id: 'labels', label: 'Метки' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Настройки компании</h1>
        <p className="mt-1 text-sm text-gray-400">
          {isReadOnly
            ? 'Просмотр настроек компании.'
            : 'Управление рабочими часами, задачами и метками.'}
        </p>
      </div>

      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Разделы настроек"
        className="flex gap-1 border-b border-gray-800"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => {
              setActiveTab(tab.id);
              setSaveSuccess(false);
              setSaveError('');
            }}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'border-b-2 border-indigo-500 text-indigo-400'
                : 'text-gray-400 hover:text-gray-200',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {isLoading && (
        <p className="text-sm text-gray-500">Загрузка настроек…</p>
      )}
      {isError && (
        <p className="text-sm text-red-400">Не удалось загрузить настройки.</p>
      )}

      {settings && (
        <>
          <div
            id="tabpanel-general"
            role="tabpanel"
            aria-labelledby="tab-general"
            hidden={activeTab !== 'general'}
          >
            <GeneralTab
              settings={settings}
              originalSettings={settings}
              isReadOnly={isReadOnly}
              onSave={handleSave}
              isSaving={mutation.isPending}
              saveSuccess={saveSuccess}
              saveError={saveError}
            />
          </div>

          <div
            id="tabpanel-tasks"
            role="tabpanel"
            aria-labelledby="tab-tasks"
            hidden={activeTab !== 'tasks'}
          >
            <TasksTab
              settings={settings}
              originalSettings={settings}
              isReadOnly={isReadOnly}
              onSave={handleSave}
              isSaving={mutation.isPending}
              saveSuccess={saveSuccess}
              saveError={saveError}
            />
          </div>

          <div
            id="tabpanel-labels"
            role="tabpanel"
            aria-labelledby="tab-labels"
            hidden={activeTab !== 'labels'}
          >
            <LabelsTab
              settings={settings}
              originalSettings={settings}
              isReadOnly={isReadOnly}
              onSave={handleSave}
              isSaving={mutation.isPending}
              saveSuccess={saveSuccess}
              saveError={saveError}
            />
          </div>
        </>
      )}
    </div>
  );
}
