import { fetchProceduresList } from '@/lib/api';

export const proceduresListQueryKey = ['procedures-list'] as const;

export const proceduresListQueryOptions = {
  queryKey: proceduresListQueryKey,
  queryFn: () => fetchProceduresList(),
  staleTime: 60_000,
} as const;
