import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelBillingSubscription, startBillingCheckout } from '../services/billingService';
import type { BillingCycle } from '../billing';
import { billingCatalogQueryKey } from './useBillingCatalog';

export function useBillingCheckout() {
  return useMutation({
    mutationFn: ({ planCode, cycle }: { planCode: string; cycle: BillingCycle }) =>
      startBillingCheckout(planCode, cycle),
    onSuccess: (checkout) => {
      window.location.assign(checkout.checkoutUrl);
    },
  });
}

export function useCancelBillingSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelBillingSubscription,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['me'] }),
        queryClient.invalidateQueries({ queryKey: billingCatalogQueryKey }),
      ]);
    },
  });
}
