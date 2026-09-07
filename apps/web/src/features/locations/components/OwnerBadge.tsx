import { Star } from 'lucide-react';
import styles from './locations.module.css';

export function OwnerBadge() {
  return (
    <span data-owner-badge="" className={styles.ownerBadge}>
      <Star size={11} fill="currentColor" aria-hidden="true" />
      Meu local
    </span>
  );
}
