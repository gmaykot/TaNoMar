import { useQuery } from '@tanstack/react-query';
import { getBillingCatalog } from '../services/billingService';

export const billingCatalogQueryKey = ['billing', 'catalog'] as const;

export function useBillingCatalog() {
  return useQuery({
    queryKey: billingCatalogQueryKey,
    queryFn: getBillingCatalog,
  });
}
