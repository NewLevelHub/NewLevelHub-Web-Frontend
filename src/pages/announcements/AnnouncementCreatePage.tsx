import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_CATEGORY_LABELS,
  USER_ROLES,
  type AnnouncementCategory,
} from '@/shared/config/constants';
import { useUser } from '@/shared/hooks/useAuth';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { companiesCacheRoot } from '@/shared/lib/companyQueryKeys';
import type { Announcement, Company, PaginatedResponse } from '@/shared/types';

type AudienceMode = 'building' | 'company';

export default function AnnouncementCreatePage() {
  const user = useUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;

  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [category, setCategory] = useState<AnnouncementCategory>(ANNOUNCEMENT_CATEGORIES.INFO);
  const [isPinned, setIsPinned] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [audience, setAudience] = useState<AudienceMode>(isSuperadmin ? 'building' : 'company');
  const [companyId, setCompanyId] = useState<number | ''>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Sync audience default when role becomes available.
  useEffect(() => {
    setAudience(isSuperadmin ? 'building' : 'company');
  }, [isSuperadmin]);

  // Superadmin only: load companies for the recipient picker.
  const companiesQuery = useQuery({
    queryKey: [...companiesCacheRoot(user?.id), 'list-for-announcement'],
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Company>>(API.companies.list);
      return response.data;
    },
    enabled: isSuperadmin && audience === 'company',
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const isMultipart = Boolean(image);
      const payload: Record<string, unknown> | FormData = isMultipart ? new FormData() : {};
      const setField = (key: string, value: unknown) => {
        if (payload instanceof FormData) {
          if (value === null || value === undefined) return;
          payload.append(key, value instanceof Blob ? value : String(value));
        } else {
          payload[key] = value;
        }
      };
      setField('title', title.trim());
      setField('text', text.trim());
      setField('category', category);
      setField('is_pinned', isPinned);
      setField('notify_email', notifyEmail);
      if (isSuperadmin) {
        if (audience === 'building') {
          if (payload instanceof FormData) {
            payload.append('company_id', '');
          } else {
            payload['company_id'] = null;
          }
        } else if (companyId !== '') {
          setField('company_id', companyId);
        }
      }
      if (image) {
        (payload as FormData).append('image', image);
      }
      const response = await apiClient.post<Announcement>(
        API.announcements.create,
        payload,
        isMultipart ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined,
      );
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['announcements'] });
      await queryClient.invalidateQueries({ queryKey: ['announcements-widget'] });
      navigate('/announcements');
    },
    onError: (error: unknown) => {
      setFormError(getApiErrorMessage(error, 'Не удалось создать объявление.'));
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!title.trim() || !text.trim()) {
      setFormError('Заполните заголовок и текст объявления.');
      return;
    }
    if (isSuperadmin && audience === 'company' && companyId === '') {
      setFormError('Выберите компанию-получателя или переключите на «БЦ».');
      return;
    }
    createMutation.mutate();
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-primary">Новое объявление</h1>
        <p className="text-sm text-secondary">
          {isSuperadmin
            ? 'Суперадмин: для всего БЦ или для выбранной компании.'
            : 'Объявление для сотрудников вашей компании.'}
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-default bg-raised p-5">
        <label className="block text-sm text-secondary">
          Заголовок
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
            required
            maxLength={255}
          />
        </label>

        <label className="block text-sm text-secondary">
          Текст
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
            rows={6}
            required
          />
        </label>

        <label className="block text-sm text-secondary">
          Категория
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as AnnouncementCategory)}
            className="mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
          >
            {Object.values(ANNOUNCEMENT_CATEGORIES).map((value) => (
              <option key={value} value={value}>
                {ANNOUNCEMENT_CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
        </label>

        {isSuperadmin ? (
          <fieldset className="space-y-2 rounded-lg border border-default p-3">
            <legend className="px-1 text-xs uppercase tracking-wide text-secondary">Получатели</legend>
            <label className="flex items-center gap-2 text-sm text-secondary">
              <input
                type="radio"
                name="audience"
                value="building"
                checked={audience === 'building'}
                onChange={() => setAudience('building')}
              />
              Весь БЦ (видят все)
            </label>
            <label className="flex items-center gap-2 text-sm text-secondary">
              <input
                type="radio"
                name="audience"
                value="company"
                checked={audience === 'company'}
                onChange={() => setAudience('company')}
              />
              Конкретная компания
            </label>
            {audience === 'company' ? (
              <select
                value={companyId === '' ? '' : String(companyId)}
                onChange={(event) =>
                  setCompanyId(event.target.value === '' ? '' : Number(event.target.value))
                }
                className="mt-2 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary"
                aria-label="Компания-получатель"
              >
                <option value="">— Выберите компанию —</option>
                {(companiesQuery.data?.results ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : null}
          </fieldset>
        ) : null}

        <label className="block text-sm text-secondary">
          Изображение (необязательно)
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setImage(event.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm text-secondary"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-secondary">
          <input
            type="checkbox"
            checked={isPinned}
            onChange={(event) => setIsPinned(event.target.checked)}
            className="h-4 w-4 rounded border-default bg-surface text-brand"
          />
          Закрепить наверху ленты
        </label>

        <label className="flex items-center gap-2 text-sm text-secondary">
          <input
            type="checkbox"
            checked={notifyEmail}
            onChange={(event) => setNotifyEmail(event.target.checked)}
            className="h-4 w-4 rounded border-default bg-surface text-brand"
          />
          Отправить email-уведомление получателям
        </label>

        {formError ? (
          <div role="alert" className="rounded-lg border border-rose-800 bg-rose-950/30 px-3 py-2 text-sm text-rose-300">
            {formError}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Link
            to="/announcements"
            className="inline-flex items-center rounded-lg border border-default px-4 py-2 text-sm font-medium text-secondary hover:bg-hover"
          >
            Отмена
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="inline-flex items-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {createMutation.isPending ? 'Публикация…' : 'Опубликовать'}
          </button>
        </div>
      </form>
    </main>
  );
}
