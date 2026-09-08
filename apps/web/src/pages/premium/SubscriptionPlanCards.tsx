import { Anchor, Check, Compass, Ship } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/design-system/components/Card';
import { isPaidPlan } from '@/features/auth/types/auth';
import {
  formatBrlFromCents,
  planFeatureList,
  subscriptionPlanIcon,
  type PlanCatalog,
  type SubscriptionPlanIcon,
} from '@/features/subscription/subscriptionPlans';
import premiumStyles from '@/pages/premium/premium.module.css';

const planIcons: Record<SubscriptionPlanIcon, LucideIcon> = {
  anchor: Anchor,
  compass: Compass,
  ship: Ship,
};

export function SubscriptionPlanCards({
  plans,
  currentPlanCode,
}: {
  plans: PlanCatalog[];
  currentPlanCode?: string;
}) {
  const isPaid = isPaidPlan({ plan: { code: currentPlanCode } });

  return (
    <div className={premiumStyles.planGrid}>
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
            <ul className={premiumStyles.planFeatures}>
              {planFeatureList(plan).map((feature) => (
                <li key={feature}>
                  <Check size={16} aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>
            <p className={premiumStyles.planStatus}>
              {isCurrent
                ? 'Compare os demais planos'
                : isPaid
                  ? 'Disponível na conta'
                  : 'Cobrança em breve'}
            </p>
          </Card>
        );
      })}
    </div>
  );
}
