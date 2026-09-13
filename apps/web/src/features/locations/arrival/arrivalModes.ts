export type ArrivalMode = 'driving' | 'walking' | 'boat';

const modeCopy = {
  driving: {
    title: 'De carro',
    description: 'Abre o mapa do celular com rota até o ponto. Google Maps, Apple Mapas ou Waze.',
  },
  walking: {
    title: 'A pé',
    description: 'Abre o mapa do celular com caminhada até o local.',
  },
  boat: {
    title: 'De barco',
    description: 'Rumo e distância até o ponto na água. Sem carta náutica.',
  },
} as const;

export function arrivalModesForAccess(accessType: string | null | undefined): ArrivalMode[] {
  switch (accessType) {
    case 'terrestre':
      return ['driving'];
    case 'trilha':
      return ['driving', 'walking'];
    case 'embarcado':
    case 'caiaque':
      return ['boat'];
    case 'misto':
      return ['driving', 'boat'];
    default:
      return ['driving', 'boat'];
  }
}

export function arrivalModeTitle(mode: ArrivalMode, accessType?: string | null) {
  if (mode === 'boat' && accessType === 'caiaque') return 'De caiaque';
  return modeCopy[mode].title;
}

export function arrivalModeDescription(mode: ArrivalMode) {
  return modeCopy[mode].description;
}

export function boatDisclaimer() {
  return 'Não substitui carta náutica nem GPS marítimo.';
}

export function headingDisclaimer() {
  return 'Referência visual. Não use para navegação oficial.';
}

export function arrivalAccessHint(accessType?: string | null) {
  if (accessType === 'misto') return 'Acesso misto · escolha como ir até o local.';
  if (accessType === 'terrestre') return 'Acesso terrestre · rota até o local.';
  if (accessType === 'trilha') return 'Acesso por trilha · carro ou a pé.';
  if (accessType === 'embarcado') return 'Acesso embarcado · rumo até o ponto na água.';
  if (accessType === 'caiaque') return 'Acesso de caiaque · rumo até o ponto na água.';
  return 'Escolha como ir até o local.';
}
