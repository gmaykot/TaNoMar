import { ArrowRight, Clock3, Info, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/design-system/components/Badge';
import { ScoreIndicator } from '@/design-system/components/ScoreIndicator';
import type { FishingMetricKey, ForecastRankingItem } from '@/features/fishing/types/fishing';
import {
  formatHourLabel,
  formatHourList,
  splitRecommendationHours,
} from '@/features/fishing/utils/hours';
import {
  formatScore,
  metricsHourCaption,
  rankingLeadReason,
} from '@/features/fishing/utils/scoreBreakdown';
import { LocationStampFor } from '@/features/locations/components/LocationStamp';
import { MetricGrid } from './MetricGrid';
import styles from './forecast.module.css';

interface ForecastHeroProps {
  forecast: ForecastRankingItem;
  date?: string;
  dayLabel?: string;
  generatedAt?: string;
  visibleMetricKeys?: FishingMetricKey[];
  windUnit?: string;
  showFishingScore?: boolean;
}

export function ForecastHero({
  forecast,
  date,
  dayLabel = 'Hoje',
  generatedAt,
  visibleMetricKeys,
  windUnit,
  showFishingScore = true,
}: ForecastHeroProps) {
  const { best, alternatives } = splitRecommendationHours(forecast.bestHours, forecast.metricsHour);
  const hourWindows = [...forecast.hourWindows].sort((left, right) =>
    left.time.localeCompare(right.time),
  );
  return (
    <article className={styles.hero}>
      <LocationStampFor isOwner={forecast.isOwner} visibility={forecast.visibility} />
      <div className={styles.heroDecor} aria-hidden="true">
        <div className={styles.heroGlow} />
      </div>
      <div className={styles.heroTopline}>
        <span className={styles.heroLabel}>
          <MapPin size={16} aria-hidden="true" />{' '}
          {showFishingScore ? `Melhor escolha · ${dayLabel}` : `Destaque · ${dayLabel}`}
        </span>
        {showFishingScore ? <Badge classification={forecast.classification} /> : null}
      </div>
      <div className={styles.heroMain}>
        <div>
          <h2>{forecast.locationName}</h2>
          {showFishingScore && best ? (
            <>
              <p className={styles.window}>
                <Clock3 size={18} aria-hidden="true" />
                Melhor horário: <strong>{formatHourLabel(best)}</strong>
              </p>
              {alternatives.length > 0 ? (
                <p className={styles.windowExtra}>
                  Outros horários: {formatHourList(alternatives)}
                </p>
              ) : null}
            </>
          ) : null}
        </div>
        {showFishingScore ? (
          <div className={styles.scoreGroup}>
            <ScoreIndicator
              score={forecast.score}
              classification={forecast.classification}
              size="small"
            />
            <details className={styles.scoreInfo}>
              <summary aria-label="Como a nota é calculada">
                <Info size={17} aria-hidden="true" />
              </summary>
              <p>{rankingLeadReason(forecast.hourWindows.length || forecast.bestHours.length)}</p>
            </details>
          </div>
        ) : null}
      </div>
      {metricsHourCaption(forecast.metricsHour) ? (
        <p className={styles.metricCaption}>{metricsHourCaption(forecast.metricsHour)}</p>
      ) : null}
      <MetricGrid
        metrics={forecast.metrics}
        keys={visibleMetricKeys}
        windUnit={windUnit}
        compact
        hideLocked
      />
      {showFishingScore && hourWindows.length > 0 ? (
        <section className={styles.scoreTrend} aria-label="Notas dos melhores horários">
          <strong className={styles.scoreTrendTitle}>Notas dos melhores horários</strong>
          <ol className={styles.scoreTrendValues}>
            {hourWindows.map((item) => (
              <li
                key={item.time}
                className={item.time === best ? styles.scoreTrendBest : undefined}
                aria-current={item.time === best ? 'true' : undefined}
              >
                <span>{formatHourLabel(item.time)}</span>
                <strong>{formatScore(item.score)}</strong>
              </li>
            ))}
          </ol>
        </section>
      ) : showFishingScore && forecast.bestHours.length > 0 ? (
        <section className={styles.scoreTrend} aria-label="Melhores horários disponíveis">
          <strong>Melhores horários</strong>
          <ol className={styles.scoreTrendValues}>
            {forecast.bestHours.map((hour) => (
              <li key={hour} className={hour === best ? styles.scoreTrendBest : undefined}>
                <span>{formatHourLabel(hour)}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {generatedAt ? (
        <p className={styles.heroFreshness}>Previsão atualizada em {generatedAt}</p>
      ) : null}
      <Link
        className={styles.heroLink}
        to={`/locais/${forecast.locationId}${date ? `?data=${encodeURIComponent(date)}` : ''}`}
      >
        Ver previsão completa <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </article>
  );
}
