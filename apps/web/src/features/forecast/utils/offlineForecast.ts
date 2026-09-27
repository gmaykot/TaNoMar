import { parseForecastQuality } from '@/features/fishing/mappers/wireGuards';
import type { FishingForecast, ForecastRankingItem, ForecastRefresh } from '@/features/fishing/types/fishing';

const legacyStorageKeys = ['tanomar.offline-forecast.v1', 'tanomar.offline-forecast.v2'] as const;
export const offlineForecastStorageKey = 'tanomar.offline-forecast.v3';

const freshRefresh = (): ForecastRefresh => ({
  state: 'fresh',
  dataUpdatedAt: null,
  pendingSpotIds: [],
  failedSpotIds: [],
});

export function saveOfflineForecast(forecast: FishingForecast) {
  try {
    localStorage.setItem(
      offlineForecastStorageKey,
      JSON.stringify({ savedAt: new Date().toISOString(), forecast }),
    );
    return true;
  } catch {
    return false;
  }
}

export function readOfflineForecast(): FishingForecast | null {
  try {
    for (const key of legacyStorageKeys) localStorage.removeItem(key);
    const raw = localStorage.getItem(offlineForecastStorageKey);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || !('forecast' in parsed)) return null;
    const forecast = parseOfflineForecast((parsed as { forecast: unknown }).forecast);
    if (!forecast) return null;
    return {
      ...forecast,
      refresh: forecast.refresh ?? freshRefresh(),
    };
  } catch {
    return null;
  }
}

function parseOfflineForecast(value: unknown): FishingForecast | null {
  if (!isOfflineForecast(value)) return null;
  return value;
}

function isOfflineForecast(value: unknown): value is FishingForecast {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { generatedAt?: unknown; days?: unknown };
  if (typeof candidate.generatedAt !== 'string' || !Array.isArray(candidate.days)) return false;
  return candidate.days.every((day) => {
    if (typeof day !== 'object' || day === null) return false;
    const item = day as { date?: unknown; ranking?: unknown };
    if (typeof item.date !== 'string' || !Array.isArray(item.ranking)) return false;
    return item.ranking.every((rankingItem) => isOfflineRankingItem(rankingItem));
  });
}

function isOfflineRankingItem(value: unknown): value is ForecastRankingItem {
  if (typeof value !== 'object' || value === null) return false;
  const ranking = value as {
    locationId?: unknown;
    locationName?: unknown;
    score?: unknown;
    bestHours?: unknown;
    metrics?: unknown;
    quality?: unknown;
  };
  if (
    typeof ranking.locationId !== 'string' ||
    typeof ranking.locationName !== 'string' ||
    !Array.isArray(ranking.bestHours) ||
    !Array.isArray(ranking.metrics)
  ) {
    return false;
  }
  if (ranking.score === null) return ranking.quality === undefined;
  if (typeof ranking.score !== 'number' || !Number.isFinite(ranking.score)) return false;
  try {
    parseForecastQuality(ranking.quality);
    return true;
  } catch {
    return false;
  }
}

export function clearOfflineForecast() {
  try {
    localStorage.removeItem(offlineForecastStorageKey);
    for (const key of legacyStorageKeys) localStorage.removeItem(key);
  } catch {
    /* armazenamento indisponível */
  }
}

export function shouldUseOfflineForecast(input: {
  hasOfflineModule: boolean;
  saved: FishingForecast | null;
  liveData: unknown;
  isError: boolean;
  isPending: boolean;
  fetchStatus?: string;
  isOnline?: boolean;
}) {
  if (input.liveData || !input.hasOfflineModule || !input.saved) return false;
  return (
    input.isError || input.isPending || input.fetchStatus === 'paused' || input.isOnline === false
  );
}
