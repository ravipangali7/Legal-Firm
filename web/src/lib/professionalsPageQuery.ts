import { fetchProfessionalsPage } from '@/lib/api';

export const professionalsPageQueryKey = ['professionals-page'] as const;

export const professionalsPageQueryOptions = {
  queryKey: professionalsPageQueryKey,
  queryFn: fetchProfessionalsPage,
  retry: 1,
  staleTime: 60_000,
} as const;
