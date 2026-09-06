import { ContractError } from '@/shared/api/errors';
import { isSamePlace } from '../spotProximity';
import type { PlaceSuggestion } from '../types/place';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function parsePlaceSuggestion(value: unknown): PlaceSuggestion | null {
  if (!isRecord(value)) return null;
  const name = readString(value.name)?.trim() || null;
  const formatted = readString(value.formatted)?.trim() || name;
  const city = readString(value.city)?.trim() || null;
  const state = readString(value.state)?.trim() || null;
  const latitude = readNumber(value.latitude);
  const longitude = readNumber(value.longitude);
  if (!name || !formatted || !city || !state || latitude === null || longitude === null) {
    return null;
  }
  return {
    name,
    formatted,
    city,
    state,
    category: readString(value.category),
    latitude,
    longitude,
  };
}

export function parsePlaceSuggestionList(value: unknown): PlaceSuggestion[] {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new ContractError('Lista de lugares inválida.');
  }
  const items: PlaceSuggestion[] = [];
  for (const item of value.items) {
    const parsed = parsePlaceSuggestion(item);
    if (!parsed) continue;
    if (items.some((existing) => isSamePlace(existing, parsed))) continue;
    items.push(parsed);
  }
  return items;
}
