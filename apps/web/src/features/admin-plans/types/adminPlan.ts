import {
  centsFromReaisInput,
  reaisFromCents,
  type BestHoursMode,
  type PlanCatalog,
} from '@/features/subscription/subscriptionPlans';

export interface AdminPlanUpdate {
  name: string;
  tagline: string;
  monthlyPriceCents: number;
  sortOrder: number;
  featured: boolean;
  enabled: boolean;
  maxForecastDays: number;
  bestHoursMode: BestHoursMode;
  maxFavorites: number;
  maxPersonalSpots: number;
  maxAlerts: number;
  maxRankingSpots: number;
  canMarine: boolean;
  canDiary: boolean;
  canOffline: boolean;
  canCustomMetrics: boolean;
  canCustomWind: boolean;
  canCommunityVote: boolean;
  canRankingEmphasis: boolean;
  canLiveWebcams: boolean;
  canSpotArrival: boolean;
  canForecastAlerts: boolean;
  canSpotForecastToggle: boolean;
  canFavorites: boolean;
  canSpotTripPlan: boolean;
}

export interface AdminPlanInput {
  name: string;
  tagline: string;
  monthlyPrice: string;
  sortOrder: number;
  featured: boolean;
  enabled: boolean;
  maxForecastDays: number;
  bestHoursMode: BestHoursMode;
  maxFavorites: number;
  maxPersonalSpots: number;
  maxAlerts: number;
  maxRankingSpots: number;
  canMarine: boolean;
  canDiary: boolean;
  canOffline: boolean;
  canCustomMetrics: boolean;
  canCustomWind: boolean;
  canCommunityVote: boolean;
  canRankingEmphasis: boolean;
  canLiveWebcams: boolean;
  canSpotArrival: boolean;
  canForecastAlerts: boolean;
  canSpotForecastToggle: boolean;
  canFavorites: boolean;
  canSpotTripPlan: boolean;
}

export const planModuleFields = [
  {
    key: 'canMarine',
    label: 'Detalhes do mar',
    hint: 'Ondas, swell, pressão e maré no local.',
  },
  {
    key: 'canDiary',
    label: 'Diário de pesca',
    hint: 'Página do diário e histórico das saídas neste aparelho.',
  },
  {
    key: 'canOffline',
    label: 'Previsão offline',
    hint: 'Salvar a previsão mais recente no aparelho.',
  },
  {
    key: 'canCustomMetrics',
    label: 'Indicadores sob medida',
    hint: 'Escolher quais métricas aparecem na previsão.',
  },
  {
    key: 'canCustomWind',
    label: 'Vento ideal por local',
    hint: 'Personalizar a direção de vento usada na nota de cada local.',
  },
  {
    key: 'canCommunityVote',
    label: 'Confirmar e contestar relatos',
    hint: 'Votar nos relatos da comunidade.',
  },
  {
    key: 'canRankingEmphasis',
    label: 'Ênfase no ranking',
    hint: 'Reordenar o ranking por vento, chuva ou ondas.',
  },
  {
    key: 'canLiveWebcams',
    label: 'Câmeras ao vivo',
    hint: 'Ver e vincular transmissões próximas aos locais.',
  },
  {
    key: 'canSpotArrival',
    label: 'Como chegar',
    hint: 'Abrir rumo ou navegação até o local no detalhe.',
  },
  {
    key: 'canSpotTripPlan',
    label: 'Planejar saída',
    hint: 'Planejar a saída a partir do detalhe do local (guardado neste aparelho).',
  },
  {
    key: 'canForecastAlerts',
    label: 'Alertas no local',
    hint: 'Criar alerta de previsão a partir do detalhe (cota de alertas separada).',
  },
  {
    key: 'canSpotForecastToggle',
    label: 'Nas previsões',
    hint: 'Incluir ou tirar o local das previsões e do ranking pessoal.',
  },
  {
    key: 'canFavorites',
    label: 'Favoritar local',
    hint: 'Marcar favorito no detalhe (cota de favoritos separada).',
  },
] as const;

export function planRevision(plan: PlanCatalog) {
  return [
    plan.code,
    plan.name,
    plan.tagline,
    plan.monthlyPriceCents,
    plan.sortOrder,
    plan.featured,
    plan.enabled,
    plan.activeUserCount,
    plan.entitlements.maxForecastDays,
    plan.entitlements.bestHoursMode ?? '3',
    plan.entitlements.maxFavorites,
    plan.entitlements.maxPersonalSpots,
    plan.entitlements.maxAlerts,
    plan.entitlements.maxRankingSpots ?? 0,
    plan.modules.marine,
    plan.modules.diary,
    plan.modules.offline,
    plan.modules.customMetrics,
    plan.modules.customWind,
    plan.modules.communityVote,
    plan.modules.rankingEmphasis,
    plan.modules.liveWebcams,
    plan.modules.spotArrival ?? true,
    plan.modules.forecastAlerts ?? false,
    plan.modules.spotForecastToggle ?? true,
    plan.modules.favorites ?? false,
    plan.modules.spotTripPlan ?? false,
  ].join('|');
}

export function planToInput(plan: PlanCatalog): AdminPlanInput {
  return {
    name: plan.name,
    tagline: plan.tagline,
    monthlyPrice: reaisFromCents(plan.monthlyPriceCents),
    sortOrder: plan.sortOrder,
    featured: plan.featured,
    enabled: plan.enabled,
    maxForecastDays: plan.entitlements.maxForecastDays,
    bestHoursMode: plan.entitlements.bestHoursMode ?? '3',
    maxFavorites: plan.entitlements.maxFavorites,
    maxPersonalSpots: plan.entitlements.maxPersonalSpots,
    maxAlerts: plan.entitlements.maxAlerts,
    maxRankingSpots: plan.entitlements.maxRankingSpots ?? 0,
    canMarine: plan.modules.marine,
    canDiary: plan.modules.diary,
    canOffline: plan.modules.offline,
    canCustomMetrics: plan.modules.customMetrics,
    canCustomWind: plan.modules.customWind === true,
    canCommunityVote: plan.modules.communityVote,
    canRankingEmphasis: plan.modules.rankingEmphasis,
    canLiveWebcams: plan.modules.liveWebcams,
    canSpotArrival: plan.modules.spotArrival ?? true,
    canForecastAlerts: plan.modules.forecastAlerts ?? false,
    canSpotForecastToggle: plan.modules.spotForecastToggle ?? true,
    canFavorites: plan.modules.favorites ?? false,
    canSpotTripPlan: plan.modules.spotTripPlan ?? false,
  };
}

export function inputToUpdate(input: AdminPlanInput): AdminPlanUpdate | null {
  const monthlyPriceCents = centsFromReaisInput(input.monthlyPrice);
  if (monthlyPriceCents === null) return null;
  return {
    name: input.name,
    tagline: input.tagline,
    monthlyPriceCents,
    sortOrder: input.sortOrder,
    featured: input.featured,
    enabled: input.enabled,
    maxForecastDays: input.maxForecastDays,
    bestHoursMode: input.bestHoursMode,
    maxFavorites: input.maxFavorites,
    maxPersonalSpots: input.maxPersonalSpots,
    maxAlerts: input.maxAlerts,
    maxRankingSpots: input.maxRankingSpots,
    canMarine: input.canMarine,
    canDiary: input.canDiary,
    canOffline: input.canOffline,
    canCustomMetrics: input.canCustomMetrics,
    canCustomWind: input.canCustomWind,
    canCommunityVote: input.canCommunityVote,
    canRankingEmphasis: input.canRankingEmphasis,
    canLiveWebcams: input.canLiveWebcams,
    canSpotArrival: input.canSpotArrival,
    canForecastAlerts: input.canForecastAlerts,
    canSpotForecastToggle: input.canSpotForecastToggle,
    canFavorites: input.canFavorites,
    canSpotTripPlan: input.canSpotTripPlan,
  };
}
