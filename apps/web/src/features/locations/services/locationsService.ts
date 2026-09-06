import { apiRequest } from '@/shared/api/client';
import { mapLocation } from '@/features/fishing/mappers/forecastMapper';
import { parseSpot, parseSpotList } from '@/features/fishing/mappers/wireGuards';
import type { FishingLocation } from '@/features/fishing/types/fishing';

export interface PersonalSpotInput {
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
  city?: string;
  state?: string;
  region?: string;
  shared: boolean;
  seaOrientationDegrees: number;
  profile: FishingLocation['profile'];
}

export async function getLocations(): Promise<FishingLocation[]> {
  return parseSpotList(await apiRequest('/fishing-spots')).map(mapLocation);
}

export async function createLocation(input: PersonalSpotInput): Promise<FishingLocation> {
  return mapLocation(
    parseSpot(
      await apiRequest('/fishing-spots', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    ),
  );
}

export async function updateLocation(
  id: string,
  input: PersonalSpotInput,
): Promise<FishingLocation> {
  return mapLocation(
    parseSpot(
      await apiRequest(`/fishing-spots/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    ),
  );
}

export async function deleteLocation(id: string) {
  await apiRequest(`/fishing-spots/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function setFavorite(spotId: string, isFavorite: boolean) {
  await apiRequest('/me/favorites', {
    method: 'PUT',
    body: JSON.stringify({ spotId, isFavorite }),
  });
}

export async function setEnabled(spotId: string, isEnabled: boolean) {
  await apiRequest('/me/enabled-spots', {
    method: 'PUT',
    body: JSON.stringify({ spotId, isEnabled }),
  });
}

export async function getPendingLocations(): Promise<FishingLocation[]> {
  return parseSpotList(await apiRequest('/admin/fishing-spots/pending')).map(mapLocation);
}

export async function approveLocation(id: string) {
  await apiRequest(`/admin/fishing-spots/${encodeURIComponent(id)}/approve`, { method: 'POST' });
}

export async function rejectLocation(id: string) {
  await apiRequest(`/admin/fishing-spots/${encodeURIComponent(id)}/reject`, { method: 'POST' });
}
