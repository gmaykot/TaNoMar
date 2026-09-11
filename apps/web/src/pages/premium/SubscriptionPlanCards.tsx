import { Button } from '@/design-system/components/Button';
import { isPaidPlan } from '@/features/auth/types/auth';
import {
  isBillingUpgrade,
  quoteForCycle,
  type BillingCycle,
  type BillingPlan,
  type BillingStatus,
} from '@/features/billing/billing';
import { PlanComparisonPanel } from '@/features/subscription/components/PlanComparisonPanel';
import { PlanOfferCard } from '@/features/subscription/components/PlanOfferCard';
import offerStyles from '@/features/subscription/components/planOffer.module.css';
import { formatBrlFromCents, type PlanCatalog } from '@/features/subscription/subscriptionPlans';
import premiumStyles from '@/pages/premium/premium.module.css';

function statusLabel({
  isCurrent,
  isPaid,
  billingEnabled,
}: {
  isCurrent: boolean;
  isPaid: boolean;
  billingEnabled: boolean;
}) {
  if (isCurrent) return billingEnabled ? null : 'Compare os demais planos';
  if (!billingEnabled) return isPaid ? 'Disponível na conta' : 'Cobrança em breve';
  return null;
}

export function SubscriptionPlanCards({
  plans,
  comparisonPlans,
  currentPlanCode,
  currentCycle,
  currentStatus,
  cancelAtPeriodEnd = false,
  billingEnabled,
  pendingPlanCode,
  pendingCycle,
  pendingKey,
  onCheckout,
}: {
  plans: BillingPlan[];
  comparisonPlans?: PlanCatalog[];
  currentPlanCode?: string;
  currentCycle?: BillingCycle | null;
  currentStatus?: BillingStatus | null;
  cancelAtPeriodEnd?: boolean;
  billingEnabled: boolean;
  pendingPlanCode?: string | null;
  pendingCycle?: BillingCycle | null;
  pendingKey?: string | null;
  onCheckout?: (planCode: string, cycle: BillingCycle) => void;
}) {
  const isPaid = isPaidPlan({ plan: { code: currentPlanCode } });
  const hasPaidPeriod =
    currentStatus === 'active' || currentStatus === 'past_due' || currentStatus === 'canceled';

  return (
    <>
      <div className={offerStyles.planGrid}>
        {plans.map((plan) => {
          const isCurrent = currentPlanCode === plan.code;
          const status = statusLabel({ isCurrent, isPaid, billingEnabled });
          return (
            <PlanOfferCard
              key={plan.code}
              plan={plan}
              headingId={`plan-${plan.code}-title`}
              isCurrent={isCurrent}
            >
              {status ? <p className={premiumStyles.planStatus}>{status}</p> : null}
              {billingEnabled && (!isCurrent || (hasPaidPeriod && currentCycle === 'MONTHLY')) ? (
                <div className={premiumStyles.planActions}>
                  <CycleAction
                    plan={plan}
                    cycle="MONTHLY"
                    currentPlanCode={currentPlanCode}
                    currentCycle={currentCycle}
                    hasPaidPeriod={hasPaidPeriod}
                    pendingPlanCode={pendingPlanCode}
                    pendingCycle={pendingCycle}
                    pendingKey={pendingKey}
                    onCheckout={onCheckout}
                  />
                  <CycleAction
                    plan={plan}
                    cycle="YEARLY"
                    currentPlanCode={currentPlanCode}
                    currentCycle={currentCycle}
                    hasPaidPeriod={hasPaidPeriod}
                    pendingPlanCode={pendingPlanCode}
                    pendingCycle={pendingCycle}
                    pendingKey={pendingKey}
                    onCheckout={onCheckout}
                  />
                  {hasPaidPeriod &&
                  !isBillingUpgrade(currentPlanCode, currentCycle, plan.code, 'MONTHLY') &&
                  !isBillingUpgrade(currentPlanCode, currentCycle, plan.code, 'YEARLY') &&
                  currentPlanCode !== plan.code ? (
                    <p className={premiumStyles.planHint}>
                      Para mudar para este plano, <a href="#assinatura">cancele a renovação</a>. A
                      troca fica disponível no fim do período já pago.
                    </p>
                  ) : null}
                </div>
              ) : null}
              {isCurrent && billingEnabled && hasPaidPeriod ? (
                <p className={premiumStyles.planHint}>
                  {cancelAtPeriodEnd ? (
                    'Renovação cancelada. Você usa o plano até o fim do período já pago e depois volta para Free.'
                  ) : (
                    <>
                      Para voltar ao Free, <a href="#assinatura">cancele a renovação</a>. Você usa o
                      plano até o fim do período já pago.
                    </>
                  )}
                </p>
              ) : null}
            </PlanOfferCard>
          );
        })}
      </div>
      <PlanComparisonPanel plans={comparisonPlans ?? plans} currentPlanCode={currentPlanCode} />
    </>
  );
}

function CycleAction({
  plan,
  cycle,
  currentPlanCode,
  currentCycle,
  hasPaidPeriod,
  pendingPlanCode,
  pendingCycle,
  pendingKey,
  onCheckout,
}: {
  plan: BillingPlan;
  cycle: BillingCycle;
  currentPlanCode?: string;
  currentCycle?: BillingCycle | null;
  hasPaidPeriod: boolean;
  pendingPlanCode?: string | null;
  pendingCycle?: BillingCycle | null;
  pendingKey?: string | null;
  onCheckout?: (planCode: string, cycle: BillingCycle) => void;
}) {
  const samePlanAndCycle = currentPlanCode === plan.code && currentCycle === cycle;
  if (hasPaidPeriod && samePlanAndCycle) {
    return (
      <p className={premiumStyles.planHint}>
        {cycle === 'YEARLY' ? 'Ciclo anual atual' : 'Ciclo mensal atual'}
      </p>
    );
  }
  if (hasPaidPeriod && !isBillingUpgrade(currentPlanCode, currentCycle, plan.code, cycle)) {
    return null;
  }
  const quote = quoteForCycle(plan, cycle);
  const firstCharge =
    quote?.firstChargeCents ??
    (cycle === 'YEARLY' ? plan.annualPriceCents : plan.monthlyPriceCents);
  const isPendingCheckout = pendingPlanCode === plan.code && pendingCycle === cycle;
  const label = isPendingCheckout
    ? 'Continuar pagamento'
    : cycle === 'YEARLY'
      ? quote
        ? `Pagar ${formatBrlFromCents(firstCharge)} no ano`
        : `Assinar no ano · ${formatBrlFromCents(plan.annualPriceCents)}`
      : quote
        ? `Pagar ${formatBrlFromCents(firstCharge)} no mês`
        : `Assinar no mês · ${formatBrlFromCents(plan.monthlyPriceCents)}`;
  const key = `${plan.code}:${cycle}`;
  return (
    <Button
      type="button"
      variant={cycle === 'YEARLY' || plan.featured ? 'primary' : 'secondary'}
      disabled={!onCheckout || pendingKey === key}
      onClick={() => onCheckout?.(plan.code, cycle)}
    >
      {pendingKey === key ? 'Abrindo o pagamento…' : label}
    </Button>
  );
}
