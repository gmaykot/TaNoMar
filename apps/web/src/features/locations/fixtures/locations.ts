import type { FishingLocation } from '@/features/fishing/types/fishing';

function official(
  location: Omit<
    FishingLocation,
    | 'description'
    | 'type'
    | 'visibility'
    | 'isFavorite'
    | 'isInRanking'
    | 'isApproved'
    | 'isOwner'
    | 'seaOrientationDegrees'
  > & { seaOrientationDegrees?: number },
): FishingLocation {
  return {
    description: null,
    type: 'praia',
    visibility: 'official',
    isFavorite: false,
    isInRanking: true,
    isApproved: true,
    isOwner: false,
    seaOrientationDegrees: location.seaOrientationDegrees ?? 0,
    ...location,
  };
}

export const locationsFixture: FishingLocation[] = [
  official({
    id: 'campeche',
    name: 'Campeche',
    city: 'Florianópolis',
    state: 'SC',
    region: 'Sul da ilha',
    profile: 'praia_aberta',
    latitude: -27.65407,
    longitude: -48.46908,
    seaOrientationDegrees: 110,
  }),
  official({
    id: 'morro_das_pedras',
    name: 'Morro das Pedras',
    city: 'Florianópolis',
    state: 'SC',
    region: 'Sul da ilha',
    profile: 'praia_aberta',
    latitude: -27.7045,
    longitude: -48.486,
    seaOrientationDegrees: 120,
  }),
  official({
    id: 'armacao',
    name: 'Armação',
    city: 'Florianópolis',
    state: 'SC',
    region: 'Sul da ilha',
    profile: 'praia_semi_aberta',
    latitude: -27.73539,
    longitude: -48.50789,
    seaOrientationDegrees: 105,
  }),
  official({
    id: 'matadeiro',
    name: 'Matadeiro',
    city: 'Florianópolis',
    state: 'SC',
    region: 'Sul da ilha',
    profile: 'praia_semi_aberta',
    latitude: -27.7556,
    longitude: -48.49822,
    seaOrientationDegrees: 115,
  }),
  official({
    id: 'pantano_do_sul',
    name: 'Pântano do Sul',
    city: 'Florianópolis',
    state: 'SC',
    region: 'Sul da ilha',
    profile: 'praia_protegida',
    latitude: -27.77573,
    longitude: -48.50612,
    seaOrientationDegrees: 145,
  }),
  official({
    id: 'acores',
    name: 'Açores',
    city: 'Florianópolis',
    state: 'SC',
    region: 'Sul da ilha',
    profile: 'praia_semi_aberta',
    latitude: -27.7864,
    longitude: -48.526,
    seaOrientationDegrees: 165,
  }),
  official({
    id: 'solidao',
    name: 'Solidão',
    city: 'Florianópolis',
    state: 'SC',
    region: 'Sul da ilha',
    profile: 'praia_semi_aberta',
    latitude: -27.8055,
    longitude: -48.532,
    seaOrientationDegrees: 170,
  }),
  official({
    id: 'joaquina',
    name: 'Joaquina',
    city: 'Florianópolis',
    state: 'SC',
    region: 'Leste da ilha',
    profile: 'praia_aberta',
    latitude: -27.6308,
    longitude: -48.4508,
    seaOrientationDegrees: 100,
  }),
  official({
    id: 'barra_da_lagoa',
    name: 'Barra da Lagoa',
    city: 'Florianópolis',
    state: 'SC',
    region: 'Leste da ilha',
    profile: 'praia_semi_aberta',
    latitude: -27.5745,
    longitude: -48.424,
    seaOrientationDegrees: 90,
  }),
  official({
    id: 'lagoa-conceicao',
    name: 'Lagoa da Conceição',
    city: 'Florianópolis',
    state: 'SC',
    region: 'Leste da ilha',
    profile: 'praia_protegida',
    latitude: -27.55968,
    longitude: -48.45365,
    seaOrientationDegrees: 90,
  }),
  official({
    id: 'ribeirao',
    name: 'Ribeirão da Ilha',
    city: 'Florianópolis',
    state: 'SC',
    region: 'Oeste da ilha',
    profile: 'praia_protegida',
    latitude: -27.71773,
    longitude: -48.56266,
    seaOrientationDegrees: 270,
  }),
];
