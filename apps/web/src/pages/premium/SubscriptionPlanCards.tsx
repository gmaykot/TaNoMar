import { Anchor, Check, Compass, Ship } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/design-system/components/Card';
import { isPaidPlan } from '@/features/auth/types/auth';
import { subscriptionPlans } from '@/features/subscription/subscriptionPlans';
import type { SubscriptionPlan } from '@/features/subscription/subscriptionPlans';
import premiumStyles from '@/pages/premium/premium.module.css';

const planIcons: Record<SubscriptionPlan['icon'], LucideIcon> = {
  anchor: Anchor,
  compass: Compass,
  ship: Ship,
};

export function SubscriptionPlanCards({ currentPlanCode }: { currentPlanCode?: string }) {
  const isPaid = isPaidPlan({ plan: { code: currentPlanCode } });

  return (
    <div className={premiumStyles.planGrid}>
      {subscriptionPlans.map((plan) => {
        const Icon = planIcons[plan.icon];
        const isCurrent = currentPlanCode === plan.code;
        return (
          <Card
            as="article"
            className={`${premiumStyles.planCard} ${plan.featured ? premiumStyles.planCardFeatured : ''}`}
            key={plan.code}
            aria-labelledby={`plan-${plan.code}-title`}
          >
            {plan.featured ? (
              <span className={premiumStyles.planBadge}>{plan.featuredLabel}</span>
            ) : (
              <span className={premiumStyles.planBadgeSpacer} aria-hidden="true" />
            )}
            <span className={premiumStyles.planIcon}>
              <Icon size={22} aria-hidden="true" />
            </span>
            <h3 id={`plan-${plan.code}-title`}>{plan.name}</h3>
            <p className={premiumStyles.planTagline}>{plan.tagline}</p>
            <p className={premiumStyles.planPrice}>
              <strong>{plan.monthlyPrice}</strong>
              <span>{plan.period}</span>
            </p>
            <ul className={premiumStyles.planFeatures}>
              {plan.features.map((feature) => (
                <li key={feature}>
                  <Check size={16} aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>
            <p className={premiumStyles.planStatus}>
              {isCurrent ? 'Seu plano atual' : isPaid ? 'Disponível na conta' : 'Cobrança em breve'}
            </p>
          </Card>
        );
      })}
    </div>
  );
}
