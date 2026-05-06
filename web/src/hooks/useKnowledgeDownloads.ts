import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { KnowledgeResourcePublicApi } from '@/lib/api';
import { fetchPublicKnowledgeResources } from '@/lib/api';

export function useKnowledgeDownloads(search: string, activeFilter: string) {
  const { data: apiRows = [], isLoading, isError, error, isFetched } = useQuery({
    queryKey: ['public-knowledge-resources'],
    queryFn: fetchPublicKnowledgeResources,
    staleTime: 60_000,
  });

  const fromApi = isFetched && !isError;

  const rows = useMemo(() => {
    const base: KnowledgeResourcePublicApi[] = apiRows;
    const q = search.trim().toLowerCase();
    return base.filter((r) => {
      if (activeFilter !== 'All' && r.category !== activeFilter) return false;
      if (q) {
        const desc = (r.description || '').toLowerCase();
        if (!r.title.toLowerCase().includes(q) && !desc.includes(q)) return false;
      }
      return true;
    });
  }, [apiRows, search, activeFilter]);

  return {
    rows,
    fromApi,
    isLoading,
    isError,
    error,
    totalResourceCount: apiRows.length,
  };
}
