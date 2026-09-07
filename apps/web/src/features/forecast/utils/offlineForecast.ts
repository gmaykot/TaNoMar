import type { FishingForecast } from '@/features/fishing/types/fishing';

const storageKey = 'tanomar.offline-forecast.v1';

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
    return parsed.forecast as FishingForecast;
  } catch {
    return null;
  }
}
