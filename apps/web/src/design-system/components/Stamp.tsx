import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import styles from './components.module.css';

const toneClass = {
  coral: '',
  ocean: styles.stampOcean,
  sea: styles.stampSea,
} as const;

export function Stamp({
  children,
  icon: Icon,
  tone = 'coral',
}: {
  children: ReactNode;
  icon?: LucideIcon;
  tone?: keyof typeof toneClass;
}) {
  return (
    <span className={`${styles.stamp} ${toneClass[tone]}`.trim()}>
      {Icon ? <Icon size={11} strokeWidth={2.4} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
