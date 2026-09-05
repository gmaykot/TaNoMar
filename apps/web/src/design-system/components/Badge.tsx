import type { HTMLAttributes } from 'react';
import { CircleCheck, CloudSun, ShieldAlert, Sparkles } from 'lucide-react';
import type { FishingClassification } from '@/features/fishing/types/fishing';
import { classificationLabel } from '@/features/fishing/utils/classification';
import styles from './components.module.css';

const classificationIcon = {
  excellent: Sparkles,
  'very-good': CircleCheck,
  regular: CloudSun,
  difficult: ShieldAlert,
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  classification: FishingClassification;
}

export function Badge({ classification, className = '', ...props }: BadgeProps) {
  const Icon = classificationIcon[classification];
  return (
    <span
      className={`${styles.badge} ${styles[classification]} ${className}`}
      data-classification={classification}
      {...props}
    >
      <Icon aria-hidden="true" size={14} strokeWidth={2.4} />
      {classificationLabel[classification]}
    </span>
  );
}
