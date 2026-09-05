import { useQuery } from '@tanstack/react-query';
import { getAdminUsers } from '../services/adminUsersService';

export const adminUsersQueryKey = ['admin-users'] as const;

export function useAdminUsers() {
  return useQuery({
    queryKey: adminUsersQueryKey,
    queryFn: getAdminUsers,
  });
}
