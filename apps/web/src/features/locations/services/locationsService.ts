import { apiRequest } from '@/shared/api/client';
import { mapAdminOfficialLocation, mapLocation } from '@/features/fishing/mappers/forecastMapper';
import {
  parseAdminOfficialSpot,
  parseAdminOfficialSpotList,
  parseSpot,
  parseSpotList,
} from '@/features/fishing/mappers/wireGuards';
import type { AdminOfficialLocation, FishingLocation } from '@/features/fishing/types/fishing';

export interface PersonalSpotInput {
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
  city?: string;
  state?: string;
  region?: string;
  shared: boolean;
  seaOrientationDegrees: number | null;
  profile: FishingLocation['profile'];
}

export interface OfficialSpotInput {
  name: string;
  latitude: number | null;
  longitude: number | null;
  description?: string;
  city?: string;
  state?: string;
  region?: string;
  seaOrientationDegrees: number | null;
  profile: FishingLocation['profile'];
  type: string;
  fishingEnvironment: string;
  accessType: string;
  restrictionNotes?: string;
  isActive: boolean;
  isFreeDefault: boolean;
}

export interface SpotFormValues {
  name: string;
  latitude: number | null;
  longitude: number | null;
  description?: string;
  city?: string;
  state?: string;
  region?: string;
  shared: boolean;
  seaOrientationDegrees: number | null;
  profile: FishingLocation['profile'];
  type: string;
  fishingEnvironment: string;
  accessType: string;
  restrictionNotes?: string;
  isActive: boolean;
  isFreeDefault: boolean;
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

export async function setIdealWind(spotId: string, idealWindDirectionDegrees: number | null) {
  await apiRequest('/me/spot-wind', {
    method: 'PUT',
    body: JSON.stringify({ spotId, idealWindDirectionDegrees }),
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

export async function getAdminOfficialLocations(): Promise<AdminOfficialLocation[]> {
  return parseAdminOfficialSpotList(await apiRequest('/admin/fishing-spots')).map(
    mapAdminOfficialLocation,
  );
}

export function toPersonalSpotInput(input: SpotFormValues): PersonalSpotInput | null {
  if (input.latitude === null || input.longitude === null) return null;
  return {
    name: input.name,
    latitude: input.latitude,
    longitude: input.longitude,
    description: input.description,
    city: input.city,
    state: input.state,
    region: input.region,
    shared: input.shared,
    seaOrientationDegrees: input.seaOrientationDegrees,
    profile: input.profile,
  };
}

export function toOfficialSpotInput(input: SpotFormValues): OfficialSpotInput {
  return {
    name: input.name,
    latitude: input.latitude,
    longitude: input.longitude,
    description: input.description,
    city: input.city,
    state: input.state,
    region: input.region,
    seaOrientationDegrees: input.seaOrientationDegrees,
    profile: input.profile,
    type: input.type,
    fishingEnvironment: input.fishingEnvironment,
    accessType: input.accessType,
    restrictionNotes: input.restrictionNotes,
    isActive: input.isActive,
    isFreeDefault: input.isFreeDefault,
  };
}

export function officialLocationToInput(location: AdminOfficialLocation): OfficialSpotInput {
  return {
    name: location.name,
    latitude: location.latitude,
    longitude: location.longitude,
    description: location.description ?? undefined,
    city: location.city,
    state: location.state,
    region: location.region,
    seaOrientationDegrees: location.seaOrientationDegrees,
    profile: location.profile,
    type: location.type,
    fishingEnvironment: location.fishingEnvironment ?? 'mar_aberto',
    accessType: location.accessType ?? 'terrestre',
    restrictionNotes: location.restrictionNotes ?? undefined,
    isActive: location.isActive,
    isFreeDefault: location.isFreeDefault,
  };
}

function officialPayload(input: OfficialSpotInput) {
  return {
    name: input.name,
    latitude: input.latitude,
    longitude: input.longitude,
    description: input.description,
    city: input.city,
    state: input.state,
    region: input.region,
    seaOrientationDegrees: input.seaOrientationDegrees,
    profile: input.profile,
    type: input.type,
    fishingEnvironment: input.fishingEnvironment,
    accessType: input.accessType,
    restrictionNotes: input.restrictionNotes,
    isActive: input.isActive,
    isFreeDefault: input.isFreeDefault,
  };
}

export async function createAdminOfficialLocation(
  input: OfficialSpotInput,
): Promise<AdminOfficialLocation> {
  return mapAdminOfficialLocation(
    parseAdminOfficialSpot(
      await apiRequest('/admin/fishing-spots', {
        method: 'POST',
        body: JSON.stringify(officialPayload(input)),
      }),
    ),
  );
}

export async function updateAdminOfficialLocation(
  id: string,
  input: OfficialSpotInput,
): Promise<AdminOfficialLocation> {
  return mapAdminOfficialLocation(
    parseAdminOfficialSpot(
      await apiRequest(`/admin/fishing-spots/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(officialPayload(input)),
      }),
    ),
  );
}

export async function deleteAdminOfficialLocation(id: string) {
  await apiRequest(`/admin/fishing-spots/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
