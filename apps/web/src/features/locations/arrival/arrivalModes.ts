export type ArrivalMode = 'driving' | 'walking' | 'boat';

const modeCopy = {
  driving: {
    title: 'De carro',
    description: 'Abre o mapa do celular com rota até o local.',
  },
  walking: {
    title: 'A pé',
    description: 'Abre o mapa do celular com caminhada até o local.',
  },
  boat: {
    title: 'De barco',
    description: 'Mostra rumo e distância até o ponto na água.',
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
  return 'Referência visual. Não substitui carta náutica nem GPS marítimo.';
}
