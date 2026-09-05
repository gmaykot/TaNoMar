export type WireMetricState = 'available' | 'locked' | 'unavailable';

export interface WireAvailableMetric<T> {
  state: 'available';
  value: T;
}

export interface WireLockedMetric {
  state: 'locked';
  reason: string;
  requiredPlan: string;
}

export interface WireUnavailableMetric {
  state: 'unavailable';
}

export type WireMetric<T> = WireAvailableMetric<T> | WireLockedMetric;
export type WireOptionalMetric<T> = WireMetric<T> | WireUnavailableMetric;

export interface WireMarinePoint {
  time: string;
  value: number;
}

export interface WireMarineSeries {
  current: string;
  range: string;
  direction?: string | null;
  detail?: string | null;
  points: WireMarinePoint[];
}

export interface WireTideExtreme {
  type: string;
  time: string;
  height: string;
}

export interface WireTideValue {
  current: string;
  phase: string;
  nextExtreme: string;
  attribution?: string | null;
  extremes: WireTideExtreme[];
  points: WireMarinePoint[];
}

export interface WireMarineDetails {
  spotId: string;
  date: string;
  waves: WireMetric<WireMarineSeries>;
  wavePeriod: WireMetric<WireMarineSeries>;
  swell: WireMetric<WireMarineSeries>;
  waterTemperature: WireMetric<WireMarineSeries>;
  atmosphericPressure: WireMetric<WireMarineSeries>;
  tide: WireOptionalMetric<WireTideValue>;
}

export interface WireSpot {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string;
  state: string;
  region: string;
  type: string;
  visibility: string;
  profile: string;
  latitude: number | null;
  longitude: number | null;
  seaOrientationDegrees: number;
  isFavorite: boolean;
  isInRanking: boolean;
  isApproved: boolean;
  isOwner: boolean;
}

export interface WireForecastItem {
  spotId: string;
  spotName: string;
  score: WireMetric<number>;
  classification: WireMetric<string>;
  bestHours: WireMetric<string[]>;
  wind: WireMetric<string>;
  gusts: WireMetric<string>;
  waves: WireMetric<string>;
  wavePeriod: WireMetric<string>;
  swell: WireMetric<string>;
  rain: WireMetric<string>;
  airTemperature: WireMetric<string>;
  waterTemperature: WireMetric<string>;
}

export interface WireForecastDay {
  date: string;
  ranking: WireForecastItem[];
  unavailableSpotIds: string[];
}

export interface WireRankingForecast {
  generatedAt: string;
  availableFrom: string;
  availableTo: string;
  days: WireForecastDay[];
}

export interface WireLocationForecast {
  spotId: string;
  days: WireForecastDay[];
}
