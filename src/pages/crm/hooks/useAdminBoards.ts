import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { API } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import { useUser } from '@/shared/hooks/useAuth';
import { companiesCacheRoot } from '@/shared/lib/companyQueryKeys';
import type { CrmBoard, Company } from '@/shared/types';

export function useAdminBoards() {
  const user = useUser();
  const navigate = useNavigate();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: companies } = useQuery({
    queryKey: [...companiesCacheRoot(user?.id)],
    queryFn: async () => {
      const { data } = await apiClient.get<Company[] | { results: Company[] }>(API.companies.list);
      return Array.isArray(data) ? data : data.results;
    },
  });

  const { data: boards, isLoading, isError } = useQuery({
    queryKey: ['crm', 'boards', 'admin', selectedCompanyId],
    queryFn: async () => {
      const url = selectedCompanyId
        ? `${API.crm.boards}?company_id=${selectedCompanyId}`
        : API.crm.boards;
      const { data } = await apiClient.get<CrmBoard[] | { results: CrmBoard[] }>(url);
      return Array.isArray(data) ? data : data.results;
    },
  });

  const companyMap = useMemo(
    () => new Map<number, string>(companies?.map((c) => [c.id, c.name]) ?? []),
    [companies],
  );

  const filtered = useMemo(
    () => boards?.filter((b) => b.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [boards, searchQuery],
  );

  const handleBoardClick = (board: CrmBoard) => {
    void navigate(`/crm/boards/${board.id}`, {
      state: {
        backTo: '/superadmin/crm/boards',
        companyName: companyMap.get(board.company),
      },
    });
  };

  return {
    companies,
    selectedCompanyId,
    setSelectedCompanyId,
    searchQuery,
    setSearchQuery,
    companyMap,
    filtered,
    isLoading,
    isError,
    handleBoardClick,
  };
}
