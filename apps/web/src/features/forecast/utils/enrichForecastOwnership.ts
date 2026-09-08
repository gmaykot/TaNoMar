import type { FishingForecast, FishingLocation } from '@/features/fishing/types/fishing';

export function enrichForecastOwnership(
  forecast: FishingForecast,
  locations: FishingLocation[],
): FishingForecast {
  const byId = new Map(locations.map((location) => [location.id, location]));
  if (byId.size === 0) return forecast;

  return {
    ...forecast,
    days: forecast.days.map((day) => ({
      ...day,
      ranking: day.ranking.map((item) => {
        const location = byId.get(item.locationId);
        if (!location) return item;
        return {
          ...item,
          isOwner: item.isOwner || location.isOwner,
          visibility: location.visibility,
        };
      }),
    })),
  };
}
