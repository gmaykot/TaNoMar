import { ArrowRight, Clock3, Info, MapPin } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/design-system/components/Badge';
import { ScoreIndicator } from '@/design-system/components/ScoreIndicator';
import type {
  FishingMetric,
  FishingMetricKey,
  ForecastRankingItem,
} from '@/features/fishing/types/fishing';
import { forecastAtHour } from '@/features/fishing/utils/forecastAtHour';
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
  showLocationStamp?: boolean;
  showLocationName?: boolean;
  showLocationLink?: boolean;
  hideLockedMetrics?: boolean;
  selectedHour?: string | null;
  onHourSelect?: (hour: string) => void;
  adaptMetrics?: (forecast: ForecastRankingItem) => FishingMetric[];
  beforeMetrics?: ReactNode | ((forecast: ForecastRankingItem) => ReactNode);
  afterTrend?: ReactNode;
}

export function ForecastHero({
  forecast,
  date,
  dayLabel = 'Hoje',
  generatedAt,
  visibleMetricKeys,
  windUnit,
  showFishingScore = true,
  showLocationStamp = true,
  showLocationName = true,
  showLocationLink = true,
  hideLockedMetrics = true,
  selectedHour,
  onHourSelect,
  adaptMetrics,
  beforeMetrics,
  afterTrend,
}: ForecastHeroProps) {
  const { best, alternatives } = splitRecommendationHours(forecast.bestHours, forecast.metricsHour);
  const hourWindows = [...forecast.hourWindows].sort((left, right) =>
    left.time.localeCompare(right.time),
  );
  const defaultHour = forecast.metricsHour ?? hourWindows[0]?.time ?? null;
  const isControlled = selectedHour !== undefined;
  const [internalHour, setInternalHour] = useState(defaultHour);
  const activeHour = isControlled ? selectedHour : internalHour;
  const displayForecast = forecastAtHour(forecast, activeHour);
  const displayMetrics = adaptMetrics ? adaptMetrics(displayForecast) : displayForecast.metrics;
  const selectHour = (hour: string) => {
    if (!isControlled) setInternalHour(hour);
    onHourSelect?.(hour);
  };
  const hourCaption = metricsHourCaption(displayForecast.metricsHour);
  const before =
    typeof beforeMetrics === 'function' ? beforeMetrics(displayForecast) : beforeMetrics;

  return (
    <article className={styles.hero}>
      {showLocationStamp ? (
        <LocationStampFor isOwner={forecast.isOwner} visibility={forecast.visibility} />
      ) : null}
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
          {showLocationName ? <h2>{forecast.locationName}</h2> : null}
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
      {hourCaption ? <p className={styles.metricCaption}>{hourCaption}</p> : null}
      {before}
      <MetricGrid
        metrics={displayMetrics}
        keys={visibleMetricKeys}
        windUnit={windUnit}
        compact
        hideLocked={hideLockedMetrics}
      />
      {showFishingScore && hourWindows.length > 0 ? (
        <section className={styles.scoreTrend} aria-label="Notas dos melhores horários">
          <strong className={styles.scoreTrendTitle}>Notas dos melhores horários</strong>
          <ol className={styles.scoreTrendValues}>
            {hourWindows.map((item) => {
              const selected = item.time === activeHour;
              const isBest = item.time === best;
              return (
                <li key={item.time}>
                  <button
                    type="button"
                    className={selected ? styles.scoreTrendSelected : undefined}
                    aria-label={`${formatHourLabel(item.time)}, nota ${formatScore(item.score)}${isBest ? ', melhor horário' : ''}`}
                    aria-pressed={selected}
                    aria-current={selected ? 'true' : undefined}
                    onClick={() => selectHour(item.time)}
                  >
                    {isBest ? <span className={styles.scoreTrendStamp}>Melhor</span> : null}
                    <span>{formatHourLabel(item.time)}</span>
                    <strong>{formatScore(item.score)}</strong>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      ) : showFishingScore && forecast.bestHours.length > 0 ? (
        <section className={styles.scoreTrend} aria-label="Melhores horários disponíveis">
          <strong>Melhores horários</strong>
          <ol className={styles.scoreTrendValues}>
            {forecast.bestHours.map((hour) => (
              <li key={hour} className={hour === best ? styles.scoreTrendSelected : undefined}>
                {hour === best ? <span className={styles.scoreTrendStamp}>Melhor</span> : null}
                <span>{formatHourLabel(hour)}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {afterTrend}
      {generatedAt ? (
        <p className={styles.heroFreshness}>Previsão atualizada em {generatedAt}</p>
      ) : null}
      {showLocationLink ? (
        <Link
          className={styles.heroLink}
          to={`/locais/${forecast.locationId}${date ? `?data=${encodeURIComponent(date)}` : ''}`}
        >
          Ver previsão completa <ArrowRight size={18} aria-hidden="true" />
        </Link>
      ) : null}
    </article>
  );
}
