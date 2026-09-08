import {
  centsFromReaisInput,
  reaisFromCents,
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
  maxFavorites: number;
  maxPersonalSpots: number;
  maxAlerts: number;
  canMarine: boolean;
  canDiary: boolean;
  canOffline: boolean;
  canCustomMetrics: boolean;
  canCommunityVote: boolean;
  canRankingEmphasis: boolean;
}

export interface AdminPlanInput {
  name: string;
  tagline: string;
  monthlyPrice: string;
  sortOrder: number;
  featured: boolean;
  enabled: boolean;
  maxForecastDays: number;
  maxFavorites: number;
  maxPersonalSpots: number;
  maxAlerts: number;
  canMarine: boolean;
  canDiary: boolean;
  canOffline: boolean;
  canCustomMetrics: boolean;
  canCommunityVote: boolean;
  canRankingEmphasis: boolean;
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
    hint: 'Registro das saídas neste aparelho.',
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
    key: 'canCommunityVote',
    label: 'Confirmar e contestar relatos',
    hint: 'Votar nos relatos da comunidade.',
  },
  {
    key: 'canRankingEmphasis',
    label: 'Ênfase no ranking',
    hint: 'Reordenar o ranking por vento, chuva ou ondas.',
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
    plan.entitlements.maxFavorites,
    plan.entitlements.maxPersonalSpots,
    plan.entitlements.maxAlerts,
    plan.modules.marine,
    plan.modules.diary,
    plan.modules.offline,
    plan.modules.customMetrics,
    plan.modules.communityVote,
    plan.modules.rankingEmphasis,
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
    maxFavorites: plan.entitlements.maxFavorites,
    maxPersonalSpots: plan.entitlements.maxPersonalSpots,
    maxAlerts: plan.entitlements.maxAlerts,
    canMarine: plan.modules.marine,
    canDiary: plan.modules.diary,
    canOffline: plan.modules.offline,
    canCustomMetrics: plan.modules.customMetrics,
    canCommunityVote: plan.modules.communityVote,
    canRankingEmphasis: plan.modules.rankingEmphasis,
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
    maxFavorites: input.maxFavorites,
    maxPersonalSpots: input.maxPersonalSpots,
    maxAlerts: input.maxAlerts,
    canMarine: input.canMarine,
    canDiary: input.canDiary,
    canOffline: input.canOffline,
    canCustomMetrics: input.canCustomMetrics,
    canCommunityVote: input.canCommunityVote,
    canRankingEmphasis: input.canRankingEmphasis,
  };
}
