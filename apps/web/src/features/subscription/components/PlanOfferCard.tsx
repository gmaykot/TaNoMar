import type { ReactNode } from 'react';
import { Anchor, Check, Compass, Ship, Sparkles, Video } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/design-system/components/Card';
import { ANNUAL_DISCOUNT_PERCENT, annualCents } from '@/features/billing/billing';
import {
  formatBrlFromCents,
  planFeatureList,
  subscriptionPlanIcon,
  type PlanCatalog,
  type SubscriptionPlanIcon,
} from '../subscriptionPlans';
import styles from './planOffer.module.css';

const planIcons: Record<SubscriptionPlanIcon, LucideIcon> = {
  anchor: Anchor,
  compass: Compass,
  ship: Ship,
};

export function planAnnualCaption(monthlyPriceCents: number) {
  return `No anual, ${formatBrlFromCents(annualCents(monthlyPriceCents))} com ${ANNUAL_DISCOUNT_PERCENT}% de desconto`;
}

export function PlanOfferCard({
  plan,
  headingId,
  isCurrent = false,
  children,
}: {
  plan: PlanCatalog;
  headingId: string;
  isCurrent?: boolean;
  children?: ReactNode;
}) {
  const featured = plan.featured && !isCurrent;
  const Icon = planIcons[subscriptionPlanIcon(plan.code)];

  return (
    <Card
      as="article"
      className={`${styles.planCard} ${featured ? styles.planFeatured : ''} ${isCurrent ? styles.planCurrent : ''}`}
      aria-labelledby={headingId}
      aria-current={isCurrent ? 'true' : undefined}
    >
      <div className={styles.planTopline}>
        <span>{isCurrent ? 'Seu plano atual' : featured ? 'Recomendado' : 'Plano TáNoMar'}</span>
        {featured ? <Sparkles size={18} aria-hidden="true" /> : null}
      </div>
      <h3 id={headingId} className={styles.planName}>
        <span className={styles.planIcon} aria-hidden="true">
          <Icon size={20} />
        </span>
        {plan.name}
      </h3>
      <p className={styles.planTagline}>{plan.tagline}</p>
      <div className={styles.planPricing}>
        <p className={styles.planPrice}>
          <strong>{formatBrlFromCents(plan.monthlyPriceCents)}</strong>
          <span>por mês</span>
        </p>
        <p className={styles.planAnnual}>{planAnnualCaption(plan.monthlyPriceCents)}</p>
      </div>
      {plan.modules.liveWebcams ? (
        <p className={styles.planDifferential}>
          <Video size={17} aria-hidden="true" /> Câmeras ao vivo +{' '}
          {plan.entitlements.maxForecastDays} dias
        </p>
      ) : null}
      <ul className={styles.planFeatures}>
        {planFeatureList(plan).map((feature) => (
          <li key={feature}>
            <Check size={16} aria-hidden="true" /> {feature}
          </li>
        ))}
      </ul>
      {children ? <footer className={styles.planFooter}>{children}</footer> : null}
    </Card>
  );
}
