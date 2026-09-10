import type { FishingForecast, ForecastRefresh } from '@/features/fishing/types/fishing';

const storageKey = 'tanomar.offline-forecast.v1';

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
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || !('forecast' in parsed)) return null;
    const forecast = parsed.forecast as FishingForecast;
    return {
      ...forecast,
      refresh: forecast.refresh ?? freshRefresh(),
    };
  } catch {
    return null;
  }
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
