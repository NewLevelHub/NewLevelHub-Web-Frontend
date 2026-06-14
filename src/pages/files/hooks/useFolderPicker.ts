import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import type { PaginatedResponse, StorageFolder } from '@/shared/types';
import type { StorageScope } from '@/pages/files/types';

export function useFolderPicker(scope: StorageScope) {
  const foldersQuery = useQuery({
    queryKey: ['storage', 'folders', scope, 'all'],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<StorageFolder>>(API.storage.folders, { params: { scope, page_size: 200 } })
        .then((r) => r.data.results),
  });

  return foldersQuery;
}
