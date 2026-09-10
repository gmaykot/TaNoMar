export const spotTypes = [
  { value: 'praia', label: 'Praia' },
  { value: 'costao', label: 'Costão' },
  { value: 'canal', label: 'Canal' },
  { value: 'lagoa', label: 'Lagoa' },
  { value: 'rio', label: 'Rio' },
  { value: 'estuario', label: 'Estuário' },
  { value: 'ilha', label: 'Ilha' },
  { value: 'pier', label: 'Píer' },
  { value: 'outro', label: 'Outro' },
] as const;

export const fishingEnvironments = [
  { value: 'mar_aberto', label: 'Mar aberto' },
  { value: 'baia', label: 'Baía' },
  { value: 'lagunar', label: 'Lagunar' },
  { value: 'estuarino', label: 'Estuarino' },
  { value: 'fluvial', label: 'Fluvial' },
] as const;

export const accessTypes = [
  { value: 'terrestre', label: 'Terrestre' },
  { value: 'trilha', label: 'Trilha' },
  { value: 'embarcado', label: 'Embarcado' },
  { value: 'caiaque', label: 'Caiaque' },
  { value: 'misto', label: 'Misto' },
] as const;

export const coastalProfiles = [
  { value: 'praia_aberta', label: 'Aberta' },
  { value: 'praia_semi_aberta', label: 'Semiaberta' },
  { value: 'praia_protegida', label: 'Protegida' },
] as const;

export type SpotType = (typeof spotTypes)[number]['value'];
export type FishingEnvironment = (typeof fishingEnvironments)[number]['value'];
export type AccessType = (typeof accessTypes)[number]['value'];
export type CoastalProfile = (typeof coastalProfiles)[number]['value'];

function labelOf<T extends { value: string; label: string }>(
  items: readonly T[],
  value: string | null | undefined,
) {
  return items.find((item) => item.value === value)?.label ?? value ?? '';
}

export function spotTypeLabel(value: string | null | undefined) {
  return labelOf(spotTypes, value);
}

export function fishingEnvironmentLabel(value: string | null | undefined) {
  return labelOf(fishingEnvironments, value);
}

export function accessTypeLabel(value: string | null | undefined) {
  return labelOf(accessTypes, value);
}

export function coastalProfileLabel(value: string | null | undefined) {
  return labelOf(coastalProfiles, value);
}
