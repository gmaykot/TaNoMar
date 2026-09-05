import type { ForecastDay } from '@/features/fishing/types/fishing';
import { useSnapCarousel } from '../hooks/useSnapCarousel';
import styles from './forecast.module.css';

interface DateSelectorProps {
  days: ForecastDay[];
  selectedDate: string;
  onSelect: (date: string) => void;
  variant?: 'chips' | 'carousel';
}

export function DateSelector({
  days,
  selectedDate,
  onSelect,
  variant = 'chips',
}: DateSelectorProps) {
  const carousel = variant === 'carousel';
  const { ref } = useSnapCarousel({
    selectedKey: selectedDate,
    onSelect,
    align: carousel ? 'center' : 'start',
  });

  return (
    <div
      ref={carousel ? ref : undefined}
      className={carousel ? `${styles.dateSelector} ${styles.dateCarousel}` : styles.dateSelector}
      aria-label="Selecionar dia da previsão"
      aria-roledescription={carousel ? 'carrossel' : undefined}
    >
      {days.map((day) => {
        const selected = day.date === selectedDate;
        return (
          <button
            type="button"
            key={day.date}
            data-snap-key={day.date}
            aria-pressed={selected}
            className={selected ? styles.dateSelected : ''}
            onClick={() => onSelect(day.date)}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
              const index = days.findIndex((item) => item.date === day.date);
              const next = event.key === 'ArrowRight' ? days[index + 1] : days[index - 1];
              if (!next) return;
              event.preventDefault();
              onSelect(next.date);
              const nextButton =
                event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(
                  `[data-snap-key="${next.date}"]`,
                );
              nextButton?.focus();
            }}
          >
            <strong>{day.label}</strong>
            <span>{day.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
