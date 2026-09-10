import type { FishingLocation, ForecastRankingItem } from '@/features/fishing/types/fishing';
import { extraRegions, islandRegions } from '@/features/locations/regions';
import { coastalProfiles, spotTypes } from '@/features/locations/spotCatalog';

export interface RankingSpotFilters {
  description: string;
  minimumScore: number | null;
  types: string[];
  regions: string[];
  profiles: string[];
}

export const emptyRankingSpotFilters: RankingSpotFilters = {
  description: '',
  minimumScore: null,
  types: [],
  regions: [],
  profiles: [],
};

const allowedTypes = new Set(spotTypes.map((item) => item.value));
const allowedRegions = new Set([...islandRegions, ...extraRegions].map((region) => region.value));
const allowedProfiles = new Set(coastalProfiles.map((item) => item.value));

export function parseRankingSpotFilters(params: URLSearchParams): RankingSpotFilters {
  return {
    description: params.get('descricao')?.trim() ?? '',
    minimumScore: parseMinimumScore(params.get('nota')),
    types: parseCsv(params.get('tipo'), allowedTypes),
    regions: parseCsv(params.get('regiao'), allowedRegions),
    profiles: parseCsv(params.get('exposicao'), allowedProfiles),
  };
}

export function writeRankingSpotFilters(params: URLSearchParams, filters: RankingSpotFilters) {
  setText(params, 'descricao', filters.description);
  setNumber(params, 'nota', filters.minimumScore);
  setCsv(params, 'tipo', filters.types);
  setCsv(params, 'regiao', filters.regions);
  setCsv(params, 'exposicao', filters.profiles);
}

export function rankingSpotFilterCount(filters: RankingSpotFilters) {
  return (
    (filters.description ? 1 : 0) +
    (filters.minimumScore === null ? 0 : 1) +
    filters.types.length +
    filters.regions.length +
    filters.profiles.length
  );
}

export function toggleRankingFilterValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function filterRankingBySpot(
  items: ForecastRankingItem[],
  locationsById: Map<string, FishingLocation>,
  filters: RankingSpotFilters,
) {
  if (rankingSpotFilterCount(filters) === 0) return items;
  const description = normalizeText(filters.description);
  const needsCatalog =
    filters.types.length > 0 || filters.regions.length > 0 || filters.profiles.length > 0;
  if (needsCatalog && locationsById.size === 0 && filters.minimumScore === null && !description) {
    return items;
  }

  return items.filter((item) => {
    if (filters.minimumScore !== null && item.score < filters.minimumScore) return false;
    const location = locationsById.get(item.locationId);
    if (description && !matchesDescription(item, location, description)) return false;
    if (!needsCatalog) return true;
    if (locationsById.size === 0) return true;
    if (!location) return false;
    if (filters.types.length > 0 && !filters.types.includes(location.type)) return false;
    if (filters.regions.length > 0 && !filters.regions.includes(location.region)) return false;
    if (filters.profiles.length > 0 && !filters.profiles.includes(location.profile)) return false;
    return true;
  });
}

function matchesDescription(
  item: ForecastRankingItem,
  location: FishingLocation | undefined,
  query: string,
) {
  if (normalizeText(item.locationName).includes(query)) return true;
  if (location && normalizeText(location.name).includes(query)) return true;
  return Boolean(location && normalizeText(location.description ?? '').includes(query));
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

function parseMinimumScore(value: string | null) {
  if (!value) return null;
  const score = Number(value);
  return Number.isFinite(score) && score >= 0 && score <= 10 ? score : null;
}

function setText(params: URLSearchParams, key: string, value: string) {
  const normalized = value.trim();
  if (normalized) params.set(key, normalized);
  else params.delete(key);
}

function setNumber(params: URLSearchParams, key: string, value: number | null) {
  if (value !== null) params.set(key, String(value));
  else params.delete(key);
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}
