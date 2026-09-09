import type { MarinePoint, MarineSeries } from '@/features/fishing/types/fishing';

export function marinePointAtHour(points: MarinePoint[], hour: string | null | undefined) {
  if (!hour) return undefined;
  const exact = points.find((point) => point.time === hour);
  if (exact) return exact;
  const prefix = hour.slice(0, 2);
  return points.find((point) => point.time.startsWith(prefix));
}

export function formatMarineCurrent(current: string, value: number) {
  const match = /^([\d.,]+)\s*(.*)$/.exec(current.trim());
  const unit = match?.[2]?.trim() ?? '';
  const sample = match?.[1] ?? '';
  const separator = sample.includes(',') ? ',' : sample.includes('.') ? '.' : '';
  const fraction = separator ? (sample.split(separator)[1]?.length ?? 0) : 0;
  const formatted = value.toLocaleString('pt-BR', {
    minimumFractionDigits: fraction,
    maximumFractionDigits: fraction,
    useGrouping: false,
  });
  return unit ? `${formatted} ${unit}` : formatted;
}

export function marineSeriesAtHour(
  series: MarineSeries,
  hour: string | null | undefined,
  referenceHour?: string | null,
): MarineSeries {
  if (!hour || series.locked || series.unavailable) return series;
  if (referenceHour && hour === referenceHour) return series;
  const point = marinePointAtHour(series.points, hour);
  if (!point) return series;
  return { ...series, current: formatMarineCurrent(series.current, point.value) };
}
