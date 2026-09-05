import type { CSSProperties } from 'react';
import { FishSymbol } from 'lucide-react';
import type { FishingClassification } from '@/features/fishing/types/fishing';
import { classificationLabel } from '@/features/fishing/utils/classification';
import styles from './components.module.css';

interface ScoreIndicatorProps {
  score: number;
  classification: FishingClassification;
  size?: 'small' | 'large';
}

export function ScoreIndicator({ score, classification, size = 'large' }: ScoreIndicatorProps) {
  const percentage = Math.max(0, Math.min(100, score * 10));
  return (
    <div
      className={`${styles.score} ${styles[size]}`}
      style={{ '--score-percentage': `${percentage}%` } as CSSProperties}
      aria-label={`Nota ${score.toFixed(1)} de 10, ${classificationLabel[classification]}`}
    >
      <div className={styles.scoreInner}>
        <FishSymbol aria-hidden="true" size={size === 'large' ? 18 : 14} />
        <strong>{score.toFixed(1)}</strong>
        <small>/10</small>
      </div>
    </div>
  );
}
