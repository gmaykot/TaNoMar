import { useQuery } from '@tanstack/react-query';
import { getSubscriptionPlans } from '../services/subscriptionPlansService';

export const subscriptionPlansQueryKey = ['plans'] as const;

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: subscriptionPlansQueryKey,
    queryFn: getSubscriptionPlans,
  });
}
