import { ChevronDown, Clock3, CloudRain, MapPin, Waves, Wind } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/design-system/components/Badge';
import { Card } from '@/design-system/components/Card';
import { ScoreIndicator } from '@/design-system/components/ScoreIndicator';
import type { FishingMetricKey, ForecastRankingItem } from '@/features/fishing/types/fishing';
import { MetricGrid } from '@/features/forecast/components/MetricGrid';
import { formatWindMetric } from '@/features/forecast/utils/formatWindMetric';
import { metricsHourCaption } from '@/features/fishing/utils/scoreBreakdown';
import { OwnerBadge } from '@/features/locations/components/OwnerBadge';
import { rankingMetricKeys } from '../rankingEmphasis';
import styles from './ranking.module.css';

interface RankingListProps {
  items: ForecastRankingItem[];
  limit?: number;
  startAt?: number;
  emphasisKey?: FishingMetricKey;
  visibleMetricKeys?: FishingMetricKey[];
  windUnit?: string;
  showFishingScore?: boolean;
}

const emphasisIcons: Partial<Record<FishingMetricKey, typeof Wind>> = {
  wind: Wind,
  rain: CloudRain,
  waves: Waves,
};

export function RankingList({
  items,
  limit,
  startAt = 1,
  emphasisKey,
  visibleMetricKeys,
  windUnit,
  showFishingScore = true,
}: RankingListProps) {
  const visibleItems = typeof limit === 'number' ? items.slice(0, limit) : items;
  const orderedMetricKeys = rankingMetricKeys(emphasisKey);
  const metricKeys = visibleMetricKeys
    ? (orderedMetricKeys ?? visibleMetricKeys).filter((key) => visibleMetricKeys.includes(key))
    : orderedMetricKeys;
  return (
    <div className={styles.list}>
      {visibleItems.map((item, index) => {
        const emphasisMetric =
          emphasisKey && (!visibleMetricKeys || visibleMetricKeys.includes(emphasisKey))
            ? item.metrics.find((metric) => metric.key === emphasisKey)
            : undefined;
        const EmphasisIcon = emphasisKey ? emphasisIcons[emphasisKey] : undefined;
        return (
          <Card as="article" className={styles.item} key={item.locationId}>
            {item.isOwner ? <OwnerBadge /> : null}
            <div className={styles.summary}>
              <span className={styles.position} aria-label={`${index + startAt}º lugar`}>
                {String(index + startAt).padStart(2, '0')}
              </span>
              <div className={styles.info}>
                {showFishingScore ? <Badge classification={item.classification} /> : null}
                <Link className={styles.hit} to={`/locais/${item.locationId}`}>
                  <h3>{item.locationName}</h3>
                </Link>
                {showFishingScore ? (
                  <p>
                    <Clock3 size={15} aria-hidden="true" /> {item.bestWindow}
                  </p>
                ) : null}
                {showFishingScore && item.scoreBreakdown ? (
                  <p className={styles.scoreBreakdown}>{item.scoreBreakdown}</p>
                ) : null}
                {emphasisMetric ? (
                  <p className={styles.emphasis}>
                    {EmphasisIcon ? <EmphasisIcon size={15} aria-hidden="true" /> : null}
                    {emphasisMetric.label} {formatWindMetric(emphasisMetric, windUnit)}
                  </p>
                ) : null}
              </div>
              {showFishingScore ? (
                <ScoreIndicator
                  score={item.score}
                  classification={item.classification}
                  size="small"
                />
              ) : null}
            </div>
            <details className={styles.details}>
              <summary>
                Ver condições <ChevronDown size={17} aria-hidden="true" />
              </summary>
              {metricsHourCaption(item.metricsHour) ? (
                <p className={styles.metricCaption}>{metricsHourCaption(item.metricsHour)}</p>
              ) : null}
              <MetricGrid metrics={item.metrics} keys={metricKeys} windUnit={windUnit} />
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
