import type { KeyboardEvent, ReactNode } from 'react';
import type { ForecastDay } from '@/features/fishing/types/fishing';
import { useSnapCarousel } from '../hooks/useSnapCarousel';
import styles from './forecast.module.css';

interface DayCarouselProps {
  days: ForecastDay[];
  selectedDate: string;
  onSelect: (date: string) => void;
  children: (day: ForecastDay) => ReactNode;
}

function neighbor(days: ForecastDay[], date: string, offset: number) {
  const index = days.findIndex((item) => item.date === date);
  return index < 0 ? undefined : days[index + offset];
}

export function DayCarousel({ days, selectedDate, onSelect, children }: DayCarouselProps) {
  const { ref } = useSnapCarousel({ selectedKey: selectedDate, onSelect });

  const onDayKeyDown = (event: KeyboardEvent<HTMLButtonElement>, date: string) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const next = neighbor(days, date, event.key === 'ArrowRight' ? 1 : -1);
    if (!next) return;
    event.preventDefault();
    onSelect(next.date);
  };

  return (
    <div
      ref={ref}
      className={styles.dayCarousel}
      aria-label="Previsão por dia"
      aria-roledescription="carrossel"
    >
      {days.map((day) => {
        const selected = day.date === selectedDate;
        const previous = neighbor(days, day.date, -1);
        const next = neighbor(days, day.date, 1);
        return (
          <div
            key={day.date}
            className={styles.daySlide}
            data-snap-key={day.date}
            aria-hidden={!selected}
            inert={!selected}
          >
            <div className={styles.dayRail} aria-label="Selecionar dia da previsão">
              {previous ? (
                <button
                  type="button"
                  onClick={() => onSelect(previous.date)}
                  onKeyDown={(event) => onDayKeyDown(event, previous.date)}
                >
                  <strong>{previous.label}</strong>
                  <span>{previous.shortLabel}</span>
                </button>
              ) : (
                <span className={styles.dayRailSpacer} aria-hidden="true" />
              )}
              <button
                type="button"
                aria-pressed={selected}
                className={styles.dateSelected}
                onClick={() => onSelect(day.date)}
                onKeyDown={(event) => onDayKeyDown(event, day.date)}
              >
                <strong>{day.label}</strong>
                <span>{day.shortLabel}</span>
              </button>
              {next ? (
                <button
                  type="button"
                  onClick={() => onSelect(next.date)}
                  onKeyDown={(event) => onDayKeyDown(event, next.date)}
                >
                  <strong>{next.label}</strong>
                  <span>{next.shortLabel}</span>
                </button>
              ) : (
                <span className={styles.dayRailSpacer} aria-hidden="true" />
              )}
            </div>
            {children(day)}
          </div>
        );
      })}
    </div>
  );
}
