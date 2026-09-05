import { useQuery } from '@tanstack/react-query';
import { getAdminPartners, getPartner, getPartners } from '../services/partnersService';

export const partnersQueryKey = ['partners'] as const;
export const adminPartnersQueryKey = ['admin-partners'] as const;

export function usePartners(enabled = true) {
  return useQuery({
    queryKey: partnersQueryKey,
    queryFn: getPartners,
    enabled,
  });
}

export function usePartner(slug: string, enabled = true) {
  return useQuery({
    queryKey: [...partnersQueryKey, slug],
    queryFn: () => getPartner(slug),
    enabled: enabled && slug.length > 0,
  });
}

export function useAdminPartners() {
  return useQuery({
    queryKey: adminPartnersQueryKey,
    queryFn: getAdminPartners,
  });
}
