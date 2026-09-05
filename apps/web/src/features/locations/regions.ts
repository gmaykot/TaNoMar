import { normalizeText } from '@/shared/utils/normalizeText';

export const islandWideRegion = 'Ilha de Santa Catarina';

export const islandRegions = [
  { id: 'norte', value: 'Norte da ilha', shortLabel: 'Norte' },
  { id: 'leste', value: 'Leste da ilha', shortLabel: 'Leste' },
  { id: 'sul', value: 'Sul da ilha', shortLabel: 'Sul' },
  { id: 'oeste', value: 'Oeste da ilha', shortLabel: 'Oeste' },
] as const;

export type IslandRegionId = (typeof islandRegions)[number]['id'];

const aliases: Record<string, string> = {
  florianopolis: islandWideRegion,
  'meu mapa': islandWideRegion,
  'ilha de santa catarina': islandWideRegion,
};

export function resolveRegion(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return islandWideRegion;
  const alias = aliases[normalizeText(trimmed)];
  if (alias) return alias;
  const known = islandRegions.find(
    (region) => normalizeText(region.value) === normalizeText(trimmed),
  );
  return known?.value ?? trimmed;
}

export function parseRegions(value: string) {
  const parts = value
    .split('|')
    .map((part) => resolveRegion(part))
    .filter(Boolean);
  return normalizeSelection(parts.length ? parts : [islandWideRegion]);
}

export function serializeRegions(values: string[]) {
  return normalizeSelection(values).join(' | ');
}

export function toggleRegions(current: string[], next: string) {
  const resolved = resolveRegion(next);
  if (resolved === islandWideRegion) return [islandWideRegion];
  const selected = current.includes(islandWideRegion) ? [] : [...current];
  const exists = selected.includes(resolved);
  const nextValues = exists
    ? selected.filter((item) => item !== resolved)
    : [...selected, resolved];
  return normalizeSelection(nextValues);
}

export function regionOptions(current: string | string[]) {
  const values = Array.isArray(current) ? normalizeSelection(current) : parseRegions(current);
  const options = [
    ...islandRegions.map((region) => ({
      id: region.id,
      value: region.value,
      label: region.shortLabel,
    })),
    { id: 'ilha', value: islandWideRegion, label: 'Toda a ilha' },
  ];
  for (const value of values) {
    if (!options.some((option) => option.value === value)) {
      options.push({ id: `custom-${normalizeText(value)}`, value, label: value });
    }
  }
  return options;
}

function normalizeSelection(values: string[]) {
  const unique = [...new Set(values.map(resolveRegion))];
  if (unique.length === 0 || unique.includes(islandWideRegion) || coversIsland(unique)) {
    return [islandWideRegion];
  }
  return unique;
}

function coversIsland(values: string[]) {
  return islandRegions.every((region) => values.includes(region.value));
}
