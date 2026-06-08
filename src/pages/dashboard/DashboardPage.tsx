import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { dateLocaleTag } from '@/shared/lib/localeFormat';
import { useAuthStore } from '@/shared/store/auth';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES } from '@/shared/config/constants';
import { getApiError } from '@/shared/lib/getApiError';
import { authPrimaryBtn } from '@/shared/ui/authFormStyles';
import { cn } from '@/shared/lib/cn';
import type {
  DashboardData,
  OnboardingStatus,
} from '@/shared/types';
import { SuperadminWidgets } from '@/pages/dashboard/components/SuperadminWidgets';
import { CompanyAdminWidgets } from '@/pages/dashboard/components/CompanyAdminWidgets';
import { EmployeeWidgets } from '@/pages/dashboard/components/EmployeeWidgets';
import { GuestWidgets } from '@/pages/dashboard/components/GuestWidgets';
import { LOGO_MAX_BYTES, ONBOARDING_STEP_LABEL_KEYS } from '@/pages/dashboard/constants';

interface CompanyOnboardingStep {
  key: string;
  title: string;
  completed: boolean;
}

interface CompanyOnboardingStatus {
  completed: boolean;
  steps: CompanyOnboardingStep[];
}

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = dateLocaleTag(i18n.language);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isImpersonating = useAuthStore((s) => s.isImpersonating);
  const fetchMe = useAuthStore((s) => s.fetchMe);

  const isCompanyAdmin = user?.role === USER_ROLES.COMPANY_ADMIN;
  const isEmployee = user?.role === USER_ROLES.EMPLOYEE;
  const companyId = user?.company_id != null ? String(user.company_id) : null;
  const requiresHrOnboarding = isEmployee;

  const { data: onboardingProgress, isFetching: onboardingFetching } = useQuery<OnboardingStatus>({
    queryKey: ['onboarding-progress'],
    queryFn: () => apiClient.get<OnboardingStatus>(API.onboarding.progress).then((r) => r.data),
    enabled: Boolean(user) && requiresHrOnboarding,
    retry: false,
  });

  const { data: companyOnboarding } = useQuery<CompanyOnboardingStatus>({
    queryKey: ['company-onboarding', companyId],
    queryFn: () =>
      apiClient
        .get<CompanyOnboardingStatus>(API.companies.onboardingStatus(companyId!))
        .then((r) => r.data),
    enabled: Boolean(user) && isCompanyAdmin && Boolean(companyId),
    retry: false,
  });

  useEffect(() => {
    if (
      !isImpersonating &&
      !onboardingFetching &&
      requiresHrOnboarding &&
      onboardingProgress &&
      onboardingProgress.completed === false
    ) {
      void navigate('/onboarding', { replace: true });
    }
  }, [isImpersonating, requiresHrOnboarding, onboardingProgress, onboardingFetching, navigate]);

  const { data: dashboard, isLoading: dashLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => apiClient.get<DashboardData>(API.dashboard).then((r) => r.data),
    enabled: Boolean(user),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const [resendMsg, setResendMsg] = useState('');
  const [resendErr, setResendErr] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  const [logoUploadError, setLogoUploadError] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const uploadLogoMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      return apiClient.patch(API.companies.detail(companyId!), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: async () => {
      setLogoUploadError('');
      setLogoFile(null);
      await queryClient.invalidateQueries({ queryKey: ['company-onboarding', companyId] });
      await queryClient.invalidateQueries({ queryKey: ['company', companyId] });
      await queryClient.invalidateQueries({ queryKey: ['companies'] });
      await fetchMe();
    },
    onError: (err: unknown) => {
      setLogoUploadError(getApiError(err).message);
    },
  });

  async function handleResend() {
    setResendMsg('');
    setResendErr('');
    setResendLoading(true);
    try {
      await apiClient.post(API.auth.resendVerification);
      setResendMsg(t('dashboard.verifyEmail.resendSuccess'));
    } catch (e) {
      setResendErr(getApiError(e).message);
    } finally {
      setResendLoading(false);
    }
  }

  const uploadLogoStepPending = Boolean(
    isCompanyAdmin &&
    companyOnboarding?.steps.find((step) => step.key === 'upload_logo' && !step.completed),
  );

  function handleLogoSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploadError('');
    if (!file.type.startsWith('image/')) {
      setLogoFile(null);
      setLogoUploadError(t('dashboard.logo.imagesOnly'));
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setLogoFile(null);
      setLogoUploadError(t('dashboard.logo.tooLarge'));
      return;
    }
    setLogoFile(file);
  }

  if (!user) {
    return <div className="text-muted">{t('common.loadingProfile')}</div>;
  }

  return (
    <div className="space-y-8">
      {/* Email verification banner */}
      {!user.is_email_verified && (
        <div className="rounded-xl border border-amber-200 bg-warning-subtle p-5 dark:border-amber-900/40">
          <p className="text-sm font-medium text-warning">
            {t('dashboard.emailVerification.title')}
          </p>
          <p className="mt-1 text-xs text-warning">
            {t('dashboard.emailVerification.hint')}
          </p>
          {resendErr && <p className="mt-2 text-xs text-danger">{resendErr}</p>}
          {resendMsg && <p className="mt-2 text-xs text-success">{resendMsg}</p>}
          <button
            type="button"
            disabled={resendLoading}
            onClick={handleResend}
            className={cn(authPrimaryBtn, 'mt-3 max-w-xs')}
          >
            {resendLoading ? t('dashboard.verifyEmail.resendPending') : t('dashboard.verifyEmail.resend')}
          </button>
        </div>
      )}

      {isCompanyAdmin && companyOnboarding && !companyOnboarding.completed && (
        /* ── Онбординг ещё не завершён — показываем шаги ── */
        <section className="rounded-xl border border-blue-200 bg-brand-subtle p-5 dark:border-blue-900/40">
          <h2 className="text-sm font-semibold text-brand">{t('dashboard.companyOnboarding.title')}</h2>
          <p className="mt-1 text-xs text-brand">
            {t('dashboard.companyOnboarding.hint')}
          </p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {companyOnboarding.steps.map((step) => (
              <li key={step.key} className={cn('flex items-center gap-2', step.completed ? 'text-success' : 'text-secondary')}>
                <span className={cn('shrink-0 text-base leading-none', step.completed ? 'text-success' : 'text-muted')}>
                  {step.completed ? '✓' : '•'}
                </span>
                {ONBOARDING_STEP_LABEL_KEYS[step.key]
                  ? t(ONBOARDING_STEP_LABEL_KEYS[step.key])
                  : step.title}
              </li>
            ))}
          </ul>
          {uploadLogoStepPending && (
            <div className="mt-4 rounded-lg border border-default bg-raised p-3">
              <p className="text-xs text-secondary">
                {t('dashboard.companyOnboarding.uploadLogoHint')}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {/* Hidden file input */}
                <input
                  ref={logoInputRef}
                  id="onboarding-logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoSelect}
                  className="hidden"
                />
                {/* Custom select button */}
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="rounded-md border border-default px-2.5 py-1.5 text-xs font-medium text-secondary hover:bg-hover transition-colors"
                >
                  {t('dashboard.logo.selectFile')}
                </button>
                {/* Selected filename */}
                <span className="text-xs text-muted">
                  {logoFile ? logoFile.name : t('dashboard.logo.noFileSelected')}
                </span>
                {/* Upload button */}
                <button
                  type="button"
                  disabled={!logoFile || uploadLogoMutation.isPending}
                  onClick={() => {
                    if (!logoFile) return;
                    uploadLogoMutation.mutate(logoFile);
                  }}
                  className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-50"
                >
                  {uploadLogoMutation.isPending ? t('dashboard.logo.uploadPending') : t('dashboard.logo.upload')}
                </button>
              </div>
              {logoUploadError && <p className="mt-2 text-xs text-danger">{logoUploadError}</p>}
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Link
              to="/crm"
              className="rounded-lg bg-brand px-3 py-2 text-xs font-medium text-white hover:bg-brand-hover transition-colors"
            >
              {t('dashboard.companyOnboarding.openCrm')}
            </Link>
            <Link
              to="/company/settings/members"
              className="rounded-lg border border-default px-3 py-2 text-xs text-secondary hover:bg-hover hover:text-primary transition-colors"
            >
              {t('dashboard.companyOnboarding.openInvites')}
            </Link>
          </div>
        </section>
      )}

      {/* Role-specific widgets */}
      {dashLoading && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-default bg-raised" />
          ))}
        </div>
      )}

      {dashboard && (
        <>
          {dashboard.role === 'superadmin' && <SuperadminWidgets data={dashboard} />}
          {dashboard.role === 'company_admin' && <CompanyAdminWidgets data={dashboard} />}
          {dashboard.role === 'employee' && (
            <EmployeeWidgets data={dashboard} />
          )}
          {dashboard.role === 'guest' && <GuestWidgets data={dashboard} />}
        </>
      )}

    </div>
  );
}
