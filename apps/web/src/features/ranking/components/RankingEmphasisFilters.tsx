import { CloudRain, Lock, Waves, Wind } from 'lucide-react';
import {
  cycleRankingEmphasis,
  rankingEmphasisControlLabel,
  rankingEmphasisDirection,
  rankingEmphasisMetric,
  rankingEmphasisMetricLabel,
  type RankingEmphasis,
  type RankingEmphasisMetric,
} from '../rankingEmphasis';
import styles from './ranking.module.css';

const metrics: Array<{
  id: RankingEmphasisMetric;
  icon: typeof Wind;
}> = [
  { id: 'wind', icon: Wind },
  { id: 'rain', icon: CloudRain },
  { id: 'waves', icon: Waves },
];

interface RankingEmphasisFiltersProps {
  emphasis: RankingEmphasis;
  premium: boolean;
  onChange: (next: RankingEmphasis) => void;
}

export function RankingEmphasisFilters({
  emphasis,
  premium,
  onChange,
}: RankingEmphasisFiltersProps) {
  const activeMetric = rankingEmphasisMetric(emphasis);
  const direction = rankingEmphasisDirection(emphasis);

  return (
    <div className={styles.filters} role="group" aria-label="Ênfase do ranking">
      {metrics.map((option) => {
        const locked = !premium;
        const selected = activeMetric === option.id;
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            type="button"
            className={`${styles.filter} ${selected ? styles.filterActive : ''}`}
            aria-pressed={selected}
            aria-label={rankingEmphasisControlLabel(option.id, emphasis, locked)}
            disabled={locked}
            onClick={locked ? undefined : () => onChange(cycleRankingEmphasis(emphasis, option.id))}
          >
            {locked ? <Lock size={14} aria-hidden="true" /> : <Icon size={16} aria-hidden="true" />}
            {rankingEmphasisMetricLabel(option.id)}
            {selected && direction ? (
              <span className={styles.filterDirection}>
                {direction === 'more' ? 'mais' : 'menos'}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
