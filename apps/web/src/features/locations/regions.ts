import { normalizeText } from '@/shared/utils/normalizeText';

export const islandWideRegion = 'Ilha de Santa Catarina';

export const islandRegions = [
  { id: 'norte', value: 'norte', shortLabel: 'Norte' },
  { id: 'leste', value: 'leste', shortLabel: 'Leste' },
  { id: 'sul', value: 'sul', shortLabel: 'Sul' },
  { id: 'oeste', value: 'oeste', shortLabel: 'Oeste' },
] as const;

export const extraRegions = [
  { id: 'continente', value: 'continente', shortLabel: 'Continente' },
  { id: 'ilhas', value: 'ilhas', shortLabel: 'Ilhas' },
] as const;

export type IslandRegionId = (typeof islandRegions)[number]['id'];
export type SpotRegion =
  (typeof islandRegions)[number]['value'] | (typeof extraRegions)[number]['value'];

function isIslandRegion(value: string) {
  return islandRegions.some((region) => region.value === value);
}

const aliases: Record<string, string> = {
  florianopolis: islandWideRegion,
  'meu mapa': islandWideRegion,
  'ilha de santa catarina': islandWideRegion,
  norte: 'norte',
  'norte da ilha': 'norte',
  sul: 'sul',
  'sul da ilha': 'sul',
  leste: 'leste',
  'leste da ilha': 'leste',
  oeste: 'oeste',
  'oeste da ilha': 'oeste',
  continente: 'continente',
  ilhas: 'ilhas',
};

export function resolveRegion(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return islandWideRegion;
  return aliases[normalizeText(trimmed)] ?? trimmed;
}

export function resolveSpotRegion(value: string) {
  const resolved = resolveRegion(value);
  return resolved === islandWideRegion ? '' : resolved;
}

export function regionLabel(value: string) {
  const resolved = resolveRegion(value);
  if (resolved === islandWideRegion) return 'Toda a ilha';
  const known = [...islandRegions, ...extraRegions].find((region) => region.value === resolved);
  return known?.shortLabel ?? value;
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
  const selected = normalizeSelection(current);
  const extras = selected.filter(isExtraRegion);
  const hasIslandWide = selected.includes(islandWideRegion);

  if (resolved === islandWideRegion) {
    return normalizeSelection([islandWideRegion, ...extras]);
  }

  if (isExtraRegion(resolved)) {
    const nextExtras = extras.includes(resolved)
      ? extras.filter((item) => item !== resolved)
      : [...extras, resolved];
    return normalizeSelection([
      ...(hasIslandWide ? [islandWideRegion] : selected.filter(isIslandRegion)),
      ...nextExtras,
    ]);
  }

  if (hasIslandWide) {
    return normalizeSelection([resolved, ...extras]);
  }

  const islandParts = selected.filter(isIslandRegion);
  const exists = islandParts.includes(resolved);
  const nextIsland = exists
    ? islandParts.filter((item) => item !== resolved)
    : [...islandParts, resolved];
  return normalizeSelection([...nextIsland, ...extras]);
}

export function regionOptions(
  current: string | string[],
  mode: 'spot' | 'preference' = 'preference',
) {
  const values = Array.isArray(current)
    ? current.map(resolveRegion).filter(Boolean)
    : current
      ? [resolveSpotRegion(current) || resolveRegion(current)].filter(Boolean)
      : [];
  const options = [
    ...islandRegions.map((region) => ({
      id: region.id,
      value: region.value,
      label: region.shortLabel,
    })),
    ...extraRegions.map((region) => ({
      id: region.id,
      value: region.value,
      label: region.shortLabel,
    })),
    ...(mode === 'preference'
      ? [{ id: 'ilha', value: islandWideRegion, label: 'Toda a ilha' }]
      : []),
  ];
  for (const value of values) {
    if (!value || options.some((option) => option.value === value)) continue;
    if (mode === 'spot' && value === islandWideRegion) continue;
    options.push({ id: `custom-${normalizeText(value)}`, value, label: regionLabel(value) });
  }
  return options;
}

function isExtraRegion(value: string) {
  return extraRegions.some((region) => region.value === value);
}

function normalizeSelection(values: string[]) {
  const unique = [...new Set(values.map(resolveRegion).filter(Boolean))];
  const extras = unique.filter(isExtraRegion);
  const islandParts = unique.filter(isIslandRegion);
  const hasIslandWide = unique.includes(islandWideRegion) || coversIsland(islandParts);
  if (unique.length === 0) return [islandWideRegion];
  if (hasIslandWide) return extras.length ? [islandWideRegion, ...extras] : [islandWideRegion];
  return [...islandParts, ...extras];
}

function coversIsland(values: string[]) {
  return islandRegions.every((region) => values.includes(region.value));
}
