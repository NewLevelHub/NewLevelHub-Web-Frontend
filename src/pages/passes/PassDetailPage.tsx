import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Info } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { PASS_STATUSES, USER_ROLES, type PassStatus } from '@/shared/config/constants';
import { useUser } from '@/shared/hooks/useAuth';
import { getApiError } from '@/shared/lib/getApiError';
import type { GuestPass } from '@/shared/types';
import { PassStatusBadge } from '@/pages/passes/components/PassStatusBadge';
import { QRCodeView } from '@/pages/passes/components/QRCodeView';
import { usePassCountdown } from '@/pages/passes/hooks/usePassCountdown';

export default function PassDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
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
      await queryClient.invalidateQueries({ queryKey: ['guest-passes'] });
      setSuccessMessage(t('passes.revokeSuccess'));
    },
    onError: () => setSuccessMessage(null),
  });

  const { isNowActive } = usePassCountdown(data?.valid_from);

  if (isLoading) {
    return <main className="p-3 sm:p-4 md:p-6 text-sm text-secondary">{t('passes.loadingPass')}</main>;
  }

  if (isError || !data) {
    return <main className="p-3 sm:p-4 md:p-6 text-sm text-danger">{t('passes.loadError')}</main>;
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
    <main className="mx-auto max-w-3xl space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-primary">{t('passes.passId', { id: data.id })}</h1>
        <Link to="/passes" className="text-sm text-brand hover:text-brand">
          {t('passes.backToList')}
        </Link>
      </div>

      {canManagePass ? (
        <section className="rounded-xl border border-default bg-raised p-5">
          <h2 className="mb-3 text-lg font-semibold text-primary">{t('passes.actionsSection')}</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setSuccessMessage(null);
                resendMutation.mutate();
              }}
              disabled={resendMutation.isPending}
              className="inline-flex items-center rounded-lg border border-default px-4 py-2 text-sm font-medium text-brand hover:bg-brand-subtle disabled:opacity-50"
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
              className="inline-flex items-center rounded-lg border border-rose-700 px-4 py-2 text-sm font-medium text-rose-300 hover:bg-rose-700/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {revokeMutation.isPending ? t('passes.revoking') : t('passes.revoke')}
            </button>
          </div>
          {isNotYetActive ? (
            <div className="mt-3 flex items-start gap-2 text-xs text-blue-300">
              <Info size={14} className="mt-0.5 shrink-0" />
              <span>{t('passes.qrActiveHint', { date: activatesAt.toLocaleString() })}</span>
            </div>
          ) : null}
          {resendMutation.isError ? (
            <div className="mt-3 text-sm text-rose-300">
              {getApiError(resendMutation.error).message}
            </div>
          ) : null}
          {revokeMutation.isError ? (
            <div className="mt-3 text-sm text-rose-300">
              {getApiError(revokeMutation.error).message}
            </div>
          ) : null}
          {successMessage ? <div className="mt-3 text-sm text-success">{successMessage}</div> : null}
          {!canRevoke ? (
            <div className="mt-3 text-xs text-secondary">{t('passes.cannotRevoke')}</div>
          ) : null}
        </section>
      ) : null}

      <section className="grid gap-4 rounded-xl border border-default bg-raised p-5 text-sm text-secondary sm:grid-cols-2">
        <div>
          <div className="text-secondary">{t('team.roleGuest')}</div>
          <div className="font-medium text-primary">{data.guest_name}</div>
          <div className="text-xs text-secondary">{data.guest_email}</div>
        </div>
        <div>
          <div className="text-secondary">{t('common.status')}</div>
          <div><PassStatusBadge status={data.status as PassStatus} /></div>
        </div>
        <div>
          <div className="text-secondary">{t('passes.purpose')}</div>
          <div>{data.purpose || '—'}</div>
        </div>
        <div>
          <div className="text-secondary">{t('passes.timesUsed')}</div>
          <div>{data.times_used}</div>
        </div>
        <div>
          <div className="text-secondary">{t('passes.validFrom')}</div>
          <div>{new Date(data.valid_from).toLocaleString()}</div>
        </div>
        <div>
          <div className="text-secondary">{t('passes.validUntil')}</div>
          <div>{new Date(data.valid_until).toLocaleString()}</div>
        </div>
      </section>

      <QRCodeView qrImage={data.qr_image} validFrom={data.valid_from} />
    </main>
  );
}
