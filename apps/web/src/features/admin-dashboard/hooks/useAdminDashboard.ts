import { useQuery } from '@tanstack/react-query';
import { getAdminDashboard } from '../services/adminDashboardService';

export const adminDashboardQueryKey = ['admin-dashboard'] as const;

export function useAdminDashboard() {
  return useQuery({
    queryKey: adminDashboardQueryKey,
    queryFn: getAdminDashboard,
  });
}
