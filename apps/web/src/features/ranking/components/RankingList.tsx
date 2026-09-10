import { ChevronDown, Clock3, CloudRain, MapPin, Waves, Wind } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/design-system/components/Badge';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { ScoreIndicator } from '@/design-system/components/ScoreIndicator';
import type { FishingMetricKey, ForecastRankingItem } from '@/features/fishing/types/fishing';
import { MetricGrid } from '@/features/forecast/components/MetricGrid';
import { formatWindMetric } from '@/features/forecast/utils/formatWindMetric';
import {
  formatHourLabel,
  formatHourList,
  splitRecommendationHours,
} from '@/features/fishing/utils/hours';
import { LocationStampFor } from '@/features/locations/components/LocationStamp';
import { rankingMetricKeys } from '../rankingEmphasis';
import styles from './ranking.module.css';

export const rankingPageSize = 10;

interface RankingListProps {
  items: ForecastRankingItem[];
  limit?: number;
  pageSize?: number;
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

export function RankingList(props: RankingListProps) {
  const listKey = `${props.items.map((item) => item.locationId).join('|')}:${props.pageSize ?? 'all'}`;
  return <RankingListView key={listKey} {...props} />;
}

function RankingListView({
  items,
  limit,
  pageSize,
  startAt = 1,
  emphasisKey,
  visibleMetricKeys,
  windUnit,
  showFishingScore = true,
}: RankingListProps) {
  const [visibleCount, setVisibleCount] = useState(pageSize ?? items.length);
  const cap = pageSize ? Math.min(visibleCount, items.length) : (limit ?? items.length);
  const visibleItems = items.slice(0, cap);
  const remaining = pageSize ? Math.max(0, items.length - visibleItems.length) : 0;
  const nextCount = pageSize ? Math.min(pageSize, remaining) : 0;
  const orderedMetricKeys = rankingMetricKeys(emphasisKey);
  const metricKeys = visibleMetricKeys
    ? (orderedMetricKeys ?? visibleMetricKeys).filter((key) => visibleMetricKeys.includes(key))
    : orderedMetricKeys;
  return (
    <div className={styles.listWrap}>
      <div className={styles.list}>
        {visibleItems.map((item, index) => {
          const emphasisMetric =
            emphasisKey && (!visibleMetricKeys || visibleMetricKeys.includes(emphasisKey))
              ? item.metrics.find((metric) => metric.key === emphasisKey)
              : undefined;
          const EmphasisIcon = emphasisKey ? emphasisIcons[emphasisKey] : undefined;
          const { best, alternatives } = splitRecommendationHours(item.bestHours, item.metricsHour);
          const conditions = conditionSummary(item, visibleMetricKeys, windUnit);
          return (
            <Card as="article" className={styles.item} key={item.locationId}>
              <LocationStampFor
                isOwner={item.isOwner}
                visibility={item.visibility}
                isFavorite={item.isFavorite}
              />
              {showFishingScore ? (
                <Badge className={styles.itemBadge} classification={item.classification} />
              ) : null}
              <div className={styles.summary}>
                <span className={styles.position} aria-label={`${index + startAt}º lugar`}>
                  {String(index + startAt).padStart(2, '0')}
                </span>
                <div className={styles.info}>
                  <Link className={styles.hit} to={`/locais/${item.locationId}`}>
                    <h3>{item.locationName}</h3>
                  </Link>
                  {showFishingScore && best ? (
                    <p className={styles.hours}>
                      <Clock3 size={15} aria-hidden="true" />
                      {formatHourLabel(best)}
                      {alternatives.length > 0 ? ` · ${formatHourList(alternatives)}` : ''}
                    </p>
                  ) : null}
                  {showFishingScore ? (
                    <p className={styles.conditionSummary}>
                      {conditions.map((condition) => (
                        <span className={styles.conditionSummaryItem} key={condition}>
                          {condition}
                        </span>
                      ))}
                    </p>
                  ) : null}
                  {!showFishingScore ? (
                    <p className={styles.emphasis}>{marineSummary(item, metricKeys, windUnit)}</p>
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
              {showFishingScore ? (
                <details className={styles.details}>
                  <summary>
                    Ver condições <ChevronDown size={17} aria-hidden="true" />
                  </summary>
                  <MetricGrid
                    metrics={item.metrics}
                    keys={metricKeys}
                    windUnit={windUnit}
                    hideLocked
                  />
                  <Link className={styles.locationLink} to={`/locais/${item.locationId}`}>
                    <MapPin size={16} aria-hidden="true" /> Abrir local
                  </Link>
                </details>
              ) : (
                <div className={styles.marineBlock}>
                  <MetricGrid
                    metrics={item.metrics}
                    keys={metricKeys}
                    limit={4}
                    windUnit={windUnit}
                    hideLocked
                  />
                  <Link className={styles.locationLink} to={`/locais/${item.locationId}`}>
                    <MapPin size={16} aria-hidden="true" /> Abrir local
                  </Link>
                </div>
              )}
            </Card>
          );
        })}
      </div>
      {nextCount > 0 ? (
        <div className={styles.more}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setVisibleCount((count) => count + nextCount)}
          >
            Mostrar mais
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function marineSummary(
  item: ForecastRankingItem,
  keys: FishingMetricKey[] | undefined,
  windUnit?: string,
) {
  const preferred: FishingMetricKey[] = ['waves', 'wave-period', 'swell', 'wind'];
  const selected = preferred.filter((key) => !keys || keys.includes(key));
  const parts = selected.flatMap((key) => {
    const metric = item.metrics.find((itemMetric) => itemMetric.key === key);
    return metric && !metric.locked
      ? [`${metric.label} ${formatWindMetric(metric, windUnit)}`]
      : [];
  });
  return parts.join(' · ') || 'Condições do mar';
}

function conditionSummary(
  item: ForecastRankingItem,
  visibleMetricKeys: FishingMetricKey[] | undefined,
  windUnit?: string,
) {
  const preferred: FishingMetricKey[] = ['wind', 'waves'];
  const selected = preferred.filter((key) => !visibleMetricKeys || visibleMetricKeys.includes(key));
  const parts = selected.flatMap((key) => {
    const metric = item.metrics.find((itemMetric) => itemMetric.key === key);
    return metric && !metric.locked
      ? [`${metric.label} ${formatWindMetric(metric, windUnit)}`]
      : [];
  });
  return parts.length > 0 ? parts : ['Condições disponíveis nos detalhes'];
}
