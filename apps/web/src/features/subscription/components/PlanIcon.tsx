import { Anchor, Compass, Fish, Ship } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { subscriptionPlanIcon, type SubscriptionPlanIcon } from '../subscriptionPlans';
import styles from './planIcon.module.css';

const planIcons: Record<SubscriptionPlanIcon, LucideIcon> = {
  fish: Fish,
  anchor: Anchor,
  compass: Compass,
  ship: Ship,
};

export function PlanIcon({
  code,
  size = 20,
  framed = true,
}: {
  code: string;
  size?: number;
  framed?: boolean;
}) {
  const Icon = planIcons[subscriptionPlanIcon(code)];
  return (
    <span className={framed ? styles.mark : styles.plain} aria-hidden="true">
      <Icon size={size} />
    </span>
  );
}
