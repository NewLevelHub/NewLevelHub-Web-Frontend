import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES } from '@/shared/config/constants';
import { companiesCacheRoot } from '@/shared/lib/companyQueryKeys';
import { useAuth } from '@/shared/hooks/useAuth';
import type { Company, PaginatedResponse } from '@/shared/types';
import InvitesPanel from '@/pages/company/components/InvitesPanel';

const labelClass = 'block text-sm font-medium text-secondary';
const inputClass =
  'mt-1 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand';

export default function CompanyMembersPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;
  const initialCompanyId = searchParams.get('company') ?? '';
  const [selectedCompanyId, setSelectedCompanyId] = useState(initialCompanyId);
  const companyId = isSuperadmin
    ? selectedCompanyId || null
    : user?.company_id != null
      ? String(user.company_id)
      : null;

  const { data: companiesData } = useQuery({
    queryKey: [...companiesCacheRoot(user?.id), 'list'],
    enabled: isSuperadmin,
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<Company>>(API.companies.list)
        .then((r) => r.data),
  });

  if (!companyId && !isSuperadmin) {
    return (
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-brand" aria-hidden="true" />
            <h1 className="text-2xl font-semibold text-primary">{t('companies.membersTitle')}</h1>
          </div>
          <p className="mt-1 text-sm text-secondary">{t('companies.membersNoCompany')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-brand" aria-hidden="true" />
          <h1 className="text-2xl font-semibold text-primary">{t('companies.membersTitle')}</h1>
        </div>
        <p className="mt-1 text-sm text-muted">
          {isSuperadmin && !companyId
            ? t('companies.selectCompanyHint')
            : t('companies.membersSubtitle')}
        </p>
      </div>

      {/* Superadmin company selector */}
      {isSuperadmin ? (
        <section className="rounded-xl border border-default bg-surface p-4">
          <label className={labelClass} htmlFor="company-select">
            {t('common.company')}
          </label>
          <select
            id="company-select"
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className={inputClass}
          >
            <option value="">{t('common.selectCompany')}</option>
            {(companiesData?.results ?? []).map((company) => (
              <option key={company.id} value={String(company.id)}>
                {company.name}
              </option>
            ))}
          </select>
        </section>
      ) : null}

      {/* Empty state — no company selected yet */}
      {!companyId ? (
        <section className="rounded-xl border border-default bg-surface p-6">
          <p className="text-sm text-secondary">{t('companies.selectCompanyToView')}</p>
        </section>
      ) : null}

      {/* Invitations panel */}
      {companyId ? <InvitesPanel companyId={companyId} /> : null}
    </div>
  );
}
