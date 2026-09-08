import { CloudRain, Droplets, Gauge, Thermometer, Waves, Wind } from 'lucide-react';
import type { FishingMetric, FishingMetricKey } from '@/features/fishing/types/fishing';
import { MetricTile } from '@/design-system/components/MetricTile';
import { formatWindMetric } from '../utils/formatWindMetric';
import styles from './forecast.module.css';

interface DisplayMetric extends FishingMetric {
  secondary?: string[];
  rows?: Array<{ label: string; value: string }>;
}

const metricIcons = {
  wind: Wind,
  gusts: Gauge,
  waves: Waves,
  'wave-period': Gauge,
  swell: Waves,
  rain: CloudRain,
  'air-temperature': Thermometer,
  'water-temperature': Droplets,
} satisfies Record<FishingMetricKey, typeof Wind>;

interface MetricGridProps {
  metrics: FishingMetric[];
  keys?: FishingMetricKey[];
  limit?: number;
  windUnit?: string;
  compact?: boolean;
}

export function MetricGrid({ metrics, keys, limit, windUnit, compact = false }: MetricGridProps) {
  const selected = keys
    ? keys.flatMap((key) => {
        const metric = metrics.find((item) => item.key === key);
        return metric ? [metric] : [];
      })
    : metrics;
  const visibleMetrics = typeof limit === 'number' ? selected.slice(0, limit) : selected;
  const gusts = visibleMetrics.find((metric) => metric.key === 'gusts');
  const wind = visibleMetrics.find((metric) => metric.key === 'wind');
  const wavePeriod = metrics.find((metric) => metric.key === 'wave-period');
  const waves = visibleMetrics.find((metric) => metric.key === 'waves');
  const airTemperature = visibleMetrics.find((metric) => metric.key === 'air-temperature');
  const waterTemperature = visibleMetrics.find((metric) => metric.key === 'water-temperature');
  const combineWind = Boolean(compact && wind && gusts && !wind.locked && !gusts.locked);
  const combineWaves = Boolean(
    compact && waves && wavePeriod && !waves.locked && !wavePeriod.locked,
  );
  const combineTemperatures = Boolean(
    compact &&
    airTemperature &&
    waterTemperature &&
    !airTemperature.locked &&
    !waterTemperature.locked,
  );
  const displayMetrics: DisplayMetric[] = compact
    ? visibleMetrics.flatMap<DisplayMetric>((metric) => {
        if (metric.key === 'gusts' && combineWind) return [];
        if (metric.key === 'wave-period' && combineWaves) return [];
        if (metric.key === 'water-temperature' && combineTemperatures) return [];
        if (metric.key === 'wind') {
          const formattedWind = formatWindMetric(metric, windUnit);
          const { value, direction } = splitWind(formattedWind);
          return [
            {
              ...metric,
              value: keepMeasureTogether(value),
              detail: undefined,
              secondary: [
                [direction, metric.detail].filter(Boolean).join(' · '),
                combineWind && gusts
                  ? `Rajadas: ${keepMeasureTogether(formatWindMetric(gusts, windUnit))}`
                  : '',
              ].filter(Boolean),
            },
          ];
        }
        if (metric.key === 'waves' && combineWaves && wavePeriod)
          return [
            {
              ...metric,
              value: keepMeasureTogether(metric.value),
              detail: undefined,
              secondary: [`Período: ${keepMeasureTogether(wavePeriod.value)}`],
            },
          ];
        if (metric.key === 'rain' && !metric.locked) {
          const rain = splitRain(metric.value);
          return [
            {
              ...metric,
              value: rain.chance ? `${rain.chance} de chance` : keepMeasureTogether(metric.value),
              detail: undefined,
              secondary: rain.volume ? [`Volume: ${keepMeasureTogether(rain.volume)}`] : undefined,
            },
          ];
        }
        if (metric.key === 'air-temperature' && combineTemperatures && waterTemperature)
          return [
            {
              ...metric,
              label: 'Temperatura',
              value: '',
              detail: undefined,
              rows: [
                { label: 'Ar', value: keepMeasureTogether(metric.value) },
                { label: 'Água', value: keepMeasureTogether(waterTemperature.value) },
              ],
            },
          ];
        return [
          {
            ...metric,
            value: keepMeasureTogether(metric.value),
            detail: undefined,
            secondary: metric.detail ? [metric.detail] : undefined,
          },
        ];
      })
    : visibleMetrics;
  if (displayMetrics.length === 0) return null;
  return (
    <div className={styles.metricGrid}>
      {displayMetrics.map((metric) => (
        <MetricTile
          key={metric.key}
          icon={metricIcons[metric.key]}
          label={metric.label}
          value={formatWindMetric(metric, windUnit)}
          detail={metric.detail}
          secondary={metric.secondary}
          rows={metric.rows}
          locked={metric.locked}
          compact={compact}
        />
      ))}
    </div>
  );
}

function splitWind(value: string) {
  const match = /^(\d+(?:[.,]\d+)?\s+(?:km\/h|nós?))(?:\s+(.+))?$/i.exec(value.trim());
  return match ? { value: match[1]!, direction: match[2] } : { value, direction: undefined };
}

function splitRain(value: string) {
  const match = /^(.+?\smm)\s*\((\d+(?:[.,]\d+)?%)\)$/i.exec(value.trim());
  return match ? { volume: match[1], chance: match[2] } : { volume: undefined, chance: undefined };
}

function keepMeasureTogether(value: string) {
  return value.replace(/(\d+(?:[.,]\d+)?)\s+(km\/h|nós?|mm|m|s|°C)\b/gi, '$1\u00a0$2');
}
