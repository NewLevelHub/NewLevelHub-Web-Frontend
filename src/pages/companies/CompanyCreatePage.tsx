import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  Upload,
  AlertTriangle,
  Check,
} from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { COMPANY_TIERS, USER_ROLES } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { useAuth } from '@/shared/hooks/useAuth';
import type { Company } from '@/shared/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  name: string;
  description: string;
  floor: string;
  office_number: string;
  contact_email: string;
  contact_phone: string;
  plan: string;
  max_employees: string;
  storage_limit_gb: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inputClass(hasError: boolean) {
  return cn(
    'w-full px-3 py-2 text-sm rounded-lg border text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent',
    hasError
      ? 'border-red-400 focus:ring-red-500'
      : 'border-gray-300 focus:ring-blue-500',
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CompanyCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const companiesBasePath = user?.role === USER_ROLES.SUPERADMIN ? '/admin/companies' : '/companies';

  const [form, setForm] = useState<FormData>({
    name: '',
    description: '',
    floor: '',
    office_number: '',
    contact_email: '',
    contact_phone: '',
    plan: COMPANY_TIERS.BASIC,
    max_employees: '50',
    storage_limit_gb: '10',
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.append('name', form.name);
      if (form.description) formData.append('description', form.description);
      if (form.floor) formData.append('floor', form.floor);
      if (form.office_number) formData.append('office_number', form.office_number);
      if (form.contact_email) formData.append('contact_email', form.contact_email);
      if (form.contact_phone) formData.append('contact_phone', form.contact_phone);
      formData.append('plan', form.plan);
      formData.append('max_employees', form.max_employees);
      formData.append('storage_limit_gb', form.storage_limit_gb);
      if (logoFile) formData.append('logo', logoFile);

      return apiClient.post<Company>(
        API.companies.create,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
    },
    onSuccess: (response) => {
      navigate(`${companiesBasePath}/${response.data.id}`);
    },
    onError: (error: unknown) => {
      const axiosError = error as {
        response?: { data?: Record<string, string[]> };
      };
      const responseData = axiosError?.response?.data;
      if (responseData && typeof responseData === 'object') {
        const errors: Record<string, string> = {};
        for (const [key, messages] of Object.entries(responseData)) {
          if (Array.isArray(messages)) {
            errors[key] = messages[0] ?? '';
          }
        }
        setFieldErrors(errors);
        setGeneralError(null);
      } else {
        setGeneralError('Не удалось создать компанию. Проверьте данные и попробуйте ещё раз.');
      }
    },
  });

  function handleField(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGeneralError(null);

    if (!form.name.trim()) {
      setFieldErrors({ name: 'Название обязательно' });
      return;
    }

    mutate();
  }

  return (
    <main className="px-4 py-8 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          type="button"
          onClick={() => navigate(companiesBasePath)}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 mb-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          aria-label="Назад к списку компаний"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Назад к списку
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Создать компанию</h1>
        <p className="mt-1 text-sm text-gray-500">Заполните данные новой компании-арендатора</p>
      </div>

      {/* Form card */}
      <section
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
        aria-label="Форма создания компании"
      >
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {generalError && (
            <div
              role="alert"
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
            >
              <AlertTriangle size={15} className="shrink-0" aria-hidden="true" />
              {generalError}
            </div>
          )}

          {/* Logo upload */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Логотип</p>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Превью логотипа"
                  className="w-16 h-16 rounded-xl object-cover border border-gray-200"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-xl bg-blue-50 flex items-center justify-center border border-gray-200 border-dashed"
                  aria-hidden="true"
                >
                  <Building2 className="w-7 h-7 text-blue-300" />
                </div>
              )}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
                >
                  <Upload size={14} aria-hidden="true" />
                  Выбрать изображение
                </button>
                <p className="text-xs text-gray-400">PNG, JPG, WebP до 5 МБ</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="sr-only"
                aria-label="Выбрать файл логотипа"
              />
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Название <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              placeholder="Acme Corp"
              value={form.name}
              onChange={(e) => handleField('name', e.target.value)}
              className={inputClass(!!fieldErrors.name)}
              aria-describedby={fieldErrors.name ? 'name-error' : undefined}
            />
            {fieldErrors.name && (
              <p id="name-error" className="mt-1 text-xs text-red-600" role="alert">
                {fieldErrors.name}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Описание
            </label>
            <textarea
              id="description"
              rows={3}
              placeholder="Краткое описание компании..."
              value={form.description}
              onChange={(e) => handleField('description', e.target.value)}
              className={cn(inputClass(false), 'resize-none')}
            />
          </div>

          <hr className="border-gray-100" />
          <p className="text-sm font-semibold text-gray-700">Расположение</p>

          <div className="grid grid-cols-2 gap-4">
            {/* Floor */}
            <div>
              <label htmlFor="floor" className="block text-sm font-medium text-gray-700 mb-1">
                Этаж
              </label>
              <input
                id="floor"
                type="number"
                min={1}
                placeholder="3"
                value={form.floor}
                onChange={(e) => handleField('floor', e.target.value)}
                className={inputClass(!!fieldErrors.floor)}
              />
              {fieldErrors.floor && (
                <p className="mt-1 text-xs text-red-600" role="alert">{fieldErrors.floor}</p>
              )}
            </div>

            {/* Office number */}
            <div>
              <label htmlFor="office_number" className="block text-sm font-medium text-gray-700 mb-1">
                Номер офиса
              </label>
              <input
                id="office_number"
                type="text"
                placeholder="301"
                value={form.office_number}
                onChange={(e) => handleField('office_number', e.target.value)}
                className={inputClass(!!fieldErrors.office_number)}
              />
            </div>
          </div>

          <hr className="border-gray-100" />
          <p className="text-sm font-semibold text-gray-700">Контакты</p>

          {/* Contact email */}
          <div>
            <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700 mb-1">
              Контактный email
            </label>
            <input
              id="contact_email"
              type="email"
              placeholder="contact@company.com"
              value={form.contact_email}
              onChange={(e) => handleField('contact_email', e.target.value)}
              className={inputClass(!!fieldErrors.contact_email)}
              aria-describedby={fieldErrors.contact_email ? 'contact-email-error' : undefined}
            />
            {fieldErrors.contact_email && (
              <p id="contact-email-error" className="mt-1 text-xs text-red-600" role="alert">
                {fieldErrors.contact_email}
              </p>
            )}
          </div>

          {/* Contact phone */}
          <div>
            <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700 mb-1">
              Контактный телефон
            </label>
            <input
              id="contact_phone"
              type="tel"
              placeholder="+7 (700) 000-00-00"
              value={form.contact_phone}
              onChange={(e) => handleField('contact_phone', e.target.value)}
              className={inputClass(!!fieldErrors.contact_phone)}
            />
          </div>

          <hr className="border-gray-100" />
          <p className="text-sm font-semibold text-gray-700">Тариф и лимиты</p>

          {/* Plan */}
          <div>
            <label htmlFor="plan" className="block text-sm font-medium text-gray-700 mb-1">
              Тариф
            </label>
            <select
              id="plan"
              value={form.plan}
              onChange={(e) => handleField('plan', e.target.value)}
              className={inputClass(!!fieldErrors.plan)}
            >
              <option value={COMPANY_TIERS.BASIC}>Базовый</option>
              <option value={COMPANY_TIERS.STANDARD}>Стандарт</option>
              <option value={COMPANY_TIERS.PREMIUM}>Премиум</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Max employees */}
            <div>
              <label htmlFor="max_employees" className="block text-sm font-medium text-gray-700 mb-1">
                Макс. сотрудников
              </label>
              <input
                id="max_employees"
                type="number"
                min={1}
                value={form.max_employees}
                onChange={(e) => handleField('max_employees', e.target.value)}
                className={inputClass(!!fieldErrors.max_employees)}
                aria-describedby={fieldErrors.max_employees ? 'max-emp-error' : undefined}
              />
              {fieldErrors.max_employees && (
                <p id="max-emp-error" className="mt-1 text-xs text-red-600" role="alert">
                  {fieldErrors.max_employees}
                </p>
              )}
            </div>

            {/* Storage limit */}
            <div>
              <label htmlFor="storage_limit_gb" className="block text-sm font-medium text-gray-700 mb-1">
                Хранилище (ГБ)
              </label>
              <input
                id="storage_limit_gb"
                type="number"
                min={1}
                value={form.storage_limit_gb}
                onChange={(e) => handleField('storage_limit_gb', e.target.value)}
                className={inputClass(!!fieldErrors.storage_limit_gb)}
                aria-describedby={fieldErrors.storage_limit_gb ? 'storage-error' : undefined}
              />
              {fieldErrors.storage_limit_gb && (
                <p id="storage-error" className="mt-1 text-xs text-red-600" role="alert">
                  {fieldErrors.storage_limit_gb}
                </p>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className={cn(
                'inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                isPending
                  ? 'bg-blue-300 text-white cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white',
              )}
            >
              {isPending ? (
                <>
                  <span
                    className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin"
                    aria-hidden="true"
                  />
                  Создание...
                </>
              ) : (
                <>
                  <Check size={15} aria-hidden="true" />
                  Создать компанию
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate(companiesBasePath)}
              disabled={isPending}
              className="inline-flex items-center px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
            >
              Отмена
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
