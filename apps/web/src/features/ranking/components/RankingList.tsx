import { ChevronDown, Clock3, CloudRain, MapPin, Waves, Wind } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/design-system/components/Badge';
import { Card } from '@/design-system/components/Card';
import { ScoreIndicator } from '@/design-system/components/ScoreIndicator';
import type { FishingMetricKey, ForecastRankingItem } from '@/features/fishing/types/fishing';
import { MetricGrid } from '@/features/forecast/components/MetricGrid';
import { rankingMetricKeys } from '../rankingEmphasis';
import styles from './ranking.module.css';

interface RankingListProps {
  items: ForecastRankingItem[];
  limit?: number;
  emphasisKey?: FishingMetricKey;
}

const emphasisIcons: Partial<Record<FishingMetricKey, typeof Wind>> = {
  wind: Wind,
  rain: CloudRain,
  waves: Waves,
};

export function RankingList({ items, limit, emphasisKey }: RankingListProps) {
  const visibleItems = typeof limit === 'number' ? items.slice(0, limit) : items;
  const metricKeys = rankingMetricKeys(emphasisKey);
  return (
    <div className={styles.list}>
      {visibleItems.map((item, index) => {
        const emphasisMetric = emphasisKey
          ? item.metrics.find((metric) => metric.key === emphasisKey)
          : undefined;
        const EmphasisIcon = emphasisKey ? emphasisIcons[emphasisKey] : undefined;
        return (
          <Card as="article" className={styles.item} key={item.locationId}>
            <div className={styles.summary}>
              <span className={styles.position} aria-label={`${index + 1}º lugar`}>
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className={styles.info}>
                <Badge classification={item.classification} />
                <Link to={`/locais/${item.locationId}`}>
                  <h3>{item.locationName}</h3>
                </Link>
                <p>
                  <Clock3 size={15} aria-hidden="true" /> {item.bestWindow}
                </p>
                {emphasisMetric ? (
                  <p className={styles.emphasis}>
                    {EmphasisIcon ? <EmphasisIcon size={15} aria-hidden="true" /> : null}
                    {emphasisMetric.label} {emphasisMetric.value}
                  </p>
                ) : null}
              </div>
              <ScoreIndicator
                score={item.score}
                classification={item.classification}
                size="small"
              />
            </div>
            <details className={styles.details}>
              <summary>
                Ver condições <ChevronDown size={17} aria-hidden="true" />
              </summary>
              <MetricGrid metrics={item.metrics} keys={metricKeys} />
              <Link className={styles.locationLink} to={`/locais/${item.locationId}`}>
                <MapPin size={16} aria-hidden="true" /> Abrir local
              </Link>
            </details>
          </Card>
        );
      })}
    </div>
  );
}
