import { apiRequest } from '@/shared/api/client';
import { ApiError } from '@/shared/api/errors';
import {
  mapForecast,
  mapLocationForecast,
  mapMarineDetails,
} from '@/features/fishing/mappers/forecastMapper';
import {
  parseLocationForecast,
  parseMarineDetails,
  parseRankingForecast,
} from '@/features/fishing/mappers/wireGuards';
import type { LocationForecast } from '@/features/fishing/types/fishing';
import { getLocations } from '@/features/locations/services/locationsService';

export async function getForecast() {
  return mapForecast(parseRankingForecast(await apiRequest('/forecasts/ranking')));
}

export async function getLocationForecast(locationId: string): Promise<LocationForecast | null> {
  try {
    const [locations, payload] = await Promise.all([
      getLocations(),
      apiRequest(`/fishing-spots/${encodeURIComponent(locationId)}/forecast`),
    ]);
    const location = locations.find((item) => item.id === locationId);
    if (!location) return null;
    return mapLocationForecast(location, parseLocationForecast(payload));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function getMarineDetails(locationId: string, date: string) {
  return mapMarineDetails(
    parseMarineDetails(
      await apiRequest(
        `/fishing-spots/${encodeURIComponent(locationId)}/marine?date=${encodeURIComponent(date)}`,
      ),
    ),
  );
}
