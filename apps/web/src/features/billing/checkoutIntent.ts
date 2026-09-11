import type { BillingCycle } from './billing';

export interface CheckoutIntent {
  planCode: string;
  cycle: BillingCycle;
}

const storageKey = 'tanomar.checkoutIntent';

export function saveCheckoutIntent(intent: CheckoutIntent) {
  sessionStorage.setItem(storageKey, JSON.stringify(intent));
}

export function readCheckoutIntent(): CheckoutIntent | null {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { planCode?: unknown; cycle?: unknown };
    if (
      typeof parsed.planCode !== 'string' ||
      (parsed.cycle !== 'MONTHLY' && parsed.cycle !== 'YEARLY')
    ) {
      return null;
    }
    return { planCode: parsed.planCode, cycle: parsed.cycle };
  } catch {
    return null;
  }
}

export function clearCheckoutIntent() {
  sessionStorage.removeItem(storageKey);
}
