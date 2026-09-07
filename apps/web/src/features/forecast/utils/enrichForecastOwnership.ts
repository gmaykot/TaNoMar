import type { FishingForecast, FishingLocation } from '@/features/fishing/types/fishing';

export function enrichForecastOwnership(
  forecast: FishingForecast,
  locations: FishingLocation[],
): FishingForecast {
  const ownerIds = new Set(
    locations.filter((location) => location.isOwner).map((location) => location.id),
  );
  if (ownerIds.size === 0) return forecast;

  return {
    ...forecast,
    days: forecast.days.map((day) => ({
      ...day,
      ranking: day.ranking.map((item) =>
        ownerIds.has(item.locationId) ? { ...item, isOwner: true } : item,
      ),
    })),
  };
}
