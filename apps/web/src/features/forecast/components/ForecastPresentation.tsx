import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { FishingMetricKey, ForecastRankingItem } from '@/features/fishing/types/fishing';
import { forecastAtHour } from '@/features/fishing/utils/forecastAtHour';
import { formatHourLabel } from '@/features/fishing/utils/hours';
import { useMarineDetails } from '../hooks/useMarineDetails';
import { ForecastEvolution } from './ForecastEvolution';
import { ForecastRecommendation } from './ForecastRecommendation';
import { ForecastTechnicalDetails, TideSection } from './MarineDetails';
import { MetricGrid } from './MetricGrid';
import styles from './forecast.module.css';

interface CommonForecastPresentationProps {
  forecast: ForecastRankingItem;
  dayLabel: string;
  visibleMetricKeys?: FishingMetricKey[];
  windUnit?: string;
  showFishingScore?: boolean;
}

interface SummaryForecastPresentationProps extends CommonForecastPresentationProps {
  variant: 'summary';
  date: string;
}

interface DetailForecastPresentationProps extends CommonForecastPresentationProps {
  variant: 'detail';
  date: string;
  locationId: string;
  active: boolean;
}

type ForecastPresentationProps = SummaryForecastPresentationProps | DetailForecastPresentationProps;

export function ForecastPresentation(props: ForecastPresentationProps) {
  return props.variant === 'summary' ? (
    <ForecastSummary {...props} />
  ) : (
    <ForecastDetail {...props} />
  );
}

function ForecastSummary({
  forecast,
  date,
  dayLabel,
  visibleMetricKeys,
  windUnit,
  showFishingScore = true,
}: SummaryForecastPresentationProps) {
  const displayForecast = forecastAtHour(forecast, forecast.metricsHour);
  const referenceHour = displayForecast.metricsHour;

  return (
    <article className={styles.hero}>
      <div className={styles.heroDecor} aria-hidden="true">
        <div className={styles.heroGlow} />
      </div>
      <ForecastRecommendation
        forecast={forecast}
        variant="summary"
        dayLabel={formatReferenceDate(date, dayLabel)}
        showFishingScore={showFishingScore}
      />
      {referenceHour ? (
        <p className={styles.metricCaption}>Condições às {formatHourLabel(referenceHour)}</p>
      ) : null}
      <MetricGrid
        metrics={displayForecast.metrics}
        keys={metricKeys(visibleMetricKeys, ['wind', 'waves', 'rain'])}
        windUnit={windUnit}
        compact
        hideLocked={false}
      />
      <Link
        className={styles.heroLink}
        to={`/locais/${forecast.locationId}?data=${encodeURIComponent(date)}`}
      >
        Ver previsão completa <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </article>
  );
}

function ForecastDetail({
  forecast,
  date,
  dayLabel,
  locationId,
  active,
  visibleMetricKeys,
  windUnit,
  showFishingScore = true,
}: DetailForecastPresentationProps) {
  const initialHour =
    forecast.metricsHour ?? forecast.hourWindows[0]?.time ?? forecast.bestHours[0] ?? null;
  const [selectedHour, setSelectedHour] = useState(initialHour);
  const selectedForecast = forecastAtHour(forecast, selectedHour);
  const marine = useMarineDetails(locationId, date, active);

  return (
    <div className={styles.forecastDetail}>
      <ForecastRecommendation
        forecast={selectedForecast}
        variant="detail"
        dayLabel={formatReferenceDate(date, dayLabel)}
        showFishingScore={showFishingScore}
        selectedHour={selectedHour}
        onHourSelect={setSelectedHour}
      />
      <section
        className={styles.forecastSection}
        aria-labelledby={`conditions-${locationId}-${date}`}
      >
        <div className={styles.sectionHeading}>
          <span>Horário selecionado</span>
          <h3 id={`conditions-${locationId}-${date}`}>
            {selectedHour ? `Condições às ${formatHourLabel(selectedHour)}` : 'Condições'}
          </h3>
        </div>
        <MetricGrid
          metrics={selectedForecast.metrics}
          keys={metricKeys(visibleMetricKeys, [
            'wind',
            'waves',
            'rain',
            'air-temperature',
            'water-temperature',
          ])}
          windUnit={windUnit}
          compact
          hideLocked={false}
          tone="light"
        />
      </section>
      {active ? (
        <>
          <TideSection
            tide={marine.data?.tide}
            selectedHour={selectedHour}
            pending={marine.isPending}
            error={marine.isError}
          />
          <ForecastEvolution
            forecast={forecast}
            marine={marine.data}
            selectedHour={selectedHour}
            visibleMetricKeys={visibleMetricKeys}
            windUnit={windUnit}
          />
          <ForecastTechnicalDetails
            forecast={forecast}
            marine={marine.data}
            selectedHour={selectedHour}
          />
        </>
      ) : null}
    </div>
  );
}

function metricKeys(visible: FishingMetricKey[] | undefined, primary: FishingMetricKey[]) {
  const keys = primary.flatMap((key) => {
    if (visible && !visible.includes(key)) return [];
    if (key === 'wind') return ['wind', 'gusts'] as FishingMetricKey[];
    if (key === 'waves') return ['waves', 'wave-period'] as FishingMetricKey[];
    return [key];
  });
  return keys.filter((key, index) => keys.indexOf(key) === index);
}

function formatCalendarDate(date: string) {
  const parsed = new Date(`${date}T12:00:00-03:00`);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(parsed);
}

function formatReferenceDate(date: string, dayLabel: string) {
  const calendar = formatCalendarDate(date);
  return calendar ? `${dayLabel} · ${calendar}` : dayLabel;
}
