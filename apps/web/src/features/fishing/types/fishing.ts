export type FishingClassification = 'excellent' | 'very-good' | 'regular' | 'difficult';

export type FishingMetricKey =
  | 'wind'
  | 'gusts'
  | 'waves'
  | 'wave-period'
  | 'swell'
  | 'rain'
  | 'air-temperature'
  | 'water-temperature';

export interface FishingMetric {
  key: FishingMetricKey;
  label: string;
  value: string;
  detail?: string;
  locked?: boolean;
}

export type ForecastRankingEmphasis =
  'wind' | 'wind-more' | 'rain' | 'rain-more' | 'waves' | 'waves-less';

export interface ForecastRankingItem {
  locationId: string;
  locationName: string;
  score: number;
  classification: FishingClassification;
  bestWindow: string;
  bestHours: string[];
  metrics: FishingMetric[];
}

export interface ForecastDay {
  date: string;
  label: string;
  shortLabel: string;
  ranking: ForecastRankingItem[];
}

export interface FishingForecast {
  generatedAt: string;
  days: ForecastDay[];
}

export interface FishingLocation {
  id: string;
  name: string;
  city: string;
  state: string;
  region: string;
  description: string | null;
  type: string;
  visibility: 'official' | 'shared' | 'private';
  profile: 'praia_aberta' | 'praia_semi_aberta' | 'praia_protegida';
  latitude: number;
  longitude: number;
  seaOrientationDegrees: number;
  isFavorite: boolean;
  isInRanking: boolean;
  isApproved: boolean;
  isOwner: boolean;
}

export interface LocationForecast {
  location: FishingLocation;
  days: Array<Omit<ForecastDay, 'ranking'> & { forecast: ForecastRankingItem }>;
}

export interface MarinePoint {
  time: string;
  value: number;
}

export interface MarineSeries {
  key: 'waves' | 'wave-period' | 'swell' | 'water-temperature';
  label: string;
  current: string;
  range: string;
  direction?: string;
  detail?: string;
  points: MarinePoint[];
  locked?: boolean;
  unavailable?: boolean;
}

export interface MarineTideExtreme {
  type: 'preamar' | 'baixa-mar';
  time: string;
  height: string;
}

export interface MarineTide {
  current: string;
  phase: string;
  nextExtreme: string;
  extremes: MarineTideExtreme[];
  points: MarinePoint[];
  locked?: boolean;
  unavailable?: boolean;
}

export interface MarineDetails {
  spotId: string;
  date: string;
  series: MarineSeries[];
  tide: MarineTide;
}
