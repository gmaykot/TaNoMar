import type { CSSProperties } from 'react';
import { FishSymbol } from 'lucide-react';
import type { FishingClassification } from '@/features/fishing/types/fishing';
import { classificationLabel } from '@/features/fishing/utils/classification';
import { formatDecimal } from '@/shared/utils/formatNumber';
import styles from './components.module.css';

interface ScoreIndicatorProps {
  score: number;
  classification: FishingClassification;
  size?: 'small' | 'large' | 'compact';
}

export function ScoreIndicator({ score, classification, size = 'large' }: ScoreIndicatorProps) {
  const percentage = Math.max(0, Math.min(100, score * 10));
  return (
    <div
      className={`${styles.score} ${styles[size]}`}
      style={{ '--score-percentage': `${percentage}%` } as CSSProperties}
      aria-label={`Nota ${formatDecimal(score)} de 10, ${classificationLabel[classification]}`}
    >
      <div className={styles.scoreInner}>
        <FishSymbol className={styles.scoreMark} aria-hidden="true" />
        <strong>{formatDecimal(score)}</strong>
        <small>/10</small>
      </div>
    </div>
  );
}
