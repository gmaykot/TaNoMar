import type { FishingForecast, ForecastRefresh } from '@/features/fishing/types/fishing';

const legacyStorageKey = 'tanomar.offline-forecast.v1';
const storageKey = 'tanomar.offline-forecast.v2';

const freshRefresh = (): ForecastRefresh => ({
  state: 'fresh',
  dataUpdatedAt: null,
  pendingSpotIds: [],
  failedSpotIds: [],
});

export function saveOfflineForecast(forecast: FishingForecast) {
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ savedAt: new Date().toISOString(), forecast }),
    );
    return true;
  } catch {
    return false;
  }
}

export function readOfflineForecast(): FishingForecast | null {
  try {
    localStorage.removeItem(legacyStorageKey);
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || !('forecast' in parsed)) return null;
    const forecast = parseOfflineForecast(parsed.forecast);
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
  if (value.days.some((day) => {
    if (typeof day !== 'object' || day === null) return true;
    const item = day as { date?: unknown; ranking?: unknown; unavailableSpotIds?: unknown };
    return typeof item.date !== 'string' || !Array.isArray(item.ranking);
  })) return null;
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
    return item.ranking.every((rankingItem) => {
      if (typeof rankingItem !== 'object' || rankingItem === null) return false;
      const ranking = rankingItem as {
        locationId?: unknown;
        locationName?: unknown;
        score?: unknown;
        bestHours?: unknown;
        metrics?: unknown;
      };
      return (
        typeof ranking.locationId === 'string' &&
        typeof ranking.locationName === 'string' &&
        (typeof ranking.score === 'number' || ranking.score === null) &&
        Array.isArray(ranking.bestHours) &&
        Array.isArray(ranking.metrics)
      );
    });
  });
}

export function clearOfflineForecast() {
  try {
    localStorage.removeItem(storageKey);
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
