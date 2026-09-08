import { Anchor, Check, Compass, Ship } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { isPaidPlan } from '@/features/auth/types/auth';
import {
  isBillingUpgrade,
  quoteForCycle,
  type BillingCycle,
  type BillingPlan,
  type BillingStatus,
} from '@/features/billing/billing';
import {
  formatBrlFromCents,
  planFeatureList,
  subscriptionPlanIcon,
  type SubscriptionPlanIcon,
} from '@/features/subscription/subscriptionPlans';
import premiumStyles from '@/pages/premium/premium.module.css';

const planIcons: Record<SubscriptionPlanIcon, LucideIcon> = {
  anchor: Anchor,
  compass: Compass,
  ship: Ship,
};

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
  currentPlanCode,
  currentCycle,
  currentStatus,
  cancelAtPeriodEnd = false,
  billingEnabled,
  pendingKey,
  onCheckout,
}: {
  plans: BillingPlan[];
  currentPlanCode?: string;
  currentCycle?: BillingCycle | null;
  currentStatus?: BillingStatus | null;
  cancelAtPeriodEnd?: boolean;
  billingEnabled: boolean;
  pendingKey?: string | null;
  onCheckout?: (planCode: string, cycle: BillingCycle) => void;
}) {
  const isPaid = isPaidPlan({ plan: { code: currentPlanCode } });
  const hasPaidPeriod =
    currentStatus === 'active' || currentStatus === 'past_due' || currentStatus === 'canceled';

  return (
    <div className={premiumStyles.planGrid}>
      <div className={premiumStyles.planComparison}>
        <table aria-label="Comparação dos planos">
          <thead>
            <tr>
              <th scope="col">Recurso</th>
              {plans.map((plan) => (
                <th scope="col" key={plan.code}>
                  {plan.name}
                  {currentPlanCode === plan.code ? <small>Plano atual</small> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <ComparisonRow
              label="Mensal"
              plans={plans}
              value={(plan) => formatBrlFromCents(plan.monthlyPriceCents)}
            />
            <ComparisonRow
              label="Anual"
              plans={plans}
              value={(plan) => formatBrlFromCents(plan.annualPriceCents)}
            />
            <ComparisonRow
              label="Previsão"
              plans={plans}
              value={(plan) => `${plan.entitlements.maxForecastDays} dias`}
            />
            <ComparisonRow
              label="Locais pessoais"
              plans={plans}
              value={(plan) => String(plan.entitlements.maxPersonalSpots)}
            />
            <ComparisonRow
              label="Favoritos"
              plans={plans}
              value={(plan) => String(plan.entitlements.maxFavorites)}
            />
            <ComparisonRow
              label="Alertas"
              plans={plans}
              value={(plan) => String(plan.entitlements.maxAlerts)}
            />
            <ComparisonRow
              label="Câmeras ao vivo"
              plans={plans}
              value={(plan) => (plan.modules.liveWebcams ? 'Incluídas' : '—')}
            />
          </tbody>
        </table>
      </div>
      {plans.map((plan) => {
        const Icon = planIcons[subscriptionPlanIcon(plan.code)];
        const isCurrent = currentPlanCode === plan.code;
        return (
          <Card
            as="article"
            className={`${premiumStyles.planCard} ${plan.featured ? premiumStyles.planCardFeatured : ''} ${isCurrent ? premiumStyles.planCardCurrent : ''}`}
            key={plan.code}
            aria-labelledby={`plan-${plan.code}-title`}
            aria-current={isCurrent ? 'true' : undefined}
          >
            {isCurrent ? (
              <span className={premiumStyles.planBadge}>Seu plano atual</span>
            ) : plan.featured ? (
              <span className={premiumStyles.planBadge}>Mais escolhido</span>
            ) : (
              <span className={premiumStyles.planBadgeSpacer} aria-hidden="true" />
            )}
            <span className={premiumStyles.planIcon}>
              <Icon size={22} aria-hidden="true" />
            </span>
            <h3 id={`plan-${plan.code}-title`}>{plan.name}</h3>
            <p className={premiumStyles.planTagline}>{plan.tagline}</p>
            <p className={premiumStyles.planPrice}>
              <strong>{formatBrlFromCents(plan.monthlyPriceCents)}</strong>
              <span>/mês</span>
            </p>
            <p className={premiumStyles.planAnnual}>
              {formatBrlFromCents(plan.annualPriceCents)} /ano · −20%
            </p>
            <ul className={premiumStyles.planFeatures}>
              {planFeatureList(plan).map((feature) => (
                <li key={feature}>
                  <Check size={16} aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>
            {statusLabel({ isCurrent, isPaid, billingEnabled }) ? (
              <p className={premiumStyles.planStatus}>
                {statusLabel({ isCurrent, isPaid, billingEnabled })}
              </p>
            ) : null}
            {billingEnabled && (!isCurrent || (hasPaidPeriod && currentCycle === 'MONTHLY')) ? (
              <div className={premiumStyles.planActions}>
                <CycleAction
                  plan={plan}
                  cycle="MONTHLY"
                  currentPlanCode={currentPlanCode}
                  currentCycle={currentCycle}
                  hasPaidPeriod={hasPaidPeriod}
                  pendingKey={pendingKey}
                  onCheckout={onCheckout}
                />
                <CycleAction
                  plan={plan}
                  cycle="YEARLY"
                  currentPlanCode={currentPlanCode}
                  currentCycle={currentCycle}
                  hasPaidPeriod={hasPaidPeriod}
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
          </Card>
        );
      })}
    </div>
  );
}

function ComparisonRow({
  label,
  plans,
  value,
}: {
  label: string;
  plans: BillingPlan[];
  value: (plan: BillingPlan) => string;
}) {
  return (
    <tr>
      <th scope="row">{label}</th>
      {plans.map((plan) => (
        <td key={plan.code}>{value(plan)}</td>
      ))}
    </tr>
  );
}

function CycleAction({
  plan,
  cycle,
  currentPlanCode,
  currentCycle,
  hasPaidPeriod,
  pendingKey,
  onCheckout,
}: {
  plan: BillingPlan;
  cycle: BillingCycle;
  currentPlanCode?: string;
  currentCycle?: BillingCycle | null;
  hasPaidPeriod: boolean;
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
  const label =
    cycle === 'YEARLY'
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
