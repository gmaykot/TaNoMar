import { useState } from 'react';
import type {
  FishingMetricKey,
  ForecastRankingItem,
  MarineDetails,
} from '@/features/fishing/types/fishing';
import { forecastSeriesOptions, type ForecastSeriesKey } from '../utils/forecastSeries';
import { ForecastChart } from './ForecastChart';
import styles from './forecast.module.css';

interface ForecastEvolutionProps {
  forecast: ForecastRankingItem;
  marine?: MarineDetails;
  selectedHour?: string | null;
  visibleMetricKeys?: FishingMetricKey[];
  windUnit?: string;
}

export function ForecastEvolution({
  forecast,
  marine,
  selectedHour,
  visibleMetricKeys,
  windUnit,
}: ForecastEvolutionProps) {
  const options = forecastSeriesOptions(forecast, marine, windUnit, visibleMetricKeys);
  const [selectedKey, setSelectedKey] = useState<ForecastSeriesKey>('wind');
  const selected = options.find((option) => option.key === selectedKey) ?? options[0];

  return (
    <section
      className={styles.forecastSection}
      aria-labelledby={`forecast-evolution-${forecast.locationId}`}
    >
      <div className={styles.sectionHeading}>
        <span>Variação ao longo do dia</span>
        <h3 id={`forecast-evolution-${forecast.locationId}`}>Evolução das condições</h3>
      </div>
      {selected ? (
        <>
          <div className={styles.chartTabs} role="tablist" aria-label="Variável do gráfico">
            {options.map((option) => (
              <button
                type="button"
                role="tab"
                key={option.key}
                aria-selected={option.key === selected.key}
                onClick={() => setSelectedKey(option.key)}
              >
                {option.key === 'temperature' ? 'Temperatura' : option.label}
              </button>
            ))}
          </div>
          <div role="tabpanel" aria-label={selected.label}>
            <ForecastChart
              points={selected.points}
              label={`${selected.label} ao longo do dia`}
              unit={selected.unit}
              selectedHour={selectedHour}
              tone={selected.key}
            />
            {selected.source === 'hour-windows' ? (
              <p className={styles.sectionCaption}>Série dos horários recomendados disponíveis.</p>
            ) : null}
          </div>
        </>
      ) : (
        <p className={styles.unavailableCopy}>Sem série suficiente para este dia.</p>
      )}
    </section>
  );
}
