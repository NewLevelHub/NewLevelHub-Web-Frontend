import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { RESOURCE_TYPE_LABELS, type ResourceType } from '@/shared/config/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { resolveMediaUrl } from '@/shared/lib/mediaUrl';
import {
  resBadgeOff,
  resBadgeOn,
  resEmptyState,
  resErrorBanner,
  resPageBtn,
  resPaginationBar,
  resPaginationMeta,
  resPhotoThumb,
  resPlaceholderIconBox,
  resSubtitle,
  resTableBody,
  resTableShell,
  resTd,
  resTdMuted,
  resTdStrong,
  resThead,
  resTr,
  resTitle,
  resourcePageWide,
} from '@/shared/ui/resourcePageStyles';
import type { BookingResourceListItem, PaginatedResponse } from '@/shared/types';

const PAGE_SIZE = 20;

export default function CompanyResourcesPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);

  const companyId = user?.company_id;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['company-resources', companyId, page],
    enabled: companyId != null,
    queryFn: async () => {
      const { data: res } = await apiClient.get<PaginatedResponse<BookingResourceListItem>>(
        API.bookings.resources.list,
        { params: { assigned_company: companyId, page, page_size: PAGE_SIZE } },
      );
      return res;
    },
  });

  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const results = data?.results ?? [];

  return (
    <main className={resourcePageWide}>
      <div>
        <h1 className={resTitle}>Ресурсы компании</h1>
        <p className={resSubtitle}>Рабочие места, переговорные, парковки и капсулы, закреплённые за вашей компанией.</p>
      </div>

      {isError && (
        <div role="alert" className={resErrorBanner}>
          Не удалось загрузить ресурсы. Проверьте соединение и попробуйте снова.
        </div>
      )}

      <div className={resTableShell}>
        {isLoading ? (
          <div className={resEmptyState}>Загрузка…</div>
        ) : results.length === 0 ? (
          <div className={resEmptyState}>
            За вашей компанией не закреплено ни одного ресурса.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className={resThead}>
                <tr>
                  <th className="px-4 py-3 font-medium">Фото</th>
                  <th className="px-4 py-3 font-medium">Название</th>
                  <th className="px-4 py-3 font-medium">Тип</th>
                  <th className="px-4 py-3 font-medium">Этаж</th>
                  <th className="px-4 py-3 font-medium">Зона</th>
                  <th className="px-4 py-3 font-medium">Вместимость</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                  <th className="w-28 px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className={resTableBody}>
                {results.map((r) => (
                  <tr key={r.id} className={resTr}>
                    <td className="px-4 py-2">
                      {(() => {
                        const src =
                          r.photos?.[0]?.image_url ??
                          r.photos?.[0]?.image ??
                          (r.photo ? resolveMediaUrl(r.photo) ?? r.photo : null);
                        return src ? (
                          <img src={src} alt="" className={resPhotoThumb} />
                        ) : (
                          <div className={resPlaceholderIconBox}>
                            <Bookmark className="h-4 w-4 text-muted" />
                          </div>
                        );
                      })()}
                    </td>
                    <td className={resTdStrong}>{r.name}</td>
                    <td className={resTd}>{RESOURCE_TYPE_LABELS[r.type as ResourceType] ?? r.type}</td>
                    <td className={resTdMuted}>{r.floor}</td>
                    <td className={resTdMuted}>{r.zone || '—'}</td>
                    <td className={resTdMuted}>{r.capacity}</td>
                    <td className="px-4 py-2">
                      <span className={r.is_active ? resBadgeOn : resBadgeOff}>
                        {r.is_active ? 'Активен' : 'Выключен'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        to={`/bookings/resources/${r.id}`}
                        className="text-sm font-medium text-blue-600 hover:underline"
                      >
                        Открыть
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className={resPaginationBar}>
            <p className={resPaginationMeta}>
              Стр. {page} из {totalPages} · всего {totalCount}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={resPageBtn}
              >
                <ChevronLeft className="h-4 w-4" />
                Назад
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={resPageBtn}
              >
                Вперёд
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
