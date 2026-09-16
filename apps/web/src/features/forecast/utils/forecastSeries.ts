import type {
  FishingMetric,
  FishingMetricKey,
  ForecastHourWindow,
  ForecastRankingItem,
  MarineDetails,
  MarinePoint,
} from '@/features/fishing/types/fishing';
import { formatWindMetric } from './formatWindMetric';

export interface ForecastChartPoint {
  time: string;
  value: number;
}

export type ForecastSeriesKey = 'wind' | 'waves' | 'rain' | 'temperature';

export interface ForecastSeriesOption {
  key: ForecastSeriesKey;
  label: string;
  unit: string;
  points: ForecastChartPoint[];
  source: 'hour-windows' | 'hourly';
}

export function forecastSeriesOptions(
  forecast: ForecastRankingItem,
  marine: MarineDetails | undefined,
  windUnit?: string,
  visibleMetricKeys?: FishingMetricKey[],
) {
  const visible = (key: FishingMetricKey) => !visibleMetricKeys || visibleMetricKeys.includes(key);
  const options: ForecastSeriesOption[] = [];

  if (visible('wind')) {
    const hourly = hourlyPoints(marine, 'wind');
    const points = hourly
      ? convertWindPoints(hourly, windUnit)
      : metricPoints(forecast, 'wind', (metric) =>
          parseFirstNumber(formatWindMetric(metric, windUnit)),
        );
    if (points.length >= 2)
      options.push({
        key: 'wind',
        label: 'Vento',
        unit: windUnit === 'kt' ? 'nós' : 'km/h',
        points,
        source: hourly ? 'hourly' : 'hour-windows',
      });
  }

  if (visible('waves')) {
    const hourly = hourlyPoints(marine, 'waves');
    const points =
      hourly ?? metricPoints(forecast, 'waves', (metric) => parseFirstNumber(metric.value));
    if (points.length >= 2)
      options.push({
        key: 'waves',
        label: 'Ondas',
        unit: 'm',
        points,
        source: hourly ? 'hourly' : 'hour-windows',
      });
  }

  if (visible('rain')) {
    const hourly = hourlyPoints(marine, 'rain');
    const points =
      hourly ?? metricPoints(forecast, 'rain', (metric) => parseRainChance(metric.value));
    if (points.length >= 2)
      options.push({
        key: 'rain',
        label: 'Chuva',
        unit: '%',
        points,
        source: hourly ? 'hourly' : 'hour-windows',
      });
  }

  if (visible('water-temperature') || visible('air-temperature')) {
    const water = hourlyPoints(marine, 'water-temperature');
    const points = water
      ? water
      : metricPoints(forecast, 'air-temperature', (metric) => parseFirstNumber(metric.value));
    if (points.length >= 2)
      options.push({
        key: 'temperature',
        label: water ? 'Temperatura da água' : 'Temperatura do ar',
        unit: '°C',
        points,
        source: water ? 'hourly' : 'hour-windows',
      });
  }

  return options;
}

function hourlyPoints(
  marine: MarineDetails | undefined,
  key: MarineDetails['series'][number]['key'],
) {
  const series = marine?.series.find(
    (item) => item.key === key && !item.locked && !item.unavailable && item.points.length >= 2,
  );
  return series?.points ?? null;
}

function convertWindPoints(points: MarinePoint[], windUnit?: string): ForecastChartPoint[] {
  if (windUnit !== 'kt') return points;
  return points.map((point) => ({
    time: point.time,
    value: Math.round((point.value / 1.852) * 10) / 10,
  }));
}

function metricPoints(
  forecast: ForecastRankingItem,
  key: FishingMetricKey,
  read: (metric: FishingMetric) => number | null,
) {
  const windows = dayWindows(forecast);
  return windows.flatMap((window) => {
    const metric = window.metrics?.find((item) => item.key === key);
    if (!metric || metric.locked) return [];
    const value = read(metric);
    return value === null ? [] : [{ time: window.time, value }];
  });
}

function dayWindows(forecast: ForecastRankingItem): ForecastHourWindow[] {
  const selectable = forecast.selectableHourWindows ?? [];
  if (selectable.length >= 2) return selectable;
  return forecast.hourWindows;
}

export function parseFirstNumber(value: string) {
  const match = /-?\d+(?:[.,]\d+)?/.exec(value);
  if (!match) return null;
  const parsed = Number(match[0].replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

export function timeInMinutes(time: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function formatForecastValue(value: number) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
}

function parseRainChance(value: string) {
  const match = /(\d+(?:[.,]\d+)?)\s*%/.exec(value);
  if (!match) return null;
  const parsed = Number(match[1]!.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}
