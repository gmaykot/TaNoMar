import { formatBrlFromCents, type PlanCatalog } from '@/features/subscription/subscriptionPlans';
import type { CheckoutIntent } from './checkoutIntent';

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

export function billingCycleLabel(cycle: BillingCycle | null | undefined) {
  if (cycle === 'YEARLY') return 'anual';
  if (cycle === 'MONTHLY') return 'mensal';
  return null;
}

export function billingPlanLabel(code: string | null | undefined) {
  if (code === 'arrais') return 'Arrais';
  if (code === 'premium') return 'Mestre';
  if (code === 'capitao') return 'Capitão';
  return null;
}

export function canResumePendingCheckout(billing: BillingSubscription | null | undefined) {
  return (
    billing?.enabled === true &&
    billing.status === 'pending' &&
    Boolean(billing.planCode) &&
    Boolean(billing.cycle)
  );
}

export function canCancelRenewal(billing: BillingSubscription | null | undefined) {
  if (!billing?.enabled) return false;
  return (
    (billing.status === 'active' || billing.status === 'past_due') && !billing.cancelAtPeriodEnd
  );
}

export function cancelRenewalConfirmMessage(accessUntilLabel: string | null) {
  const until = accessUntilLabel ?? 'o fim da vigência já paga';
  return `O plano permanece vigente até ${until}. Depois disso, a conta volta para Free. O valor já pago não é estornado.`;
}

export function formatBillingReais(value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  return formatBrlFromCents(Math.round(value * 100));
}

export function isPartialFirstCharge(billing: BillingSubscription) {
  if (billing.contractedPrice === null || billing.renewalPrice === null) return false;
  return Math.round(billing.contractedPrice * 100) !== Math.round(billing.renewalPrice * 100);
}

export function isCheckoutConfirmed(
  user:
    | {
        plan: { code: string; name: string };
        billing?: BillingSubscription;
      }
    | null
    | undefined,
  intent: CheckoutIntent | null,
) {
  const billing = user?.billing;
  if (!user || !billing) return false;
  if (billing.status !== 'active') return false;
  if (user.plan.code === 'free') return false;
  if (billing.planCode !== user.plan.code) return false;
  if (!intent) return true;
  return user.plan.code === intent.planCode && billing.cycle === intent.cycle;
}

export interface CheckoutConfirmation {
  planName: string;
  cycleLabel: string | null;
  paidLabel: string | null;
  renewalLabel: string | null;
  renewsAtLabel: string | null;
  isPartialFirstCharge: boolean;
}

export function checkoutConfirmationFromBilling(
  billing: BillingSubscription,
  planName: string,
): CheckoutConfirmation {
  return {
    planName,
    cycleLabel: billingCycleLabel(billing.cycle),
    paidLabel: formatBillingReais(billing.contractedPrice),
    renewalLabel: formatBillingReais(billing.renewalPrice),
    renewsAtLabel: formatBillingDate(billing.renewsAt),
    isPartialFirstCharge: isPartialFirstCharge(billing),
  };
}

export function checkoutConfirmationCopy(info: CheckoutConfirmation) {
  const cycle = info.cycleLabel ? ` ${info.cycleLabel}` : '';
  const nextWhen = info.renewsAtLabel
    ? `em ${info.renewsAtLabel}`
    : info.cycleLabel === 'mensal'
      ? 'no próximo mês'
      : 'na próxima renovação';

  if (info.isPartialFirstCharge && info.paidLabel && info.renewalLabel) {
    return {
      title: `Seu plano agora é ${info.planName}.`,
      paid: `Você pagou ${info.paidLabel} agora — só a diferença desta troca.`,
      next: `A próxima cobrança, ${nextWhen}, será o valor integral do ${info.planName}${cycle}: ${info.renewalLabel}. Não é a diferença de novo.`,
    };
  }

  return {
    title: `Seu plano agora é ${info.planName}.`,
    paid: info.paidLabel
      ? `Você pagou ${info.paidLabel}${info.cycleLabel ? ` no ciclo ${info.cycleLabel}` : ''}.`
      : `O ${info.planName} já está ativo na conta.`,
    next: info.renewalLabel ? `A próxima cobrança, ${nextWhen}, será ${info.renewalLabel}.` : null,
  };
}
