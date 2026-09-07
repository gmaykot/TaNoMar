import { Star } from 'lucide-react';
import styles from './locations.module.css';

interface OwnerBadgeProps {
  inset?: boolean;
}

export function OwnerBadge({ inset = false }: OwnerBadgeProps) {
  return (
    <span data-owner-badge="" className={inset ? styles.ownerBadgeInset : styles.ownerBadge}>
      <Star size={inset ? 14 : 11} fill="currentColor" aria-hidden="true" />
      Meu local
    </span>
  );
}
