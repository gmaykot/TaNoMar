import type { PlanCatalog } from '@/features/subscription/subscriptionPlans';

export type BillingCycle = 'MONTHLY' | 'YEARLY';
export type BillingStatus = 'inactive' | 'pending' | 'active' | 'past_due' | 'canceled';

export interface BillingQuote {
  kind: 'upgrade';
  cycle: BillingCycle;
  remainingDays: number;
  creditCents: number;
  firstChargeCents: number;
  renewalPriceCents: number;
}

export interface BillingPlan extends PlanCatalog {
  annualPriceCents: number;
  quotes: BillingQuote[];
}

export interface BillingCatalog {
  enabled: boolean;
  discountPercent: number;
  plans: BillingPlan[];
}

export interface BillingSubscription {
  status: BillingStatus;
  planCode: string | null;
  cycle: BillingCycle | null;
  catalogMonthlyPrice: number | null;
  catalogAnnualPrice: number | null;
  contractedPrice: number | null;
  renewalPrice: number | null;
  discountPercent: number;
  renewsAt: string | null;
  accessUntil: string | null;
  cancelAtPeriodEnd: boolean;
  enabled: boolean;
}

export interface BillingCheckout {
  checkoutId: string;
  checkoutUrl: string;
  expiresAt: string;
}

export const ANNUAL_DISCOUNT_PERCENT = 20;

export function annualCents(monthlyPriceCents: number) {
  return Math.round((monthlyPriceCents * 12 * (100 - ANNUAL_DISCOUNT_PERCENT)) / 100);
}

export function planRank(code: string | null | undefined) {
  if (code === 'arrais') return 1;
  if (code === 'premium') return 2;
  if (code === 'capitao') return 3;
  return 0;
}

export function isBillingUpgrade(
  fromPlan: string | null | undefined,
  fromCycle: BillingCycle | null | undefined,
  toPlan: string,
  toCycle: BillingCycle,
) {
  const fromRank = planRank(fromPlan);
  const toRank = planRank(toPlan);
  if (toRank > fromRank) return true;
  return fromRank === toRank && fromCycle === 'MONTHLY' && toCycle === 'YEARLY';
}

export function quoteForCycle(plan: BillingPlan, cycle: BillingCycle) {
  return plan.quotes.find((item) => item.cycle === cycle) ?? null;
}

export function formatBillingDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('pt-BR');
}
