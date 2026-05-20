import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Settings2, Plus, Trash2 } from 'lucide-react';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { useAuth } from '@/shared/hooks/useAuth';
import { getApiError } from '@/shared/lib/getApiError';
import type { CompanySettings } from '@/shared/types';

interface LabelDraft {
  name: string;
  color: string;
}

function normalizeTimeInput(value: string): string {
  return value.trim().slice(0, 5);
}

export default function CompanySettingsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = user?.company_id != null ? String(user.company_id) : null;
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['company-settings', companyId],
    enabled: Boolean(companyId),
    queryFn: () =>
      apiClient
        .get<CompanySettings>(API.companies.settings(companyId!))
        .then((r) => r.data),
  });

  const [vacationDays, setVacationDays] = useState('24');
  const [onboardingEnabled, setOnboardingEnabled] = useState(false);
  const [brandColor, setBrandColor] = useState('#4F46E5');
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('18:00');
  const [categoriesText, setCategoriesText] = useState('');
  const [labels, setLabels] = useState<LabelDraft[]>([]);

  useEffect(() => {
    if (!data) return;
    setVacationDays(String(data.vacation_days_per_year ?? 0));
    setOnboardingEnabled(Boolean(data.onboarding_enabled));
    setBrandColor(data.brand_primary_color || '#4F46E5');
    setWorkStart(data.working_hours.start || '09:00');
    setWorkEnd(data.working_hours.end || '18:00');
    setCategoriesText((data.custom_task_categories || []).join('\n'));
    setLabels(
      (data.custom_labels || []).map((item) => ({
        name: item.name ?? '',
        color: item.color ?? '#6366F1',
      })),
    );
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const parsedCategories = categoriesText
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);

      const parsedLabels = labels
        .map((label) => ({ name: label.name.trim(), color: label.color.trim() }))
        .filter((label) => label.name.length > 0);

      return apiClient.patch(API.companies.settings(companyId!), {
        vacation_days_per_year: Number(vacationDays),
        onboarding_enabled: onboardingEnabled,
        brand_primary_color: brandColor || null,
        working_hours: {
          start: normalizeTimeInput(workStart),
          end: normalizeTimeInput(workEnd),
        },
        custom_task_categories: parsedCategories,
        custom_labels: parsedLabels,
      });
    },
    onSuccess: async () => {
      setError(null);
      setSuccess('Настройки сохранены.');
      await queryClient.invalidateQueries({ queryKey: ['company-settings', companyId] });
    },
    onError: (mutationError: unknown) => {
      setSuccess(null);
      setError(getApiError(mutationError).message);
    },
  });

  if (!companyId) {
    return (
      <div className="max-w-3xl space-y-2">
        <h1 className="text-2xl font-semibold text-primary">Настройки компании</h1>
        <p className="text-sm text-secondary">Профиль пользователя не привязан к компании.</p>
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
      <div className="flex flex-wrap gap-2">
        <Link
          to="/company/settings/members"
          className="rounded-lg border border-default px-3 py-1.5 text-xs text-secondary hover:bg-hover"
        >
          Перейти к инвайтам сотрудников
        </Link>
        <Link
          to="/company/settings/onboarding"
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
          />
          Включить onboarding-процесс
        </label>
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
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-primary">Кастомные лейблы CRM</h2>
          <button
            type="button"
            onClick={() => setLabels((prev) => [...prev, { name: '', color: '#6366F1' }])}
            className="inline-flex items-center gap-1 rounded-lg border border-default px-3 py-1.5 text-xs text-secondary hover:bg-hover"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Добавить лейбл
          </button>
        </div>
        <div className="space-y-2">
          {labels.map((label, idx) => (
            <div key={`${idx}-${label.name}`} className="grid gap-2 sm:grid-cols-[1fr_160px_auto]">
              <input
                type="text"
                value={label.name}
                onChange={(e) =>
                  setLabels((prev) =>
                    prev.map((item, index) =>
                      index === idx ? { ...item, name: e.target.value } : item,
                    ),
                  )
                }
                className="rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
                placeholder="Название лейбла"
              />
              <input
                type="text"
                value={label.color}
                onChange={(e) =>
                  setLabels((prev) =>
                    prev.map((item, index) =>
                      index === idx ? { ...item, color: e.target.value } : item,
                    ),
                  )
                }
                className="rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
                placeholder="#10B981"
              />
              <button
                type="button"
                onClick={() => setLabels((prev) => prev.filter((_, index) => index !== idx))}
                className="inline-flex items-center justify-center rounded-lg border border-red-200 dark:border-red-800 bg-danger-subtle px-3 py-2 text-danger hover:bg-danger-subtle"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
          {!labels.length && <p className="text-sm text-muted">Лейблы пока не добавлены.</p>}
        </div>
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
        {saveMutation.isPending ? 'Сохранение...' : 'Сохранить настройки'}
      </button>
    </div>
  );
}
