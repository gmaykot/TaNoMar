import type { MarineTide, MarineTideExtreme } from '@/features/fishing/types/fishing';
import { parseFirstNumber, timeInMinutes } from './forecastSeries';

export interface TideAtHour {
  level: number | null;
  phase: 'Enchente' | 'Vazante' | null;
  nextExtreme: MarineTideExtreme | null;
}

export function tideAtHour(tide: MarineTide, selectedHour: string | null | undefined): TideAtHour {
  const selectedMinute = selectedHour ? timeInMinutes(selectedHour) : null;
  if (selectedMinute === null) return { level: null, phase: null, nextExtreme: null };

  const points = [...tide.points]
    .map((point) => ({ ...point, minute: timeInMinutes(point.time) }))
    .filter((point): point is typeof point & { minute: number } => point.minute !== null)
    .sort((left, right) => left.minute - right.minute);
  const exact = points.find((point) => point.minute === selectedMinute);
  const previous = [...points].reverse().find((point) => point.minute <= selectedMinute);
  const next = points.find((point) => point.minute > selectedMinute);
  const phase = previous && next ? (next.value >= previous.value ? 'Enchente' : 'Vazante') : null;
  const nextExtreme = [...tide.extremes]
    .filter((extreme) => {
      const minute = timeInMinutes(extreme.time);
      return minute !== null && minute > selectedMinute;
    })
    .sort((left, right) => left.time.localeCompare(right.time))[0];

  return {
    level: exact?.value ?? null,
    phase:
      phase ?? (nextExtreme ? (nextExtreme.type === 'preamar' ? 'Enchente' : 'Vazante') : null),
    nextExtreme: nextExtreme ?? null,
  };
}

export function tideChartPoints(tide: MarineTide) {
  const extremes = tide.extremes.flatMap((extreme) => {
    const value = parseFirstNumber(extreme.height);
    return value === null ? [] : [{ time: extreme.time, value }];
  });
  if (tide.points.length >= 2) {
    const points = [...tide.points, ...extremes]
      .filter((point, index, all) => all.findIndex((item) => item.time === point.time) === index)
      .sort((left, right) => left.time.localeCompare(right.time));
    return { points, estimated: false };
  }
  return { points: extremes, estimated: extremes.length >= 2 };
}
