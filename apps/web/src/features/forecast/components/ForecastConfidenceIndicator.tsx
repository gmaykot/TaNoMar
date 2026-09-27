import type { ForecastQuality } from '@/features/fishing/types/fishing';
import {
  forecastCompletenessCopy,
  forecastConfidenceLabel,
  forecastConfidenceReasonMessages,
  formatForecastDataAge,
} from '../utils/forecastQualityCopy';
import styles from './forecastConfidence.module.css';

interface ForecastConfidenceIndicatorProps {
  quality: ForecastQuality;
  variant?: 'compact' | 'detail';
  source?: 'live' | 'offline';
  surface?: 'hero' | 'card';
  now?: Date;
}

export function ForecastConfidenceIndicator({
  quality,
  variant = 'compact',
  source = 'live',
  surface = 'card',
  now,
}: ForecastConfidenceIndicatorProps) {
  const label = forecastConfidenceLabel(quality.confidence.level, source);
  const age = source === 'offline' ? formatForecastDataAge(quality.dataUpdatedAt, now) : null;
  if (variant === 'compact') {
    return (
      <div className={`${styles.compact} ${styles[surface]}`}>
        <p>{label}</p>
        {age ? <p>{age}</p> : null}
      </div>
    );
  }

  const reasons = forecastConfidenceReasonMessages(quality);

  return (
    <aside className={styles.detail} aria-label={label}>
      <p className={styles.level}>{label}</p>
      <p className={styles.completeness}>{forecastCompletenessCopy(quality)}</p>
      {reasons.length > 0 ? (
        <div className={styles.reasons}>
          {reasons.map((reason) => (
            <p className={styles.reason} key={reason}>
              {reason}
            </p>
          ))}
        </div>
      ) : null}
      {age ? <p className={styles.age}>{age}</p> : null}
    </aside>
  );
}
