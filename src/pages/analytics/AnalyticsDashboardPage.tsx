import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Archive,
  CalendarDays,
  Download,
  FileDown,
  HardDrive,
  Lock,
  QrCode,
  Ticket,
  Users2,
} from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { USER_ROLES } from '@/shared/config/constants';
import { getApiError } from '@/shared/lib/getApiError';
import {
  filenameFromContentDisposition,
  triggerCsvFileDownload,
} from '@/shared/lib/csvDownload';
import { useAuthStore } from '@/shared/store/auth';
import type { CompanyAnalytics, CompanyDetail, CompanyLimits } from '@/shared/types';
import { Button } from '@/shared/ui/Button';
import { AnalyticsPeriodFilter } from '@/pages/analytics/components/AnalyticsPeriodFilter';
import type { PeriodValue } from '@/pages/analytics/components/AnalyticsPeriodFilter';
import {
  buildGaugePaths,
  formatFileSize,
} from '@/pages/files/utils/fileBrowserUtils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function isValidIsoDate(v: string): boolean {
  if (!ISO_DATE_RE.test(v)) return false;
  const d = new Date(`${v}T00:00:00`);
  return !Number.isNaN(d.getTime());
}

// ---------------------------------------------------------------------------
// Shared table styles (project standard)
// ---------------------------------------------------------------------------

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 500,
  color: 'var(--text-muted)',
  padding: '8px 12px',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 13,
  color: 'var(--text-primary)',
  verticalAlign: 'middle',
};

// ---------------------------------------------------------------------------
// StorageCard
// ---------------------------------------------------------------------------

interface StorageCardProps {
  usedBytes: number;
  limitBytes: number;
  storagePct: number; // 0..1 float
  t: ReturnType<typeof useTranslation>['t'];
}

function StorageCard({ usedBytes, limitBytes, storagePct, t }: StorageCardProps) {
  const { arcUsed, arcAll } = buildGaugePaths(storagePct);

  const isFull    = storagePct >= 1;
  const isDanger  = storagePct >= 0.85 && storagePct < 1;
  const isWarning = storagePct >= 0.7  && storagePct < 0.85;

  const arcStroke = isFull
    ? '#b91c1c'
    : isDanger
      ? '#ef4444'
      : isWarning
        ? '#f97316'
        : 'var(--brand)';

  const iconBoxStyle: React.CSSProperties = {
    width: 40, height: 40, borderRadius: 11,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: isFull ? '#fecaca' : isDanger ? '#fee2e2' : isWarning ? '#ffedd5' : 'var(--brand-subtle)',
    border: '2px solid var(--bg-surface)',
  };
  const iconColor = isFull ? '#b91c1c' : isDanger ? '#ef4444' : isWarning ? '#f97316' : 'var(--brand-text, var(--brand))';

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '18px 20px',
    }}>
      {/* Card header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        paddingBottom: 10, marginBottom: 12, borderBottom: '1px solid var(--border-faint)',
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          {t('analytics.storageUsage')}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {formatFileSize(usedBytes)}{limitBytes > 0 ? ` / ${formatFileSize(limitBytes)}` : ''}
        </span>
      </div>

      {/* SVG gauge — same viewBox as files page: 0 0 200 106 */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 196, margin: '0 auto' }}>
        <svg viewBox="0 0 200 106" style={{ width: '100%', display: 'block' }} aria-hidden>
          <path d={arcAll}  fill="none" stroke="var(--bg-raised)" strokeWidth="16" strokeLinecap="round" />
          {storagePct > 0 && (
            <path d={arcUsed} fill="none" stroke={arcStroke} strokeWidth="16" strokeLinecap="round" />
          )}
        </svg>
        {/* Centre icon */}
        <div style={{ position: 'absolute', left: '50%', top: '68%', transform: 'translate(-50%, -50%)' }}>
          <div style={iconBoxStyle}>
            <HardDrive size={18} style={{ color: iconColor }} />
          </div>
        </div>
      </div>

      {/* Used / limit text */}
      <div style={{ textAlign: 'center', marginTop: 6, marginBottom: 12 }}>
        <span style={{ display: 'block', fontSize: 21, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', fontFamily: 'var(--font-mono, monospace)' }}>
          {formatFileSize(usedBytes)}
        </span>
        <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {limitBytes > 0 ? `${t('analytics.gbOf')} ${formatFileSize(limitBytes)} ${t('analytics.used')}` : ''}
        </span>
      </div>

    </div>
  );
}

// ---------------------------------------------------------------------------
// CRMCard
// ---------------------------------------------------------------------------

interface CrmData {
  total: number;
  todo: number;
  in_progress: number;
  done: number;
  other: number;
  by_column: { name: string; count: number }[];
}

interface CRMCardProps {
  crm: CrmData;
  t: ReturnType<typeof useTranslation>['t'];
}

function CRMCard({ crm, t }: CRMCardProps) {
  const statuses = [
    { label: t('analytics.crmTodo'), val: crm.todo, color: 'var(--info)' },
    { label: t('analytics.crmInProgress'), val: crm.in_progress, color: 'var(--brand)' },
    { label: t('analytics.crmDone'), val: crm.done, color: 'var(--success)' },
    {
      label: t('analytics.crmOther'),
      val: crm.other,
      color: 'var(--text-subtle, var(--text-muted))',
    },
  ];
  const total = crm.total || 1;

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          paddingBottom: 10,
          marginBottom: 12,
          borderBottom: '1px solid var(--border-faint)',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          {t('analytics.crmByStatus')}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {crm.total} {t('analytics.crmTotal')}
        </span>
      </div>
      {statuses.map((s, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 0',
            borderBottom:
              i < statuses.length - 1 ? '1px solid var(--border-faint)' : 'none',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: s.color,
              flexShrink: 0,
            }}
          />
          <span style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)' }}>
            {s.label}
          </span>
          <div
            style={{
              flex: '0 0 120px',
              height: 5,
              borderRadius: 3,
              background: 'var(--bg-raised)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.round((s.val / total) * 100)}%`,
                background: s.color,
                opacity: 0.82,
              }}
            />
          </div>
          <span
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              width: 22,
              textAlign: 'right',
            }}
          >
            {s.val}
          </span>
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              width: 32,
              textAlign: 'right',
            }}
          >
            {Math.round((s.val / total) * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// KpiCard
// ---------------------------------------------------------------------------

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value?: React.ReactNode;
  sub?: string;
  locked: boolean;
}

function KpiCard({ icon: IconComponent, label, value, sub, locked }: KpiCardProps) {
  const { t } = useTranslation();
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 18px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 8,
        }}
      >
        <IconComponent size={12} aria-hidden />
        {label}
      </div>
      {locked ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            color: 'var(--text-subtle, var(--text-muted))',
            fontSize: 13,
            opacity: 0.6,
          }}
        >
          <Lock size={10} aria-hidden />
          {t('analytics.lockedPlan')}
        </div>
      ) : (
        <>
          <div
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
            }}
          >
            {value}
          </div>
          {sub && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              {sub}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AnalyticsDashboardPage() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN;

  const companyId = user?.company_id ? String(user.company_id) : null;

  const [period, setPeriod] = useState<PeriodValue>('30d');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportPdfError, setExportPdfError] = useState<string | null>(null);

  const { data: companyData } = useQuery({
    queryKey: ['company-detail-plan', companyId],
    enabled: !!companyId,
    queryFn: () =>
      apiClient.get<CompanyDetail>(API.companies.detail(companyId!)).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: limitsData } = useQuery({
    queryKey: ['company-limits', companyId],
    enabled: !!companyId,
    queryFn: () =>
      apiClient.get<CompanyLimits>(API.companies.limits(companyId!)).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const plan = companyData?.plan ?? user?.company?.plan ?? 'basic';
  const isStandard = plan === 'standard' || plan === 'premium';
  const isPremium = plan === 'premium';

  // ---------------------------------------------------------------------------
  // Custom date range validation
  // ---------------------------------------------------------------------------

  const customRangeValid = useMemo(() => {
    if (period !== 'custom') return true;
    if (!dateFrom || !dateTo) return false;
    if (!isValidIsoDate(dateFrom) || !isValidIsoDate(dateTo)) return false;
    if (dateFrom > dateTo) return false;
    return true;
  }, [period, dateFrom, dateTo]);

  const customRangeError = useMemo(() => {
    if (period !== 'custom') return null;
    if (!dateFrom || !dateTo) return t('analytics.customRangeEmpty');
    if (!isValidIsoDate(dateFrom) || !isValidIsoDate(dateTo)) return t('analytics.customRangeFmt');
    if (dateFrom > dateTo) return t('analytics.customRangeOrder');
    return null;
  }, [period, dateFrom, dateTo, t]);

  // ---------------------------------------------------------------------------
  // Build request params
  // ---------------------------------------------------------------------------

  const analyticsParams = useMemo(() => {
    const p: Record<string, string> = { period };
    if (period === 'custom' && customRangeValid && dateFrom && dateTo) {
      p.date_from = dateFrom;
      p.date_to = dateTo;
    }
    return p;
  }, [period, customRangeValid, dateFrom, dateTo]);

  const queryEnabled = isCompanyAdmin && (period !== 'custom' || customRangeValid);

  // ---------------------------------------------------------------------------
  // Period label helper
  // ---------------------------------------------------------------------------

  const periodLabel = useMemo(() => {
    if (period === '7d') return t('analytics.period7d');
    if (period === '90d') return t('analytics.period90d');
    if (period === 'custom' && dateFrom && dateTo) return `${dateFrom} — ${dateTo}`;
    return t('analytics.period30d');
  }, [period, dateFrom, dateTo, t]);

  // ---------------------------------------------------------------------------
  // Data query
  // ---------------------------------------------------------------------------

  const { data, isLoading, isError } = useQuery<CompanyAnalytics>({
    queryKey: ['analytics', 'company-dashboard', analyticsParams],
    queryFn: () =>
      apiClient
        .get<CompanyAnalytics>(API.analytics.companyDashboard, { params: analyticsParams })
        .then((r) => r.data),
    enabled: queryEnabled,
    staleTime: 30_000,
  });

  // ---------------------------------------------------------------------------
  // Export handlers
  // ---------------------------------------------------------------------------

  async function handleExportCsv() {
    try {
      setIsExporting(true);
      setExportError(null);
      const response = await apiClient.get<Blob>(API.analytics.companyExport, {
        params: { ...analyticsParams, format: 'csv' },
        responseType: 'blob',
        headers: { Accept: 'text/csv, */*;q=0.9' },
      });
      const fallback = 'analytics-company.csv';
      const rawCd =
        response.headers['content-disposition'] ??
        (response.headers as { get?: (n: string) => string | undefined }).get?.(
          'content-disposition',
        );
      const filename = filenameFromContentDisposition(rawCd, fallback);
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      triggerCsvFileDownload(blob, filename);
    } catch (e) {
      setExportError(getApiError(e).message);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleExportPdf() {
    if (!queryEnabled) return;
    try {
      setIsExportingPdf(true);
      setExportPdfError(null);
      const response = await apiClient.get<Blob>(API.analytics.companyExport, {
        params: { ...analyticsParams, format: 'pdf' },
        responseType: 'blob',
        headers: { Accept: 'application/pdf' },
      });
      const fallback = 'analytics-company.pdf';
      const rawCd =
        response.headers['content-disposition'] ??
        (response.headers as { get?: (n: string) => string | undefined }).get?.(
          'content-disposition',
        );
      const filename = filenameFromContentDisposition(rawCd, fallback);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      triggerCsvFileDownload(blob, filename);
    } catch (e) {
      setExportPdfError(getApiError(e).message);
    } finally {
      setIsExportingPdf(false);
    }
  }

  if (!isCompanyAdmin) return null;

  // ---------------------------------------------------------------------------
  // Shared JSX blocks — used in both the waiting state and the full render
  // ---------------------------------------------------------------------------

  const locale = i18n.language?.startsWith('ru') ? 'ru-RU' : 'en-US';
  const currentMonthYear = new Date().toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });

  const headerBlock = (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 14,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
          }}
        >
          {t('analytics.companyTitle')}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
          {companyData?.name} · {t(`analytics.plan.${plan}`)} · {currentMonthYear}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {isStandard && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void handleExportCsv()}
            disabled={isExporting || !queryEnabled}
          >
            <Download size={14} aria-hidden />
            {isExporting ? t('analytics.exportingCsv') : t('analytics.exportCsv')}
          </Button>
        )}
        {isPremium && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => void handleExportPdf()}
            disabled={isExportingPdf || !queryEnabled}
          >
            <FileDown size={14} aria-hidden />
            {isExportingPdf ? t('analytics.exportingPdf') : t('analytics.exportPdf')}
          </Button>
        )}
      </div>
    </div>
  );

  const periodFilter = (
    <AnalyticsPeriodFilter
      period={period}
      onPeriodChange={setPeriod}
      dateFrom={dateFrom}
      dateTo={dateTo}
      onDateFromChange={setDateFrom}
      onDateToChange={setDateTo}
      customRangeError={customRangeError}
    />
  );

  // ---------------------------------------------------------------------------
  // Early returns
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-hover" />
        ))}
      </div>
    );
  }

  // Query disabled — waiting for a valid custom date range
  if (!queryEnabled) {
    return (
      <div>
        {headerBlock}
        {periodFilter}
        <div
          style={{
            marginTop: 32,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            color: 'var(--text-muted)',
            fontSize: 13,
          }}
        >
          <span>{t('analytics.customRangePrompt')}</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-sm" style={{ color: 'var(--danger)' }}>
        {t('analytics.loadError')}
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        {headerBlock}
        {periodFilter}
        <div
          style={{
            marginTop: 32,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            color: 'var(--text-muted)',
            fontSize: 13,
          }}
        >
          <span>{t('analytics.customRangePrompt')}</span>
        </div>
      </div>
    );
  }

  const crm = data.active_crm_tasks;

  const storageUsedBytes = limitsData?.storage.used_bytes ?? data?.storage.used ?? 0;
  const storageLimitBytes = limitsData != null
    ? Math.round(limitsData.storage.limit_gb * 1073741824)
    : (data?.storage.limit ?? 0);
  const storagePct = storageLimitBytes > 0
    ? Math.min(1, storageUsedBytes / storageLimitBytes)
    : 0;
  const storagePctInt = Math.round(storagePct * 100);

  return (
    <div>
      {/* Header */}
      {headerBlock}

      {/* Export error */}
      {exportError && (
        <div
          className="rounded-xl px-4 py-3 text-sm mb-3"
          style={{
            border: '1px solid var(--danger)',
            background: 'var(--danger-bg)',
            color: 'var(--danger-text)',
          }}
          role="alert"
        >
          {exportError}
        </div>
      )}
      {exportPdfError && (
        <div
          className="rounded-xl px-4 py-3 text-sm mb-3"
          style={{
            border: '1px solid var(--danger)',
            background: 'var(--danger-bg)',
            color: 'var(--danger-text)',
          }}
          role="alert"
        >
          {exportPdfError}
        </div>
      )}

      {/* Period filter */}
      {periodFilter}

      {/* KPI Grid — 5 columns */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 12,
          marginBottom: 14,
        }}
        className="sm:grid-cols-5"
      >
        <KpiCard
          icon={Users2}
          label={t('analytics.kpiActive')}
          value={data.active_7d}
          sub={t('analytics.kpiActiveSubFixed')}
          locked={false}
        />
        <KpiCard
          icon={CalendarDays}
          label={t('analytics.kpiBookings')}
          value={data.bookings_month}
          sub={periodLabel}
          locked={false}
        />
        <KpiCard
          icon={Archive}
          label={t('analytics.kpiStorage')}
          value={formatFileSize(storageUsedBytes)}
          sub={`${t('analytics.gbOf')} ${formatFileSize(storageLimitBytes)} · ${storagePctInt}%`}
          locked={!isStandard}
        />
        <KpiCard
          icon={Ticket}
          label={t('analytics.kpiCrm')}
          value={crm.total}
          sub={`${crm.todo + crm.in_progress} ${t('analytics.kpiCrmActiveSub')}`}
          locked={!isStandard}
        />
        <KpiCard
          icon={QrCode}
          label={t('analytics.kpiGuests')}
          value={data.guest_visits_month}
          sub={periodLabel}
          locked={!isPremium}
        />
      </div>

      {/* Standard+ section: Storage + CRM 2-col */}
      {isStandard && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 14,
            marginBottom: 14,
          }}
        >
          <StorageCard
            usedBytes={storageUsedBytes}
            limitBytes={storageLimitBytes}
            storagePct={storagePct}
            t={t}
          />
          <CRMCard crm={crm} t={t} />
        </div>
      )}

      {/* Basic upsell banner */}
      {!isStandard && (
        <div
          style={{
            padding: '18px 22px',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--border-strong, var(--border))',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            background: 'var(--bg-raised)',
            marginBottom: 14,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 4,
              }}
            >
              {t('analytics.upsellTitle')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {t('analytics.upsellDesc')}
            </div>
          </div>
          <Button variant="primary" size="sm">
            {t('analytics.upsellCta')}
          </Button>
        </div>
      )}

      {/* Employee table */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          marginBottom: 14,
        }}
      >
        {/* Section head */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            {t('analytics.employeeTable')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {data.employee_activity.length} {t('analytics.employees')}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={thStyle}>{t('analytics.colEmployee')}</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>
                  {t('analytics.colBookings')} ({periodLabel})
                </th>
                {isStandard && (
                  <th style={{ ...thStyle, textAlign: 'right' }}>
                    {t('analytics.colActiveTasks')}
                  </th>
                )}
                <th style={{ ...thStyle, textAlign: 'right' }}>
                  {t('analytics.colLastLogin')}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.employee_activity.length === 0 ? (
                <tr>
                  <td
                    colSpan={isStandard ? 4 : 3}
                    style={{
                      ...tdStyle,
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      padding: '24px 12px',
                    }}
                  >
                    {t('analytics.noData')}
                  </td>
                </tr>
              ) : (
                data.employee_activity.map((row) => {
                  const initials = row.full_name
                    .split(' ')
                    .slice(0, 2)
                    .map((w: string) => w[0]?.toUpperCase() ?? '')
                    .join('');
                  const isActive = row.last_login !== null;

                  return (
                    <tr
                      key={row.user_id}
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background =
                          'var(--bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background = '';
                      }}
                    >
                      {/* Employee name + avatar */}
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 8,
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 11,
                              fontWeight: 700,
                              background: isActive
                                ? 'var(--brand-subtle)'
                                : 'var(--bg-raised)',
                              color: isActive
                                ? 'var(--brand-text, var(--brand))'
                                : 'var(--text-muted)',
                            }}
                          >
                            {initials}
                          </div>
                          <span
                            style={{ fontWeight: 500, color: 'var(--text-primary)' }}
                          >
                            {row.full_name}
                          </span>
                        </div>
                      </td>

                      {/* Bookings */}
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono, monospace)',
                        }}
                      >
                        {row.booking_count_30d}
                      </td>

                      {/* Active tasks — Standard+ only */}
                      {isStandard && (
                        <td
                          style={{
                            ...tdStyle,
                            textAlign: 'right',
                            fontFamily: 'var(--font-mono, monospace)',
                          }}
                        >
                          {row.task_count_active}
                        </td>
                      )}

                      {/* Last login */}
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: 'right',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {row.last_login
                          ? new Date(row.last_login).toLocaleDateString('ru-RU')
                          : t('analytics.never')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Premium — Guest visits */}
      {isPremium && (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 20px',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              paddingBottom: 10,
              marginBottom: 12,
              borderBottom: '1px solid var(--border-faint)',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              {t('analytics.guestVisits')}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {data.guest_visits_month} {t('analytics.guestTotal')}
            </span>
          </div>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div
              style={{
                fontSize: 48,
                fontWeight: 800,
                color: 'var(--brand-text, var(--brand))',
                letterSpacing: '-0.04em',
              }}
            >
              {data.guest_visits_month}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
              {t('analytics.guestThisMonth')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
