import { normalizeText } from '@/shared/utils/normalizeText';
import type { FishingLocation } from '@/features/fishing/types/fishing';

/** Mesma regra de `IsDuplicateSpot` na API. */
export const duplicateSpotMeters = 200;

export function distanceMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const radians = Math.PI / 180;
  const a =
    Math.sin(((latitudeB - latitudeA) * radians) / 2) ** 2 +
    Math.cos(latitudeA * radians) *
      Math.cos(latitudeB * radians) *
      Math.sin(((longitudeB - longitudeA) * radians) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isSamePlace(
  left: { name: string; latitude: number; longitude: number },
  right: { name: string; latitude: number; longitude: number },
) {
  return (
    normalizeText(left.name) === normalizeText(right.name) ||
    distanceMeters(left.latitude, left.longitude, right.latitude, right.longitude) <=
      duplicateSpotMeters
  );
}

export interface SimilarLocationMatch {
  location: FishingLocation;
  reason: 'proximity' | 'name';
  meters: number | null;
}

export function findSimilarLocation(
  locations: FishingLocation[],
  input: {
    name: string;
    latitude: number | null;
    longitude: number | null;
    excludeId?: string;
  },
): SimilarLocationMatch | null {
  const candidates = locations.filter((item) => item.id !== input.excludeId);
  const latitude = input.latitude;
  const longitude = input.longitude;

  let closest: SimilarLocationMatch | null = null;
  if (
    latitude !== null &&
    longitude !== null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  ) {
    for (const location of candidates) {
      if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) continue;
      const meters = distanceMeters(location.latitude, location.longitude, latitude, longitude);
      if (meters > duplicateSpotMeters) continue;
      if (
        !closest ||
        closest.reason !== 'proximity' ||
        closest.meters === null ||
        meters < closest.meters
      ) {
        closest = { location, reason: 'proximity', meters };
      }
    }
  }
  if (closest) return closest;

  const name = normalizeText(input.name.trim());
  if (!name) return null;
  const byName = candidates.find((item) => normalizeText(item.name) === name);
  return byName ? { location: byName, reason: 'name', meters: null } : null;
}
