import { Anchor, ChevronDown, Database } from 'lucide-react';
import type {
  FishingMetric,
  ForecastRankingItem,
  MarineDetails as MarineDetailsData,
  MarineTide,
} from '@/features/fishing/types/fishing';
import { forecastAtHour } from '@/features/fishing/utils/forecastAtHour';
import { formatHourLabel } from '@/features/fishing/utils/hours';
import { marineSeriesAtHour } from '../utils/marineAtHour';
import { formatForecastValue, parseFirstNumber } from '../utils/forecastSeries';
import { tideAtHour, tideChartPoints } from '../utils/tideAtHour';
import { ForecastChart } from './ForecastChart';
import { MetricGrid } from './MetricGrid';
import styles from './forecast.module.css';

interface TideSectionProps {
  tide: MarineTide | undefined;
  selectedHour?: string | null;
  pending?: boolean;
  error?: boolean;
}

export function TideSection({ tide, selectedHour, pending, error }: TideSectionProps) {
  const heading = 'Maré';
  if (pending)
    return (
      <section className={styles.forecastSection} aria-labelledby="tide-heading">
        <SectionHeading
          eyebrow="Referência do horário selecionado"
          title={heading}
          id="tide-heading"
        />
        <p className={styles.unavailableCopy} role="status">
          Carregando maré deste dia…
        </p>
      </section>
    );
  if (error || !tide)
    return (
      <section className={styles.forecastSection} aria-labelledby="tide-heading">
        <SectionHeading
          eyebrow="Referência do horário selecionado"
          title={heading}
          id="tide-heading"
        />
        <p className={styles.unavailableCopy}>Não foi possível carregar a maré.</p>
      </section>
    );

  const blocked = Boolean(tide.locked || tide.unavailable);
  const selected = blocked ? null : tideAtHour(tide, selectedHour);
  const chart = blocked ? { points: [], estimated: false } : tideChartPoints(tide);
  const annotations = tide.extremes.flatMap((extreme) => {
    const value = parseFirstNumber(extreme.height);
    if (value === null) return [];
    return [
      {
        time: extreme.time,
        value,
        label: `${extreme.type === 'preamar' ? 'P' : 'B'} ${formatHourLabel(extreme.time)} · ${extreme.height.replace(' ', '\u00a0')}`,
      },
    ];
  });

  return (
    <section className={styles.forecastSection} aria-labelledby="tide-heading">
      <SectionHeading
        eyebrow="Referência do horário selecionado"
        title={heading}
        id="tide-heading"
      />
      {tide.locked ? (
        <div className={styles.tideStatus} aria-label="Maré bloqueada no plano atual">
          <Anchor size={20} aria-hidden="true" />
          <div>
            <strong>Maré disponível na Assinatura</strong>
            <span>{tide.current}</span>
          </div>
        </div>
      ) : tide.unavailable ? (
        <p className={styles.unavailableCopy}>Maré temporariamente indisponível.</p>
      ) : (
        <>
          <div className={styles.tideStatus}>
            <Anchor size={20} aria-hidden="true" />
            <div>
              <span>
                {selectedHour ? `Às ${formatHourLabel(selectedHour)}` : 'Horário selecionado'}
              </span>
              <strong>
                {selected?.level === null || selected?.level === undefined
                  ? 'Nível exato indisponível'
                  : `${formatForecastValue(selected.level)} m`}
              </strong>
              {selected?.phase ? <small>{selected.phase}</small> : null}
            </div>
            {selected?.nextExtreme ? (
              <div className={styles.nextTide}>
                <span>Próxima</span>
                <strong>
                  {selected.nextExtreme.type === 'preamar' ? 'Preamar' : 'Baixa-mar'} ·{' '}
                  {formatHourLabel(selected.nextExtreme.time)}
                </strong>
                <small>{selected.nextExtreme.height}</small>
              </div>
            ) : null}
          </div>
          {chart.points.length >= 2 ? (
            <>
              <ForecastChart
                points={chart.points}
                label="Altura da maré ao longo do dia"
                unit="m"
                selectedHour={selectedHour}
                tone="tide"
                annotations={annotations}
              />
              {chart.estimated ? (
                <p className={styles.sectionCaption}>
                  Curva estimada entre os extremos publicados.
                </p>
              ) : null}
            </>
          ) : (
            <p className={styles.unavailableCopy}>Sem pontos suficientes para traçar a curva.</p>
          )}
          {tide.extremes.length > 0 ? (
            <details className={styles.secondaryDetails}>
              <summary>
                Tábua completa <ChevronDown size={17} aria-hidden="true" />
              </summary>
              <ul className={styles.tideTable}>
                {tide.extremes.map((extreme) => (
                  <li key={`${extreme.type}-${extreme.time}`}>
                    <strong>{extreme.type === 'preamar' ? 'Preamar' : 'Baixa-mar'}</strong>
                    <span>
                      {formatHourLabel(extreme.time)} · {extreme.height}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          <p className={styles.tideSource}>
            {tide.attribution ? `${tide.attribution} ` : ''}Referência da estação; não é medição
            exata no local. Não usar para navegação.
          </p>
        </>
      )}
    </section>
  );
}

interface ForecastTechnicalDetailsProps {
  forecast: ForecastRankingItem;
  marine?: MarineDetailsData;
  selectedHour?: string | null;
}

export function ForecastTechnicalDetails({
  forecast,
  marine,
  selectedHour,
}: ForecastTechnicalDetailsProps) {
  const selectedForecast = forecastAtHour(forecast, selectedHour);
  const marinePressure = marine?.series.find((item) => item.key === 'atmospheric-pressure');
  const pressure =
    selectedForecast.pressure ?? pressureMetric(marinePressure, selectedHour, forecast.metricsHour);

  return (
    <details className={`${styles.forecastSection} ${styles.technicalDetails}`}>
      <summary>
        <span>
          <Database size={18} aria-hidden="true" /> Detalhes da previsão
        </span>
        <ChevronDown size={18} aria-hidden="true" />
      </summary>
      <div className={styles.technicalContent}>
        <div>
          {pressure ? (
            <MetricGrid metrics={[pressure]} compact tone="light" hideLocked={false} />
          ) : (
            <p className={styles.unavailableCopy}>Sem pressão para o horário selecionado.</p>
          )}
        </div>
        <div className={styles.sources}>
          <h3>Fontes</h3>
          <p>Atualização: não informada pela fonte.</p>
          <p>Tempo e condições do mar: Open-Meteo.</p>
          {marine?.tide.attribution ? <p>Maré: {marine.tide.attribution}</p> : null}
        </div>
      </div>
    </details>
  );
}

function pressureMetric(
  pressure: MarineDetailsData['series'][number] | undefined,
  selectedHour?: string | null,
  referenceHour?: string | null,
): FishingMetric | undefined {
  if (!pressure || pressure.unavailable) return undefined;
  const selected = marineSeriesAtHour(pressure, selectedHour, referenceHour);
  return {
    key: 'pressure',
    label: 'Pressão',
    value: selected.current,
    detail: selected.detail,
    locked: selected.locked,
  };
}

function SectionHeading({ eyebrow, title, id }: { eyebrow: string; title: string; id: string }) {
  return (
    <div className={styles.sectionHeading}>
      <span>{eyebrow}</span>
      <h3 id={id}>{title}</h3>
    </div>
  );
}
