import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Info } from 'lucide-react';

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
import { useTimedMessage } from '@/pages/passes/hooks/useTimedMessage';

export default function PassDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useUser();
  const queryClient = useQueryClient();
  const { message: successMessage, showMessage, clearMessage, isMessageVisible } = useTimedMessage();

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
      showMessage(t('passes.resendQr'));
      await queryClient.invalidateQueries({ queryKey: ['guest-pass-detail', id] });
    },
    onError: () => clearMessage(),
  });

  const revokeMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(API.passes.revoke(String(id)));
    },
    onSuccess: async () => {
      showMessage(t('passes.revokeSuccess'));
      await queryClient.invalidateQueries({ queryKey: ['guest-pass-detail', id] });
      await queryClient.invalidateQueries({ queryKey: ['guest-passes'], refetchType: 'all' });
    },
    onError: () => clearMessage(),
  });

  const { isNowActive } = usePassCountdown(data?.valid_from);

  const isMultiUse = data?.usage_type === 'multi';
  const {
    data: validationsData,
    isLoading: isLoadingValidations,
    isError: isValidationsError,
  } = usePassValidations(id, isMultiUse);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <p className="text-sm text-secondary">{t('passes.loadingPass')}</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-5">
        <p className="text-sm text-red-400">{t('passes.loadError')}</p>
      </div>
    );
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
      <button
        type="button"
        onClick={() => navigate('/passes')}
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('passes.backToList')}
      </button>

      {/* Info card */}
      <div className="rounded-2xl border border-default bg-surface shadow-xl overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-[color:var(--border-faint)]">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-semibold text-primary tracking-[-0.015em]">
              {data.guest_name}
            </h2>
            <PassStatusBadge status={data.status as PassStatus} />
          </div>
          <p className="text-xs text-muted mt-0.5">{data.guest_email}</p>
        </div>

        <div className="px-6 py-5 grid sm:grid-cols-2 gap-x-6 gap-y-4">
          {/* Pass ID */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-secondary">{t('passes.passIdLabel')}</span>
            <span className="text-sm text-primary">#{data.id}</span>
          </div>

          {/* Purpose */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-secondary">{t('passes.purpose')}</span>
            <span className="text-sm text-primary">{data.purpose || '—'}</span>
          </div>

          {/* Times used */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-secondary">{t('passes.timesUsed')}</span>
            <span className="text-sm text-primary">{data.times_used}</span>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-secondary">{t('common.status')}</span>
            <span className="text-sm text-primary">
              <PassStatusBadge status={data.status as PassStatus} />
            </span>
          </div>

          {/* Valid from */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-secondary">{t('passes.validFrom')}</span>
            <span className="text-sm text-primary">{fmtDateTime(data.valid_from)}</span>
          </div>

          {/* Valid until */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-secondary">{t('passes.validUntil')}</span>
            <span className="text-sm text-primary">{fmtDateTime(data.valid_until)}</span>
          </div>
        </div>
      </div>

      {/* Actions card */}
      {canManagePass ? (
        <div className="rounded-2xl border border-default bg-surface shadow-xl overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-[color:var(--border-faint)]">
            <h2 className="text-base font-semibold text-primary tracking-[-0.015em]">
              {t('passes.actionsSection')}
            </h2>
          </div>

          {resendMutation.isError && (
            <div role="alert" className="mx-6 mt-5 rounded-[var(--radius-sm)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {getApiError(resendMutation.error).message}
            </div>
          )}
          {revokeMutation.isError && (
            <div role="alert" className="mx-6 mt-5 rounded-[var(--radius-sm)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {getApiError(revokeMutation.error).message}
            </div>
          )}

          <div className="px-6 py-5 space-y-3">
            {isNotYetActive && (
              <div className="flex items-start gap-2 text-xs text-secondary">
                <Info size={14} className="mt-0.5 shrink-0" />
                <span>{t('passes.qrActiveHint', { date: fmtDateTime(activatesAt) })}</span>
              </div>
            )}
            {successMessage && (
              <p className="text-xs text-[color:var(--status-free-text)]">{successMessage}</p>
            )}
            {!canRevoke && !isMessageVisible && (
              <p className="text-xs text-muted">{t('passes.cannotRevoke')}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-[color:var(--border-faint)] px-6 pt-4 pb-5">
            <button
              type="button"
              onClick={() => {
                clearMessage();
                resendMutation.mutate();
              }}
              disabled={resendMutation.isPending}
              className="h-8 px-4 text-sm font-medium rounded-[var(--radius-sm)] border border-[color:var(--border)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendMutation.isPending ? t('common.submittingPlain') : t('passes.resendQr')}
            </button>
            <button
              type="button"
              onClick={() => {
                clearMessage();
                revokeMutation.mutate();
              }}
              disabled={!canRevoke || revokeMutation.isPending}
              className="h-8 px-4 text-sm font-medium rounded-[var(--radius-sm)] border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {revokeMutation.isPending ? t('passes.revoking') : t('passes.revoke')}
            </button>
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
