import type { ReactNode } from 'react';
import { Activity, Anchor, ChevronDown, Droplets, Gauge, Waves } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { Sparkline } from '@/design-system/components/Sparkline';
import type { MarineSeries, MarineTide } from '@/features/fishing/types/fishing';
import { useMarineDetails } from '../hooks/useMarineDetails';
import styles from './forecast.module.css';

const seriesIcons = {
  waves: Waves,
  'wave-period': Gauge,
  swell: Waves,
  'water-temperature': Droplets,
  'atmospheric-pressure': Activity,
} satisfies Record<MarineSeries['key'], LucideIcon>;

interface MarineDetailsProps {
  locationId: string;
  date: string;
}

export function MarineDetails({ locationId, date }: MarineDetailsProps) {
  const marine = useMarineDetails(locationId, date, true);

  if (marine.isPending)
    return (
      <FeedbackState title="Lendo o mar" description="Buscando ondulação e maré deste dia." busy />
    );
  if (marine.isError || !marine.data)
    return (
      <FeedbackState
        title="Detalhe indisponível"
        description="Não foi possível abrir as informações do mar."
      />
    );

  const { series, tide } = marine.data;
  const sea = series.filter((item) => item.key !== 'atmospheric-pressure');
  const pressure = series.find((item) => item.key === 'atmospheric-pressure');

  return (
    <div className={styles.marine}>
      <section className={styles.marineSection} aria-labelledby="marine-sea-heading">
        <h3 className={styles.marineEyebrow} id="marine-sea-heading">
          Mar
        </h3>
        <div className={styles.marineGrid}>
          {sea.map((item) => (
            <MarineMetricCard key={item.key} item={item} />
          ))}
        </div>
      </section>
      <section className={styles.marineSection} aria-labelledby="marine-tide-heading">
        <h3 className={styles.marineEyebrow} id="marine-tide-heading">
          Maré e pressão
        </h3>
        <div className={styles.marineCondition}>
          <TideCard tide={tide} />
          {pressure ? <MarineMetricCard item={pressure} /> : null}
        </div>
      </section>
    </div>
  );
}

function MarineMetricCard({ item }: { item: MarineSeries }) {
  const Icon = seriesIcons[item.key];
  return (
    <article
      className={`${styles.marineCard} ${item.locked ? styles.marineLocked : ''}`}
      aria-label={item.locked ? `${item.label} bloqueado no plano atual` : item.label}
    >
      <header>
        <span>
          <Icon size={16} aria-hidden="true" /> {item.label}
        </span>
        <strong>{item.current}</strong>
        <small>
          {item.locked
            ? 'Premium'
            : [item.range, item.direction, item.detail].filter(Boolean).join(' · ')}
        </small>
      </header>
      <Sparkline
        values={item.points.map((point) => point.value)}
        label={item.label}
        locked={item.locked}
      />
    </article>
  );
}

function TideCard({ tide }: { tide: MarineTide }) {
  const blocked = Boolean(tide.locked || tide.unavailable);
  return (
    <article
      className={`${styles.marineCard} ${styles.tideCard} ${blocked ? styles.marineLocked : ''}`}
      aria-label={
        tide.locked
          ? 'Maré bloqueada no plano atual'
          : tide.unavailable
            ? 'Maré indisponível'
            : 'Maré'
      }
    >
      <header>
        <span>
          <Anchor size={16} aria-hidden="true" /> Maré
        </span>
        <strong>{tide.current}</strong>
        <small>{tide.locked ? 'Premium' : tide.unavailable ? '—' : tide.phase}</small>
      </header>
      {tide.extremes.length > 0 ? (
        <ul>
          {tide.extremes.map((extreme) => {
            const upcoming = !blocked && tide.nextExtreme.includes(extreme.time);
            return (
              <li
                key={`${extreme.type}-${extreme.time}`}
                className={upcoming ? styles.tideUpcoming : undefined}
              >
                <strong>{extreme.type === 'preamar' ? 'Preamar' : 'Baixa-mar'}</strong>
                <span>
                  {extreme.time} · {extreme.height}
                  {upcoming ? ' · próxima' : ''}
                </span>
              </li>
            );
          })}
        </ul>
      ) : !blocked && tide.nextExtreme ? (
        <p>{tide.nextExtreme}</p>
      ) : null}
      <Sparkline
        values={tide.points.map((point) => point.value)}
        label="Nível da maré"
        locked={tide.locked}
      />
      {!blocked ? (
        <p className={styles.marineCaption}>
          {tide.attribution ? `${tide.attribution} ` : null}
          Não usar para navegação.
        </p>
      ) : null}
    </article>
  );
}

export function MarineDetailsToggle({
  open,
  onToggle,
  children,
}: {
  open: boolean;
  onToggle: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <details
      className={styles.marineDetails}
      open={open}
      onToggle={(event) => onToggle(event.currentTarget.open)}
    >
      <summary>
        {open ? 'Ocultar mar e maré' : 'Mar e maré'}
        <ChevronDown size={17} aria-hidden="true" />
      </summary>
      {children}
    </details>
  );
}
