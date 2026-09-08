import { ContractError } from '@/shared/api/errors';
import type { PlanCatalog } from '@/features/subscription/subscriptionPlans';
import { parsePlanCatalog } from '@/features/subscription/mappers/subscriptionPlanMapper';
import type {
  BillingCatalog,
  BillingCheckout,
  BillingCycle,
  BillingPlan,
  BillingQuote,
  BillingStatus,
  BillingSubscription,
} from '../billing';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readInteger(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

function readBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : null;
}

function parseQuote(value: unknown): BillingQuote {
  if (!isRecord(value)) throw new ContractError('Cotação de upgrade inválida.');
  const kind = readString(value.kind);
  const cycle = readString(value.cycle);
  const remainingDays = readInteger(value.remainingDays);
  const creditCents = readInteger(value.creditCents);
  const firstChargeCents = readInteger(value.firstChargeCents);
  const renewalPriceCents = readInteger(value.renewalPriceCents);
  if (
    kind !== 'upgrade' ||
    (cycle !== 'MONTHLY' && cycle !== 'YEARLY') ||
    remainingDays === null ||
    creditCents === null ||
    firstChargeCents === null ||
    renewalPriceCents === null
  ) {
    throw new ContractError('Cotação de upgrade incompleta.');
  }
  return {
    kind,
    cycle,
    remainingDays,
    creditCents,
    firstChargeCents,
    renewalPriceCents,
  };
}

function parseQuotes(value: unknown): BillingQuote[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new ContractError('Cotações de upgrade inválidas.');
  return value.map(parseQuote);
}

function parseBillingPlan(value: unknown): BillingPlan {
  const plan: PlanCatalog = parsePlanCatalog(value);
  if (!isRecord(value)) throw new ContractError('Plano de cobrança inválido.');
  const annualPriceCents = readInteger(value.annualPriceCents);
  if (annualPriceCents === null) throw new ContractError('Preço anual do plano ausente.');
  return {
    ...plan,
    annualPriceCents,
    quotes: parseQuotes(value.quotes),
  };
}

export function parseBillingCatalog(value: unknown): BillingCatalog {
  if (!isRecord(value)) throw new ContractError('Catálogo de cobrança inválido.');
  const enabled = readBoolean(value.enabled);
  const discountPercent = readInteger(value.discountPercent);
  if (enabled === null || discountPercent === null || !Array.isArray(value.plans)) {
    throw new ContractError('Catálogo de cobrança incompleto.');
  }
  return {
    enabled,
    discountPercent,
    plans: value.plans.map(parseBillingPlan),
  };
}

const billingStatuses: BillingStatus[] = ['inactive', 'pending', 'active', 'past_due', 'canceled'];

export function parseBillingSubscription(value: unknown): BillingSubscription {
  if (!isRecord(value)) throw new ContractError('Assinatura inválida.');
  const status = readString(value.status);
  const cycle = readString(value.cycle);
  const discountPercent = readInteger(value.discountPercent);
  const cancelAtPeriodEnd = readBoolean(value.cancelAtPeriodEnd);
  const enabled = readBoolean(value.enabled);
  if (
    !status ||
    !billingStatuses.includes(status as BillingStatus) ||
    discountPercent === null ||
    cancelAtPeriodEnd === null ||
    enabled === null
  ) {
    throw new ContractError('Assinatura incompleta.');
  }
  if (cycle !== null && cycle !== 'MONTHLY' && cycle !== 'YEARLY') {
    throw new ContractError('Ciclo da assinatura inválido.');
  }
  return {
    status: status as BillingStatus,
    planCode: readString(value.planCode),
    cycle: cycle as BillingCycle | null,
    catalogMonthlyPrice: readNumber(value.catalogMonthlyPrice),
    catalogAnnualPrice: readNumber(value.catalogAnnualPrice),
    contractedPrice: readNumber(value.contractedPrice),
    renewalPrice: readNumber(value.renewalPrice),
    discountPercent,
    renewsAt: readString(value.renewsAt),
    accessUntil: readString(value.accessUntil),
    cancelAtPeriodEnd,
    enabled,
  };
}

export function parseBillingCheckout(value: unknown): BillingCheckout {
  if (!isRecord(value)) throw new ContractError('Checkout inválido.');
  const checkoutId = readString(value.checkoutId);
  const checkoutUrl = readString(value.checkoutUrl);
  const expiresAt = readString(value.expiresAt);
  if (!checkoutId || !checkoutUrl || !expiresAt) {
    throw new ContractError('Checkout incompleto.');
  }
  return { checkoutId, checkoutUrl, expiresAt };
}
