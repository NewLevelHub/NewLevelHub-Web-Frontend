import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Search, Star } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { API } from '@/shared/api/endpoints';
import {
  SERVICE_REQUEST_STATUSES,
  SERVICE_REQUEST_TYPES,
  USER_ROLES,
  type ServiceRequestStatus,
  type ServiceRequestType,
} from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { fmtDate } from '@/shared/lib/formatDate';
import type { PaginatedResponse, ServiceFloor } from '@/shared/types';
import ServiceRequestCreateModal from '@/pages/service-requests/components/ServiceRequestCreateModal';
import ServiceRequestDrawer from '@/pages/service-requests/components/ServiceRequestDrawer';
import { AvatarCircle } from '@/pages/service-requests/components/ServiceRequestAvatar';
import { TypeBadge, StatusBadge, UrgBadge } from '@/pages/service-requests/components/ServiceRequestBadges';
import { useServiceRequests } from '@/pages/service-requests/hooks/useServiceRequests';
import type { ServiceRequestFilters } from '@/pages/service-requests/hooks/useServiceRequests';
import type { ServiceRequest } from '@/shared/types';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ServiceRequestListPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const isSA = user?.role === USER_ROLES.SUPERADMIN;
  const isSM = user?.role === USER_ROLES.SERVICE_MANAGER;
  const isCA = user?.role === USER_ROLES.COMPANY_ADMIN;

  const [fType,    setFType]    = useState<ServiceRequestType | ''>('');
  const [fStatus,  setFStatus]  = useState<ServiceRequestStatus | ''>('');
  const [fUrg,     setFUrg]     = useState<'normal' | 'urgent' | ''>('');
  const [fFloor,   setFFloor]   = useState('');
  const [fCompany, setFCompany] = useState('');
  const [page,     setPage]     = useState(1);

  const [showCreate,      setShowCreate]      = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);

  const filters: ServiceRequestFilters = {
    type: fType,
    status: fStatus,
    urgency: fUrg,
    floorId: fFloor,
    company: fCompany,
    page,
  };

  const { requests: rows, total, isLoading, pageSize } = useServiceRequests(filters, isSA || isSM);

  const { data: floorsData } = useQuery({
    queryKey: ['building-floors'],
    queryFn: () =>
      apiClient
        .get<ServiceFloor[] | PaginatedResponse<ServiceFloor>>(API.serviceRequests.floors, { params: { page_size: 500 } })
        .then((r) => {
          const d = r.data;
          return Array.isArray(d) ? d : d.results;
        }),
  });

  const floors    = floorsData ?? [];
  const pageCount = Math.ceil(total / pageSize);
  const pageStart = (page - 1) * pageSize + 1;
  const pageEnd   = Math.min(page * pageSize, total);

  const filtersActive = !!(fType || fStatus || fUrg || fFloor || fCompany);

  function resetFilters() {
    setFType(''); setFStatus(''); setFUrg(''); setFFloor(''); setFCompany(''); setPage(1);
  }

  const greeting = (isSA || isSM)
    ? t('serviceRequests.greetingAll')
    : isCA
    ? (user?.company_name ? `${user.company_name} · ${t('serviceRequests.greetingCompany')}` : t('serviceRequests.greetingCompany'))
    : t('serviceRequests.greetingMy');

  const selStyle: React.CSSProperties = {
    padding: '6px 10px',
    borderRadius: 'var(--radius-sm)',
    fontSize: 12,
    border: '1px solid var(--border)',
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    fontFamily: 'inherit',
    outline: 'none',
    cursor: 'pointer',
  };

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

  const isElevated = isCA || isSA || isSM;

  const colCount =
    6 +
    (isElevated ? 1 : 0) +
    (isSA || isSM ? 1 : 0) +
    (isElevated ? 1 : 0) +
    (isSA || isSM ? 1 : 0) +
    1;

  return (
    <div>
      {/* Page head */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>
            {t('serviceRequests.title')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            {greeting}
          </div>
        </div>
        {user?.role !== USER_ROLES.SERVICE_MANAGER && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 32, padding: '0 12px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'var(--brand)',
              color: 'var(--text-onbrand)',
              fontSize: 13, fontWeight: 500,
              cursor: 'pointer', whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            + {t('serviceRequests.createBtn')}
          </button>
        )}
      </div>

      {/* Table card */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
      }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center',
          gap: 8, padding: '12px 14px',
          borderBottom: '1px solid var(--border-faint)',
          flexWrap: 'wrap',
        }}>
          <select style={selStyle} value={fType}
            onChange={(e) => { setFType(e.target.value as ServiceRequestType | ''); setPage(1); }}>
            <option value="">{t('serviceRequests.filterAllTypes')}</option>
            <option value={SERVICE_REQUEST_TYPES.CLEANING}>{t('common.serviceRequestType.cleaning')}</option>
            <option value={SERVICE_REQUEST_TYPES.REPAIR}>{t('common.serviceRequestType.repair')}</option>
            <option value={SERVICE_REQUEST_TYPES.SUPPLIES}>{t('common.serviceRequestType.supplies')}</option>
            <option value={SERVICE_REQUEST_TYPES.GENERAL}>{t('common.serviceRequestType.general')}</option>
          </select>

          <select style={selStyle} value={fStatus}
            onChange={(e) => { setFStatus(e.target.value as ServiceRequestStatus | ''); setPage(1); }}>
            <option value="">{t('serviceRequests.filterAllStatuses')}</option>
            <option value={SERVICE_REQUEST_STATUSES.NEW}>{t('common.serviceRequestStatus.new')}</option>
            <option value={SERVICE_REQUEST_STATUSES.ACCEPTED}>{t('common.serviceRequestStatus.accepted')}</option>
            <option value={SERVICE_REQUEST_STATUSES.IN_PROGRESS}>{t('common.serviceRequestStatus.in_progress')}</option>
            <option value={SERVICE_REQUEST_STATUSES.COMPLETED}>{t('common.serviceRequestStatus.completed')}</option>
          </select>

          <select style={selStyle} value={fUrg}
            onChange={(e) => { setFUrg(e.target.value as 'normal' | 'urgent' | ''); setPage(1); }}>
            <option value="">{t('serviceRequests.filterAllUrgency')}</option>
            <option value="normal">{t('serviceRequests.urgencyNormal')}</option>
            <option value="urgent">{t('serviceRequests.urgencyUrgent')}</option>
          </select>

          <select style={selStyle} value={fFloor}
            onChange={(e) => { setFFloor(e.target.value); setPage(1); }}>
            <option value="">{t('serviceRequests.filterAllFloors')}</option>
            {floors.map((f) => (
              <option key={f.id} value={String(f.id)}>
                {f.name?.trim() ? `${f.number} — ${f.name}` : String(f.number)}
              </option>
            ))}
          </select>

          {isSA && (
            <select style={selStyle} value={fCompany}
              onChange={(e) => { setFCompany(e.target.value); setPage(1); }}>
              <option value="">{t('serviceRequests.filterAllCompanies')}</option>
            </select>
          )}

          {filtersActive && (
            <button type="button" onClick={resetFilters} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 26, padding: '0 8px',
              borderRadius: 'var(--radius-sm)',
              border: 'none', background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
            }}>
              {t('common.resetFilters')}
            </button>
          )}

          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
            {total} {t('serviceRequests.requestsCount')}
          </span>
        </div>

        {/* Table */}
        {isLoading ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            {t('common.loading')}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={thStyle}>{t('serviceRequests.colType')}</th>
                  <th style={thStyle}>{t('serviceRequests.colDescription')}</th>
                  <th style={thStyle}>{t('serviceRequests.colFloor')}</th>
                  <th style={thStyle}>{t('serviceRequests.colLocation')}</th>
                  <th style={thStyle}>{t('serviceRequests.colStatus')}</th>
                  <th style={thStyle}>{t('serviceRequests.colUrgency')}</th>
                  {isElevated && <th style={thStyle}>{t('serviceRequests.colAuthor')}</th>}
                  {(isSA || isSM) && <th style={thStyle}>{t('serviceRequests.colCompany')}</th>}
                  {isElevated && <th style={thStyle}>{t('serviceRequests.managementAssign')}</th>}
                  {(isSA || isSM) && <th style={thStyle}>{t('serviceRequests.colRating')}</th>}
                  <th style={thStyle}>{t('serviceRequests.colCreated')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={colCount} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                        <Search size={28} />
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>
                        {t('serviceRequests.emptyTitle')}
                      </div>
                      {filtersActive && (
                        <button type="button" onClick={resetFilters} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          height: 26, padding: '0 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)', background: 'transparent',
                          color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer',
                        }}>
                          {t('common.resetFilters')}
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const authorName   = r.created_by?.full_name ?? '—';
                    const companyName  = r.company?.name ?? '—';
                    const assigneeName = r.assigned_to?.full_name ?? '—';
                    return (
                      <tr
                        key={r.id}
                        onClick={() => setSelectedRequest(r)}
                        style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-hover)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}
                      >
                        <td style={tdStyle}><TypeBadge type={r.request_type} /></td>
                        <td style={{ ...tdStyle, maxWidth: 220 }}>
                          <div style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.description}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                            #{String(r.id).padStart(4, '0')}
                          </div>
                        </td>
                        <td style={{ ...tdStyle, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {r.floor_number != null
                            ? (r.floor_name?.trim() ? `${r.floor_number} — ${r.floor_name}` : t('serviceRequests.floorNumber', { n: r.floor_number }))
                            : '—'}
                        </td>
                        <td style={{ ...tdStyle, color: 'var(--text-secondary)', maxWidth: 120 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.location || '—'}
                          </div>
                        </td>
                        <td style={tdStyle}><StatusBadge status={r.status} /></td>
                        <td style={tdStyle}><UrgBadge urgency={r.urgency} /></td>
                        {isElevated && (
                          <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <AvatarCircle avatar={r.created_by?.avatar} name={authorName} />
                              <span>{authorName}</span>
                            </div>
                          </td>
                        )}
                        {(isSA || isSM) && (
                          <td style={tdStyle}>
                            {companyName !== '—' ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {r.company?.logo && (
                                  <img
                                    src={r.company.logo}
                                    alt=""
                                    style={{ width: 20, height: 20, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
                                  />
                                )}
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center',
                                  padding: '2px 8px',
                                  borderRadius: 6, fontSize: 11, fontWeight: 600,
                                  whiteSpace: 'nowrap',
                                  background: 'var(--success-bg)', color: 'var(--success-text)',
                                }}>
                                  {companyName}
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
                            )}
                          </td>
                        )}
                        {isElevated && (
                          <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>
                            {assigneeName !== '—' ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <AvatarCircle
                                  avatar={r.assigned_to?.avatar ?? null}
                                  name={assigneeName}
                                />
                                <span>{assigneeName}</span>
                              </div>
                            ) : (
                              <span>{assigneeName}</span>
                            )}
                          </td>
                        )}
                        {(isSA || isSM) && (
                          <td style={tdStyle}>
                            {r.status === 'completed' ? (
                              r.rating != null ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  {[1,2,3,4,5].map(star => (
                                    <Star
                                      key={star}
                                      size={13}
                                      className={cn(star <= r.rating! ? 'fill-amber-400 stroke-amber-500' : 'stroke-[color:var(--text-muted)] fill-none')}
                                    />
                                  ))}
                                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 2 }}>{r.rating}</span>
                                </div>
                              ) : (
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                              )
                            ) : (
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                            )}
                          </td>
                        )}
                        <td style={{ ...tdStyle, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {fmtDate(r.created_at)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && pageCount > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderTop: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {pageStart}–{pageEnd} / {total}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: Math.min(pageCount, 7) }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  style={{
                    width: 28, height: 28, borderRadius: 6, border: '1px solid',
                    borderColor: page === n ? 'var(--brand)' : 'var(--border)',
                    background: page === n ? 'var(--brand-subtle)' : 'transparent',
                    color: page === n ? 'var(--brand)' : 'var(--text-muted)',
                    fontSize: 12, fontWeight: page === n ? 700 : 400, cursor: 'pointer',
                  }}
                  aria-current={page === n ? 'page' : undefined}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <ServiceRequestCreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => setShowCreate(false)}
      />

      <ServiceRequestDrawer
        id={selectedRequest?.id ?? null}
        onClose={() => setSelectedRequest(null)}
        isAdmin={isElevated}
        canChangeStatus={isElevated}
        isSuperadmin={isSA}
        isServiceManager={isSM}
      />
    </div>
  );
}
