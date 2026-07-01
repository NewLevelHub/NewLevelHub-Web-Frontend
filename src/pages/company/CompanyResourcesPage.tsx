import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  RESOURCE_TYPE_LABEL_KEYS,
  RESOURCE_TYPES,
  BOOKING_RESOURCE_CATALOG_STATUS,
  type ResourceType,
} from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { ResourceCard, ResourceCardSkeleton } from '@/shared/ui/ResourceCard';
import { CompanyResourceDetailModal } from '@/shared/ui/ResourceDetailModal';
import { BookingModal } from '@/shared/ui/BookingModal';
import type { BookingResourceListItem, PaginatedResponse } from '@/shared/types';

const PAGE_SIZE = 20;

// ── Type filter chips ─────────────────────────────────────────────────────────

const TYPE_FILTER_OPTIONS: Array<{ value: ResourceType | 'all'; labelKey: string }> = [
  { value: 'all', labelKey: 'companyHub.resourcesFilterAll' },
  { value: RESOURCE_TYPES.MEETING_ROOM, labelKey: RESOURCE_TYPE_LABEL_KEYS[RESOURCE_TYPES.MEETING_ROOM] },
  { value: RESOURCE_TYPES.DESK, labelKey: RESOURCE_TYPE_LABEL_KEYS[RESOURCE_TYPES.DESK] },
  { value: RESOURCE_TYPES.CAPSULE, labelKey: RESOURCE_TYPE_LABEL_KEYS[RESOURCE_TYPES.CAPSULE] },
  { value: RESOURCE_TYPES.PARKING, labelKey: RESOURCE_TYPE_LABEL_KEYS[RESOURCE_TYPES.PARKING] },
];

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CompanyResourcesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<ResourceType | 'all'>('all');
  const [onlyFree, setOnlyFree] = useState(false);
  const [detailResource, setDetailResource] = useState<BookingResourceListItem | null>(null);
  const [bookingResource, setBookingResource] = useState<BookingResourceListItem | null>(null);

  const companyId = user?.company_id;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['company-resources', companyId, page, typeFilter, onlyFree],
    enabled: companyId != null,
    queryFn: async () => {
      const params: Record<string, unknown> = {
        assigned_company: companyId,
        page,
        page_size: PAGE_SIZE,
      };
      if (typeFilter !== 'all') params['type'] = typeFilter;
      if (onlyFree) params['status'] = BOOKING_RESOURCE_CATALOG_STATUS.FREE;
      const { data: res } = await apiClient.get<PaginatedResponse<BookingResourceListItem>>(
        API.bookings.resources.list,
        { params },
      );
      return res;
    },
  });

  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const results = data?.results ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {isError && (
        <div
          role="alert"
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--danger-bg)',
            background: 'var(--danger-bg)',
            fontSize: 13,
            color: 'var(--danger)',
          }}
        >
          {t('companyHub.resourcesError')}
        </div>
      )}

      {/* Filter row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {TYPE_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => { setTypeFilter(opt.value); setPage(1); }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '5px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              border: '1px solid',
              borderColor: typeFilter === opt.value ? 'var(--brand)' : 'var(--border)',
              background: typeFilter === opt.value ? 'var(--brand-subtle)' : 'var(--bg-surface)',
              color: typeFilter === opt.value ? 'var(--brand-text, var(--brand))' : 'var(--text-secondary)',
              transition: 'all 0.15s',
            }}
          >
            {t(opt.labelKey)}
          </button>
        ))}

        <div
          style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }}
        />

        <button
          type="button"
          onClick={() => { setOnlyFree((v) => !v); setPage(1); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 12px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            border: '1px solid',
            borderColor: onlyFree ? 'var(--success)' : 'var(--border)',
            background: onlyFree ? 'var(--status-free-bg, rgba(52,211,153,0.12))' : 'var(--bg-surface)',
            color: onlyFree ? 'var(--success)' : 'var(--text-secondary)',
            transition: 'all 0.15s',
          }}
        >
          {onlyFree && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--success)',
                display: 'inline-block',
              }}
            />
          )}
          {t('companyHub.resourceStatusFree')}
        </button>
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 14,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <ResourceCardSkeleton key={i} />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div
          style={{
            padding: '40px 20px',
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--text-muted)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          {t('companyHub.resourcesEmpty')}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 14,
          }}
        >
          {results.map((r) => (
            <ResourceCard
              key={r.id}
              resource={r}
              onDetails={() => setDetailResource(r)}
              onBook={() => setBookingResource(r)}
            />
          ))}
        </div>
      )}

      <CompanyResourceDetailModal
        resource={detailResource}
        onClose={() => setDetailResource(null)}
        onBook={() => {
          if (detailResource) setBookingResource(detailResource);
          setDetailResource(null);
        }}
      />

      {bookingResource && (
        <BookingModal
          resource={bookingResource}
          open={true}
          onClose={() => setBookingResource(null)}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 8,
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {page} / {totalPages} · {totalCount}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{
                height: 30,
                padding: '0 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                fontSize: 12,
                cursor: 'pointer',
                opacity: page <= 1 ? 0.4 : 1,
              }}
            >
              {t('common.back')}
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{
                height: 30,
                padding: '0 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                fontSize: 12,
                cursor: 'pointer',
                opacity: page >= totalPages ? 0.4 : 1,
              }}
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
