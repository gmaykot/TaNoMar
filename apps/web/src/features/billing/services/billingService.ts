import { apiRequest } from '@/shared/api/client';
import type { BillingCycle } from '../billing';
import {
  parseBillingCatalog,
  parseBillingCheckout,
  parseBillingSubscription,
} from '../mappers/billingMapper';

export async function getBillingCatalog() {
  return parseBillingCatalog(await apiRequest('/billing/catalog'));
}

export async function getBillingSubscription() {
  return parseBillingSubscription(await apiRequest('/billing/subscription'));
}

export async function startBillingCheckout(planCode: string, cycle: BillingCycle) {
  return parseBillingCheckout(
    await apiRequest('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ planCode, cycle }),
    }),
  );
}

export async function cancelBillingSubscription() {
  return parseBillingSubscription(
    await apiRequest('/billing/subscription/cancel', { method: 'POST' }),
  );
}
