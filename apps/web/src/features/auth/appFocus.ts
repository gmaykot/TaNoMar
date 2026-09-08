import { fishingMetricKeys, type FishingMetricKey } from '@/features/fishing/types/fishing';

export const appFocusValues = ['pescador', 'surfista', 'ambos'] as const;

export type AppFocus = (typeof appFocusValues)[number];

export const focusMetricKeys: Record<AppFocus, FishingMetricKey[]> = {
  pescador: ['wind', 'gusts', 'waves', 'rain', 'air-temperature', 'water-temperature'],
  surfista: ['wind', 'waves', 'wave-period', 'swell', 'gusts'],
  ambos: [...fishingMetricKeys],
};

const locationPrimaryByFocus: Record<AppFocus, FishingMetricKey[]> = {
  pescador: ['wind', 'gusts', 'rain', 'air-temperature'],
  surfista: ['wind', 'waves', 'wave-period', 'swell'],
  ambos: ['wind', 'gusts', 'rain', 'air-temperature'],
};

export function isAppFocus(value: unknown): value is AppFocus {
  return typeof value === 'string' && (appFocusValues as readonly string[]).includes(value);
}

export function hasChosenAppFocus(focus: AppFocus | null | undefined): focus is AppFocus {
  return isAppFocus(focus);
}

export function effectiveFocus(
  focus: AppFocus | null | undefined,
  showAppFocus: boolean,
): AppFocus {
  if (!showAppFocus) return 'pescador';
  return isAppFocus(focus) ? focus : 'pescador';
}

export function showsCommunity(focus: AppFocus | null | undefined) {
  return focus !== 'surfista';
}

export function showsForecastAlerts(focus: AppFocus | null | undefined) {
  return focus !== 'surfista';
}

export function resolveVisibleMetricKeys(
  focus: AppFocus | null | undefined,
  customMetrics?: FishingMetricKey[],
): FishingMetricKey[] | undefined {
  const focusKeys = focusMetricKeys[isAppFocus(focus) ? focus : 'ambos'];
  if (!customMetrics && (!focus || focus === 'ambos')) return undefined;
  return customMetrics ? focusKeys.filter((key) => customMetrics.includes(key)) : focusKeys;
}

export function locationPrimaryMetricKeys(focus: AppFocus | null | undefined): FishingMetricKey[] {
  return locationPrimaryByFocus[isAppFocus(focus) ? focus : 'ambos'];
}

export function showsFishingScore(focus: AppFocus | null | undefined) {
  return focus !== 'surfista';
}

export function prefersMarineDetails(focus: AppFocus | null | undefined) {
  return focus === 'surfista';
}

export function homeWhenPhrase(dayLabel?: string) {
  if (!dayLabel || dayLabel === 'Hoje') return 'hoje';
  if (dayLabel === 'Amanhã') return 'amanhã';
  return `na ${dayLabel.toLowerCase()}`;
}

export function homeCopy(focus: AppFocus | null | undefined, dayLabel?: string) {
  const when = homeWhenPhrase(dayLabel);
  if (focus === 'surfista') {
    return {
      eyebrow: 'Condições do mar',
      title: `Como está o mar ${when}?`,
      description: 'Ondulação, vento e maré nos seus locais.',
      premiumTitle: 'Veja mais do mar na assinatura',
    };
  }
  if (focus === 'ambos') {
    return {
      eyebrow: 'Decisão no mar',
      title: `Onde vale ir ${when}?`,
      description: 'Nota pela média das 3 melhores horas.',
      premiumTitle: 'Pesque com mais contexto na assinatura',
    };
  }
  return {
    eyebrow: 'Decisão de pesca',
    title: 'Onde vale pescar?',
    description: `Escolha local e horário ${when} com base nas condições.`,
    premiumTitle: 'Pesque com mais contexto na assinatura',
  };
}

export function rankingCopy(focus: AppFocus | null | undefined) {
  if (focus === 'surfista') {
    return {
      eyebrow: 'Visão comparativa',
      title: 'Os seus locais, lado a lado.',
      description: 'Compare ondulação, vento e maré.',
    };
  }
  if (focus === 'ambos') {
    return {
      eyebrow: 'Visão comparativa',
      title: 'Os melhores locais, em ordem.',
      description: 'Ordem pela média das 3 melhores horas.',
    };
  }
  return {
    eyebrow: 'Visão comparativa',
    title: 'Os melhores locais, em ordem.',
    description: 'Ordem pela média das 3 melhores horas.',
  };
}

export function forecastPresentation(
  preferences:
    | {
        focus?: AppFocus | null;
        visibleMetrics?: FishingMetricKey[];
      }
    | null
    | undefined,
  canCustomizeMetrics: boolean,
  showAppFocus = false,
) {
  const focus = effectiveFocus(preferences?.focus, showAppFocus);
  return {
    focus,
    visibleMetricKeys: resolveVisibleMetricKeys(
      focus,
      canCustomizeMetrics ? preferences?.visibleMetrics : undefined,
    ),
    showFishingScore: showsFishingScore(focus),
    showCommunity: showsCommunity(focus),
    showForecastAlerts: showsForecastAlerts(focus),
    preferMarineDetails: prefersMarineDetails(focus),
    home: homeCopy(focus),
    ranking: rankingCopy(focus),
  };
}

export const focusChoices: Array<{
  id: AppFocus;
  title: string;
  description: string;
}> = [
  {
    id: 'pescador',
    title: 'Pescador',
    description: 'Nota, melhores horários e condições para pescar.',
  },
  {
    id: 'surfista',
    title: 'Surfista',
    description: 'Ondulação, período, swell, vento e maré.',
  },
  {
    id: 'ambos',
    title: 'Ambos',
    description: 'Visão completa, sem esconder indicadores.',
  },
];
