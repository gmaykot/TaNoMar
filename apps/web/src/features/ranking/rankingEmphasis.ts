import type { FishingMetricKey, ForecastRankingEmphasis } from '@/features/fishing/types/fishing';

export type RankingEmphasis = 'score' | ForecastRankingEmphasis;
export type RankingEmphasisMetric = 'wind' | 'rain' | 'waves';
export type RankingEmphasisDirection = 'more' | 'less';

const metricOrder: FishingMetricKey[] = [
  'wind',
  'gusts',
  'waves',
  'wave-period',
  'swell',
  'rain',
  'air-temperature',
  'water-temperature',
];

const defaultByMetric: Record<RankingEmphasisMetric, ForecastRankingEmphasis> = {
  wind: 'wind',
  rain: 'rain',
  waves: 'waves',
};

const oppositeByMetric: Record<RankingEmphasisMetric, ForecastRankingEmphasis> = {
  wind: 'wind-more',
  rain: 'rain-more',
  waves: 'waves-less',
};

const urlByEmphasis: Record<RankingEmphasis, string | null> = {
  score: null,
  wind: 'vento',
  'wind-more': 'mais-vento',
  rain: 'chuva',
  'rain-more': 'mais-chuva',
  waves: 'ondas',
  'waves-less': 'menos-ondas',
};

const metricByEmphasis: Record<ForecastRankingEmphasis, RankingEmphasisMetric> = {
  wind: 'wind',
  'wind-more': 'wind',
  rain: 'rain',
  'rain-more': 'rain',
  waves: 'waves',
  'waves-less': 'waves',
};

const directionByEmphasis: Record<ForecastRankingEmphasis, RankingEmphasisDirection> = {
  wind: 'less',
  'wind-more': 'more',
  rain: 'less',
  'rain-more': 'more',
  waves: 'more',
  'waves-less': 'less',
};

const metricLabel: Record<RankingEmphasisMetric, string> = {
  wind: 'Vento',
  rain: 'Chuva',
  waves: 'Ondas',
};

const directionPhrase: Record<ForecastRankingEmphasis, string> = {
  wind: 'menos vento',
  'wind-more': 'mais vento',
  rain: 'menos chuva',
  'rain-more': 'mais chuva',
  waves: 'mais ondas',
  'waves-less': 'menos ondas',
};

export function parseRankingEmphasis(value: string | null, premium: boolean): RankingEmphasis {
  if (!premium) return 'score';
  if (value === 'vento') return 'wind';
  if (value === 'mais-vento') return 'wind-more';
  if (value === 'chuva') return 'rain';
  if (value === 'mais-chuva') return 'rain-more';
  if (value === 'ondas') return 'waves';
  if (value === 'menos-ondas') return 'waves-less';
  return 'score';
}

export function rankingEmphasisQueryValue(emphasis: RankingEmphasis) {
  return urlByEmphasis[emphasis];
}

export function rankingEmphasisMetricLabel(metric: RankingEmphasisMetric) {
  return metricLabel[metric];
}

export function rankingEmphasisParam(
  emphasis: RankingEmphasis,
): ForecastRankingEmphasis | undefined {
  return emphasis === 'score' ? undefined : emphasis;
}

export function rankingEmphasisMetric(
  emphasis: RankingEmphasis,
): RankingEmphasisMetric | undefined {
  return emphasis === 'score' ? undefined : metricByEmphasis[emphasis];
}

export function rankingEmphasisDirection(
  emphasis: RankingEmphasis,
): RankingEmphasisDirection | undefined {
  return emphasis === 'score' ? undefined : directionByEmphasis[emphasis];
}

export function rankingEmphasisMetricKey(emphasis: RankingEmphasis): FishingMetricKey | undefined {
  return rankingEmphasisMetric(emphasis);
}

export function cycleRankingEmphasis(
  current: RankingEmphasis,
  metric: RankingEmphasisMetric,
): RankingEmphasis {
  if (rankingEmphasisMetric(current) !== metric) return defaultByMetric[metric];
  if (current === defaultByMetric[metric]) return oppositeByMetric[metric];
  return 'score';
}

export function rankingEmphasisControlLabel(
  metric: RankingEmphasisMetric,
  current: RankingEmphasis,
  locked = false,
) {
  if (locked) return `${metricLabel[metric]}, disponível no Premium`;
  const active = rankingEmphasisMetric(current) === metric;
  if (!active) {
    return `${metricLabel[metric]}. Toque para ordenar com ${directionPhrase[defaultByMetric[metric]]}.`;
  }
  if (current === defaultByMetric[metric]) {
    return `${capitalize(directionPhrase[current])}. Toque para ordenar com ${directionPhrase[oppositeByMetric[metric]]}.`;
  }
  return `${capitalize(directionPhrase[current as ForecastRankingEmphasis])}. Toque para remover a ênfase.`;
}

export function rankingMetricKeys(emphasisKey?: FishingMetricKey): FishingMetricKey[] | undefined {
  if (!emphasisKey) return undefined;
  return [emphasisKey, ...metricOrder.filter((key) => key !== emphasisKey)];
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
