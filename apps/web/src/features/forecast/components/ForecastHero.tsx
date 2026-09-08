import { ArrowRight, Clock3, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/design-system/components/Badge';
import { ScoreIndicator } from '@/design-system/components/ScoreIndicator';
import type { FishingMetricKey, ForecastRankingItem } from '@/features/fishing/types/fishing';
import { metricsHourCaption } from '@/features/fishing/utils/scoreBreakdown';
import { OwnerBadge } from '@/features/locations/components/OwnerBadge';
import { MetricGrid } from './MetricGrid';
import styles from './forecast.module.css';

interface ForecastHeroProps {
  forecast: ForecastRankingItem;
  date?: string;
  dayLabel?: string;
  generatedAt?: string;
  visibleMetricKeys?: FishingMetricKey[];
  windUnit?: string;
}

export function ForecastHero({
  forecast,
  date,
  dayLabel = 'Hoje',
  generatedAt,
  visibleMetricKeys,
  windUnit,
}: ForecastHeroProps) {
  const otherHours = [...forecast.bestHours]
    .filter((hour) => hour !== forecast.metricsHour)
    .sort((left, right) => left.localeCompare(right));
  const otherHoursLabel =
    otherHours.length === 0
      ? null
      : otherHours.length === 1
        ? otherHours[0]
        : `${otherHours.slice(0, -1).join(', ')} e ${otherHours[otherHours.length - 1]}`;
  const metricsCaption = metricsHourCaption(forecast.metricsHour);
  return (
    <article className={styles.hero}>
      {forecast.isOwner ? <OwnerBadge /> : null}
      <div className={styles.heroDecor} aria-hidden="true">
        <div className={styles.heroGlow} />
      </div>
      <div className={styles.heroTopline}>
        <span className={styles.heroLabel}>
          <MapPin size={16} aria-hidden="true" /> Melhor escolha · {dayLabel}
        </span>
        <Badge classification={forecast.classification} />
      </div>
      <div className={styles.heroMain}>
        <div>
          <p className={styles.heroEyebrow}>{dayLabel} o mar aponta para</p>
          <h2>{forecast.locationName}</h2>
          <div className={styles.window}>
            <Clock3 size={18} aria-hidden="true" />
            Melhor hora{' '}
            <strong>{forecast.metricsHour ?? forecast.bestHours[0] ?? forecast.bestWindow}</strong>
          </div>
          {otherHoursLabel ? <p className={styles.windowExtra}>Também {otherHoursLabel}</p> : null}
        </div>
        <ScoreIndicator score={forecast.score} classification={forecast.classification} />
      </div>
      {forecast.scoreBreakdown ? (
        <p className={styles.scoreBreakdown}>{forecast.scoreBreakdown}</p>
      ) : null}
      {forecast.highlights?.length ? (
        <ul className={styles.heroHighlights} aria-label="Por que este local foi recomendado">
          {forecast.highlights.map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>
      ) : null}
      {metricsCaption ? <p className={styles.metricCaption}>{metricsCaption}</p> : null}
      <MetricGrid
        metrics={forecast.metrics}
        keys={visibleMetricKeys}
        limit={4}
        windUnit={windUnit}
      />
      {generatedAt ? (
        <p className={styles.heroFreshness}>Previsão atualizada em {generatedAt}</p>
      ) : null}
      <Link
        className={`${styles.heroLink} ${styles.hit}`}
        to={`/locais/${forecast.locationId}${date ? `?data=${encodeURIComponent(date)}` : ''}`}
      >
        Ver previsão completa <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </article>
  );
}
