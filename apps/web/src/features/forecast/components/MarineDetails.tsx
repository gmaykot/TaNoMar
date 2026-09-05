import type { ReactNode } from 'react';
import { Anchor, ChevronDown, Droplets, Gauge, Waves } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { Sparkline } from '@/design-system/components/Sparkline';
import type { MarineSeries } from '@/features/fishing/types/fishing';
import { useMarineDetails } from '../hooks/useMarineDetails';
import styles from './forecast.module.css';

const seriesIcons = {
  waves: Waves,
  'wave-period': Gauge,
  swell: Waves,
  'water-temperature': Droplets,
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
  return (
    <div className={styles.marine}>
      <div className={styles.marineGrid}>
        {series.map((item) => {
          const Icon = seriesIcons[item.key];
          return (
            <article
              key={item.key}
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
        })}
      </div>
      <article
        className={`${styles.marineCard} ${styles.tideCard} ${tide.locked || tide.unavailable ? styles.marineLocked : ''}`}
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
          <small>{tide.locked ? 'Premium' : tide.phase}</small>
        </header>
        <p>{tide.nextExtreme}</p>
        {tide.extremes.length > 0 ? (
          <ul>
            {tide.extremes.map((extreme) => (
              <li key={`${extreme.type}-${extreme.time}`}>
                <strong>{extreme.type === 'preamar' ? 'Preamar' : 'Baixa-mar'}</strong>
                <span>
                  {extreme.time} · {extreme.height}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <Sparkline
          values={tide.points.map((point) => point.value)}
          label="Nível da maré"
          locked={tide.locked}
        />
      </article>
    </div>
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
