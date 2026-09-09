import { Check, Clock3, Info, MapPin } from 'lucide-react';
import { Badge } from '@/design-system/components/Badge';
import { ScoreIndicator } from '@/design-system/components/ScoreIndicator';
import type { ForecastRankingItem } from '@/features/fishing/types/fishing';
import { formatHourLabel } from '@/features/fishing/utils/hours';
import { forecastScoreNote } from '@/features/fishing/utils/scoreBreakdown';
import { LocationStampFor } from '@/features/locations/components/LocationStamp';
import styles from './forecast.module.css';

interface ForecastRecommendationProps {
  forecast: ForecastRankingItem;
  variant: 'summary' | 'detail';
  dayLabel: string;
  showFishingScore: boolean;
  selectedHour?: string | null;
  onHourSelect?: (hour: string) => void;
}

export function ForecastRecommendation({
  forecast,
  variant,
  dayLabel,
  showFishingScore,
  selectedHour,
  onHourSelect,
}: ForecastRecommendationProps) {
  const hours = (
    forecast.hourWindows.length > 0
      ? forecast.hourWindows.map((window) => window.time)
      : forecast.bestHours
  )
    .filter((hour, index, all) => all.indexOf(hour) === index)
    .sort((left, right) => left.localeCompare(right));
  const referenceHour = forecast.metricsHour ?? hours[0] ?? null;

  if (variant === 'summary')
    return (
      <>
        <LocationStampFor
          isOwner={forecast.isOwner}
          visibility={forecast.visibility}
          isFavorite={forecast.isFavorite}
        />
        <div className={styles.heroTopline}>
          <div className={styles.heroHeading}>
            <span className={styles.heroLabel}>
              <MapPin size={16} aria-hidden="true" />
              {dayLabel}
            </span>
            <p className={styles.heroPrefix}>{showFishingScore ? 'Melhor escolha' : 'Destaque'}</p>
          </div>
          {showFishingScore ? <Badge classification={forecast.classification} /> : null}
        </div>
        <div className={styles.summaryMain}>
          <div>
            <h2>{forecast.locationName}</h2>
            {showFishingScore && referenceHour ? (
              <p className={styles.summaryHour}>
                <Clock3 size={18} aria-hidden="true" />
                Melhor horário <strong>{formatHourLabel(referenceHour)}</strong>
              </p>
            ) : null}
          </div>
          {showFishingScore ? (
            <ScoreIndicator
              score={forecast.score}
              classification={forecast.classification}
              size="small"
            />
          ) : null}
        </div>
      </>
    );

  return (
    <section className={styles.hero} aria-labelledby={`recommendation-${forecast.locationId}`}>
      <div className={styles.heroDecor} aria-hidden="true">
        <div className={styles.heroGlow} />
      </div>
      <div className={styles.heroTopline}>
        <span className={styles.heroLabel}>{dayLabel}</span>
        {showFishingScore ? <Badge classification={forecast.classification} /> : null}
      </div>
      <div className={styles.summaryMain}>
        <div>
          <h2 id={`recommendation-${forecast.locationId}`}>
            {showFishingScore ? 'Melhores horários para pescar' : 'Horários da previsão'}
          </h2>
        </div>
        {showFishingScore ? (
          <ScoreIndicator
            score={forecast.score}
            classification={forecast.classification}
            size="small"
          />
        ) : null}
      </div>
      {hours.length > 0 ? (
        <div className={styles.hourSelector} role="group" aria-label="Horários recomendados">
          {hours.map((hour) => {
            const selected = hour === selectedHour;
            return (
              <button
                type="button"
                key={hour}
                aria-label={
                  selected
                    ? `Ver condições das ${formatHourLabel(hour)}, selecionado`
                    : `Ver condições das ${formatHourLabel(hour)}`
                }
                aria-pressed={selected}
                className={selected ? styles.hourSelected : undefined}
                onClick={() => onHourSelect?.(hour)}
              >
                {selected ? <Check size={16} strokeWidth={2.6} aria-hidden="true" /> : null}
                {formatHourLabel(hour)}
              </button>
            );
          })}
        </div>
      ) : (
        <p className={styles.unavailableCopy}>Sem horários recomendados para este dia.</p>
      )}
      {forecast.selectableHourWindows?.length ? (
        <label className={styles.customHourField}>
          <span>Escolher outro horário</span>
          <select
            value={selectedHour ?? ''}
            onChange={(event) => onHourSelect?.(event.target.value)}
          >
            {forecast.selectableHourWindows.map((window) => (
              <option key={window.time} value={window.time}>
                {formatHourLabel(window.time)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {showFishingScore ? (
        <details className={styles.scoreExplanation}>
          <summary>
            <Info size={16} aria-hidden="true" /> Entenda a nota
          </summary>
          <p>Nota das condições previstas neste horário. {forecastScoreNote()}</p>
        </details>
      ) : null}
    </section>
  );
}
