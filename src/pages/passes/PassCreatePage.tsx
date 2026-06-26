import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { Button } from '@/shared/ui/Button';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { getApiError } from '@/shared/lib/getApiError';
import { cn } from '@/shared/lib/cn';
import { fmtDate } from '@/shared/lib/formatDate';
import { inputCls, textareaCls } from '@/pages/resources/utils';
import type { GuestPass } from '@/shared/types';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'Asia/Almaty';

type GuestPassCreatePayload = {
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  purpose: string;
  valid_from: string;
  valid_until: string;
  is_single_use: boolean;
};

export default function PassCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [purpose, setPurpose] = useState('');
  const [validFrom, setValidFrom] = useState(dayjs().tz(TZ).format('YYYY-MM-DDTHH:mm'));
  const [isSingleUse, setIsSingleUse] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const createPassMutation = useMutation({
    mutationFn: async (payload: GuestPassCreatePayload) => {
      const response = await apiClient.post<GuestPass>(API.passes.create, payload);
      return response.data;
    },
    onSuccess: async (createdPass) => {
      await queryClient.invalidateQueries({ queryKey: ['guest-passes'], refetchType: 'all' });
      navigate(`/passes/${createdPass.id}`);
    },
    onError: (error: unknown) => {
      setFormError(getApiError(error).message);
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    if (!guestName.trim() || !guestEmail.trim() || !purpose.trim()) {
      setFormError(t('passes.requiredFields'));
      return;
    }
    const start = dayjs.tz(validFrom, TZ);
    const end = isSingleUse ? start.add(30, 'day') : start.add(1, 'day');
    createPassMutation.mutate({
      guest_name: guestName.trim(),
      guest_email: guestEmail.trim(),
      guest_phone: guestPhone.trim() || undefined,
      purpose: purpose.trim(),
      valid_from: start.toISOString(),
      valid_until: end.toISOString(),
      is_single_use: isSingleUse,
    });
  };

  const previewEnd = validFrom
    ? (isSingleUse
        ? dayjs.tz(validFrom, TZ).add(30, 'day').toDate()
        : dayjs.tz(validFrom, TZ).add(1, 'day').toDate())
    : null;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => navigate('/passes')}
          className="text-sm font-medium text-muted transition-colors hover:text-primary"
        >
          {t('passes.backToPasses')}
        </button>
        <h1 className="text-xl font-semibold text-primary">{t('passes.pageTitle')}</h1>
        <p className="text-sm text-muted">{t('passes.pageSubtitle')}</p>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-default bg-surface shadow-xl overflow-hidden">
        {/* Card header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[color:var(--border-faint)]">
          <div>
            <h2 className="text-base font-semibold text-primary tracking-[-0.015em]">
              {t('passes.pageTitle')}
            </h2>
            <p className="text-xs text-muted mt-0.5">{t('passes.pageSubtitle')}</p>
          </div>
        </div>

        {/* Form body + footer */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="px-6 py-5 space-y-4">
            {/* Error banner */}
            {formError && (
              <div className="rounded-[var(--radius-sm)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            {/* Guest name */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="guest_name" className="text-xs font-medium text-secondary">
                {t('passes.guestName')}
              </label>
              <input
                id="guest_name"
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                maxLength={70}
                className={inputCls}
                required
              />
              <p className="text-xs text-right text-muted">{guestName.length}/70</p>
            </div>

            {/* Guest email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="guest_email" className="text-xs font-medium text-secondary">
                {t('passes.guestEmail')}
              </label>
              <input
                id="guest_email"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className={inputCls}
                required
              />
            </div>

            {/* Guest phone */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="guest_phone" className="text-xs font-medium text-secondary">
                {t('passes.guestPhone')}
              </label>
              <input
                id="guest_phone"
                type="text"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Visit purpose */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="purpose" className="text-xs font-medium text-secondary">
                {t('passes.visitPurpose')}
              </label>
              <textarea
                id="purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                rows={3}
                maxLength={70}
                className={textareaCls}
                required
              />
              <p className="text-xs text-right text-muted">{purpose.length}/70</p>
            </div>

            {/* Visit details sub-card */}
            <div className="rounded-xl border border-[color:var(--border-faint)] bg-raised px-4 py-3 space-y-3">
              <p className="text-xs font-semibold text-secondary mb-2">
                {t('passes.visitDetails')}
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* Valid from */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="valid_from" className="text-xs font-medium text-secondary">
                    {t('passes.validFromLabel')}
                  </label>
                  <input
                    id="valid_from"
                    type="datetime-local"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    min={dayjs().tz(TZ).format('YYYY-MM-DDTHH:mm')}
                    className={inputCls}
                    required
                  />
                  <p className="text-xs text-muted">{t('passes.validFromHint')}</p>
                </div>

                {/* Valid until (read-only, auto-calculated) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-secondary">
                    {t('passes.validUntilLabel')}
                  </label>
                  <div className="rounded-[var(--radius-sm)] border border-default bg-raised px-3 py-2 text-sm text-secondary h-9 flex items-center">
                    {previewEnd ? fmtDate(previewEnd) : (isSingleUse ? t('passes.autoUntil') : t('passes.autoUntilMulti'))}
                  </div>
                </div>
              </div>

              {/* One-time checkbox */}
              <label className="inline-flex items-center gap-2 text-xs text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSingleUse}
                  onChange={(e) => setIsSingleUse(e.target.checked)}
                  className={cn('h-4 w-4 rounded border-default bg-surface text-brand')}
                />
                {t('passes.oneTime')}
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-[color:var(--border-faint)] px-6 pt-4 pb-5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate('/passes')}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={createPassMutation.isPending}
              loading={createPassMutation.isPending}
            >
              {createPassMutation.isPending ? t('common.creatingPlain') : t('passes.create')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
