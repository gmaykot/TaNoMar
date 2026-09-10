import type { FishingLocation, ForecastRankingItem } from '@/features/fishing/types/fishing';
import { extraRegions, islandRegions } from '@/features/locations/regions';
import { coastalProfiles, spotTypes } from '@/features/locations/spotCatalog';

export interface RankingSpotFilters {
  types: string[];
  regions: string[];
  profiles: string[];
}

export const emptyRankingSpotFilters: RankingSpotFilters = {
  types: [],
  regions: [],
  profiles: [],
};

const allowedTypes = new Set(spotTypes.map((item) => item.value));
const allowedRegions = new Set([...islandRegions, ...extraRegions].map((region) => region.value));
const allowedProfiles = new Set(coastalProfiles.map((item) => item.value));

export function parseRankingSpotFilters(params: URLSearchParams): RankingSpotFilters {
  return {
    types: parseCsv(params.get('tipo'), allowedTypes),
    regions: parseCsv(params.get('regiao'), allowedRegions),
    profiles: parseCsv(params.get('exposicao'), allowedProfiles),
  };
}

export function writeRankingSpotFilters(params: URLSearchParams, filters: RankingSpotFilters) {
  setCsv(params, 'tipo', filters.types);
  setCsv(params, 'regiao', filters.regions);
  setCsv(params, 'exposicao', filters.profiles);
}

export function rankingSpotFilterCount(filters: RankingSpotFilters) {
  return filters.types.length + filters.regions.length + filters.profiles.length;
}

export function toggleRankingFilterValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function filterRankingBySpot(
  items: ForecastRankingItem[],
  locationsById: Map<string, FishingLocation>,
  filters: RankingSpotFilters,
) {
  if (rankingSpotFilterCount(filters) === 0 || locationsById.size === 0) return items;
  return items.filter((item) => {
    const location = locationsById.get(item.locationId);
    if (!location) return false;
    if (filters.types.length > 0 && !filters.types.includes(location.type)) return false;
    if (filters.regions.length > 0 && !filters.regions.includes(location.region)) return false;
    if (filters.profiles.length > 0 && !filters.profiles.includes(location.profile)) return false;
    return true;
  });
}

function parseCsv(value: string | null, allowed: Set<string>) {
  if (!value) return [];
  const seen = new Set<string>();
  const items: string[] = [];
  for (const part of value.split(',')) {
    const item = part.trim();
    if (!allowed.has(item) || seen.has(item)) continue;
    seen.add(item);
    items.push(item);
  }
  return items;
}

function setCsv(params: URLSearchParams, key: string, values: string[]) {
  if (values.length > 0) params.set(key, values.join(','));
  else params.delete(key);
}
