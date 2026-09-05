import { CloudRain, Droplets, Gauge, Thermometer, Waves, Wind } from 'lucide-react';
import type { FishingMetric, FishingMetricKey } from '@/features/fishing/types/fishing';
import { MetricTile } from '@/design-system/components/MetricTile';
import styles from './forecast.module.css';

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
}

export function MetricGrid({ metrics, keys, limit }: MetricGridProps) {
  const selected = keys
    ? keys.flatMap((key) => {
        const metric = metrics.find((item) => item.key === key);
        return metric ? [metric] : [];
      })
    : metrics;
  const visibleMetrics = typeof limit === 'number' ? selected.slice(0, limit) : selected;
  return (
    <div className={styles.metricGrid}>
      {visibleMetrics.map((metric) => (
        <MetricTile
          key={metric.key}
          icon={metricIcons[metric.key]}
          label={metric.label}
          value={metric.value}
          detail={metric.detail}
          locked={metric.locked}
        />
      ))}
    </div>
  );
}
