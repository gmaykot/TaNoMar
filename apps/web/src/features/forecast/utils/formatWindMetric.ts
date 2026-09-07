import type { FishingMetric } from '@/features/fishing/types/fishing';

export function formatWindMetric(metric: FishingMetric, windUnit?: string) {
  if (windUnit !== 'kt' || (metric.key !== 'wind' && metric.key !== 'gusts')) return metric.value;

  return metric.value.replace(/(\d+(?:[.,]\d+)?) km\/h/, (_, value: string) => {
    const knots = Number(value.replace(',', '.')) / 1.852;
    return `${knots.toFixed(1).replace('.', ',')} nós`;
  });
}
