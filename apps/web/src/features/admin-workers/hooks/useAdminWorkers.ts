import { useQuery } from '@tanstack/react-query';
import { getAdminWorkers } from '../services/adminWorkersService';

export const adminWorkersQueryKey = ['admin-workers'] as const;

export function useAdminWorkers() {
  return useQuery({
    queryKey: adminWorkersQueryKey,
    queryFn: getAdminWorkers,
  });
}
