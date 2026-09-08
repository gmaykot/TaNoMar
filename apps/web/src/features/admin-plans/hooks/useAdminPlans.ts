import { useQuery } from '@tanstack/react-query';
import { getAdminPlans } from '../services/adminPlansService';

export const adminPlansQueryKey = ['admin-plans'] as const;

export function useAdminPlans() {
  return useQuery({
    queryKey: adminPlansQueryKey,
    queryFn: getAdminPlans,
  });
}
