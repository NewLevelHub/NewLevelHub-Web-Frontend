import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Info } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { PASS_STATUSES, USER_ROLES, type PassStatus } from '@/shared/config/constants';
import { useUser } from '@/shared/hooks/useAuth';
import { getApiError } from '@/shared/lib/getApiError';
import { fmtDateTime } from '@/shared/lib/formatDate';
import type { GuestPass } from '@/shared/types';
import { PassStatusBadge } from '@/pages/passes/components/PassStatusBadge';
import { PassValidationsList } from '@/pages/passes/components/PassValidationsList';
import { QRCodeView } from '@/pages/passes/components/QRCodeView';
import { usePassCountdown } from '@/pages/passes/hooks/usePassCountdown';
import { usePassValidations } from '@/pages/passes/hooks/usePassValidations';

export default function PassDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useUser();
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['guest-pass-detail', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await apiClient.get<GuestPass>(API.passes.detail(String(id)));
      return response.data;
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(API.passes.resend(String(id)));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['guest-pass-detail', id] });
      setSuccessMessage(t('passes.resendQr'));
    },
    onError: () => setSuccessMessage(null),
  });

  const revokeMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(API.passes.revoke(String(id)));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['guest-pass-detail', id] });
      await queryClient.invalidateQueries({ queryKey: ['guest-passes'], refetchType: 'all' });
      setSuccessMessage(t('passes.revokeSuccess'));
    },
    onError: () => setSuccessMessage(null),
  });

  const { isNowActive } = usePassCountdown(data?.valid_from);

  const isMultiUse = data?.usage_type === 'multi';
  const {
    data: validationsData,
    isLoading: isLoadingValidations,
    isError: isValidationsError,
  } = usePassValidations(id, isMultiUse);

  if (isLoading) {
    return <div className="p-3 sm:p-4 md:p-6 text-sm text-secondary">{t('passes.loadingPass')}</div>;
  }

  if (isError || !data) {
    return <div className="p-3 sm:p-4 md:p-6 text-sm text-danger">{t('passes.loadError')}</div>;
  }

  const activatesAt = new Date(data.valid_from);
  const isNotYetActive = !isNowActive && activatesAt > new Date();

  const canManagePass =
    user?.role === USER_ROLES.SUPERADMIN || user?.role === USER_ROLES.COMPANY_ADMIN;
  const canRevoke =
    canManagePass &&
    data.status !== PASS_STATUSES.USED &&
    data.status !== PASS_STATUSES.EXPIRED &&
    data.status !== PASS_STATUSES.REVOKED;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => navigate('/passes')}
          className="text-sm font-medium text-muted transition-colors hover:text-primary"
        >
          {t('passes.backToList')}
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-primary">{t('passes.passId', { id: data.id })}</h1>
          <PassStatusBadge status={data.status as PassStatus} />
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-2xl border border-default bg-surface shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[color:var(--border-faint)]">
          <h2 className="text-base font-semibold text-primary tracking-[-0.015em]">
            {t('passes.guestInfo')}
          </h2>
        </div>
        <div className="px-6 py-5 grid sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
          {/* Guest name + email — spans 2 cols */}
          <div className="flex flex-col gap-0.5 sm:col-span-2">
            <span className="text-xs font-medium text-[color:var(--text-muted)]">
              {t('team.roleGuest')}
            </span>
            <span className="text-sm font-medium text-[color:var(--text-primary)]">
              {data.guest_name}
            </span>
            <span className="text-xs text-[color:var(--text-muted)]">{data.guest_email}</span>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-[color:var(--text-muted)]">
              {t('common.status')}
            </span>
            <span className="text-sm text-[color:var(--text-primary)]">
              <PassStatusBadge status={data.status as PassStatus} />
            </span>
          </div>

          {/* Purpose */}
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-[color:var(--text-muted)]">
              {t('passes.purpose')}
            </span>
            <span className="text-sm text-[color:var(--text-primary)]">{data.purpose || '—'}</span>
          </div>

          {/* Times used */}
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-[color:var(--text-muted)]">
              {t('passes.timesUsed')}
            </span>
            <span className="text-sm text-[color:var(--text-primary)]">{data.times_used}</span>
          </div>

          {/* Valid from */}
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-[color:var(--text-muted)]">
              {t('passes.validFrom')}
            </span>
            <span className="text-sm text-[color:var(--text-primary)]">
              {fmtDateTime(data.valid_from)}
            </span>
          </div>

          {/* Valid until */}
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-[color:var(--text-muted)]">
              {t('passes.validUntil')}
            </span>
            <span className="text-sm text-[color:var(--text-primary)]">
              {fmtDateTime(data.valid_until)}
            </span>
          </div>
        </div>
      </div>

      {/* Actions card — only for canManagePass */}
      {canManagePass ? (
        <div className="rounded-2xl border border-default bg-surface shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[color:var(--border-faint)]">
            <h2 className="text-base font-semibold text-primary tracking-[-0.015em]">
              {t('passes.actionsSection')}
            </h2>
          </div>
          <div className="px-6 py-5 space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setSuccessMessage(null);
                  resendMutation.mutate();
                }}
                disabled={resendMutation.isPending}
                className="h-8 px-4 text-sm font-medium rounded-[var(--radius-sm)] border border-[color:var(--border)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)] transition-colors disabled:opacity-50"
              >
                {resendMutation.isPending ? t('common.submittingPlain') : t('passes.resendQr')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSuccessMessage(null);
                  revokeMutation.mutate();
                }}
                disabled={!canRevoke || revokeMutation.isPending}
                className="h-8 px-4 text-sm font-medium rounded-[var(--radius-sm)] border border-rose-500/50 text-rose-400 hover:bg-rose-500/10 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {revokeMutation.isPending ? t('passes.revoking') : t('passes.revoke')}
              </button>
            </div>
            {isNotYetActive ? (
              <div className="flex items-start gap-2 text-xs text-[color:var(--text-muted)]">
                <Info size={14} className="mt-0.5 shrink-0" />
                <span>{t('passes.qrActiveHint', { date: fmtDateTime(activatesAt) })}</span>
              </div>
            ) : null}
            {resendMutation.isError ? (
              <div className="rounded-[var(--radius-sm)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {getApiError(resendMutation.error).message}
              </div>
            ) : null}
            {revokeMutation.isError ? (
              <div className="rounded-[var(--radius-sm)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {getApiError(revokeMutation.error).message}
              </div>
            ) : null}
            {successMessage ? (
              <div className="text-sm text-[color:var(--status-free-text)]">{successMessage}</div>
            ) : null}
            {!canRevoke ? (
              <div className="text-xs text-[color:var(--text-muted)]">
                {t('passes.cannotRevoke')}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {isMultiUse ? (
        <PassValidationsList
          total={validationsData?.total ?? data.times_used}
          results={validationsData?.results ?? []}
          isLoading={isLoadingValidations}
          isError={isValidationsError}
        />
      ) : null}

      <QRCodeView qrImage={data.qr_image} validFrom={data.valid_from} />
    </div>
  );
}
