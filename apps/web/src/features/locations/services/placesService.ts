import { apiRequest } from '@/shared/api/client';
import { parsePlaceSuggestionList } from '../mappers/placesMapper';
import type { PlaceSuggestion } from '../types/place';

export const minPlaceQueryLength = 3;

export type { PlaceSuggestion };

export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  const text = query.trim();
  if (text.length < minPlaceQueryLength) return [];
  return parsePlaceSuggestionList(
    await apiRequest(`/places/autocomplete?q=${encodeURIComponent(text)}`),
  );
}
