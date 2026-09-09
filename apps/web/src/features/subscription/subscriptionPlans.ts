import type { PlanModules } from '@/features/auth/types/auth';

export type BestHoursMode = '1' | '2' | '3' | 'custom';

export interface PlanEntitlements {
  maxForecastDays: number;
  bestHoursMode?: BestHoursMode;
  maxFavorites: number;
  maxPersonalSpots: number;
  maxAlerts: number;
}

export interface PlanCatalog {
  code: string;
  name: string;
  tagline: string;
  monthlyPriceCents: number;
  featured: boolean;
  enabled: boolean;
  sortOrder: number;
  activeUserCount: number;
  entitlements: PlanEntitlements;
  modules: PlanModules;
}

export type SubscriptionPlanIcon = 'anchor' | 'compass' | 'ship';

export function formatBrlFromCents(cents: number) {
  const value = (Math.round(cents) / 100).toFixed(2).replace('.', ',');
  return `R$ ${value}`;
}

export function reaisFromCents(cents: number) {
  return (Math.round(cents) / 100).toFixed(2);
}

export function centsFromReaisInput(value: string) {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
  if (!normalized) return null;
  const reais = Number(normalized);
  if (!Number.isFinite(reais)) return null;
  return Math.round(reais * 100);
}

export function plansWithFreeBaseline(paidPlans: PlanCatalog[], catalog?: PlanCatalog[] | null) {
  const free =
    catalog?.find((plan) => plan.code === 'free') ?? paidPlans.find((plan) => plan.code === 'free');
  const paid = paidPlans.filter((plan) => plan.code !== 'free');
  return free ? [free, ...paid] : paid;
}

export function subscriptionPlanIcon(code: string): SubscriptionPlanIcon {
  if (code === 'arrais') return 'anchor';
  if (code === 'capitao') return 'ship';
  return 'compass';
}

export function planFeatureList(plan: PlanCatalog) {
  const { maxForecastDays, maxFavorites, maxPersonalSpots, maxAlerts } = plan.entitlements;
  const items = [`Até ${maxForecastDays} dias de previsão`];
  if (plan.modules.marine) items.push('Detalhes de ondas, swell, temperaturas e maré');
  items.push(`Cadastre até ${maxPersonalSpots} locais próprios`);
  items.push(`Salve até ${maxFavorites} locais favoritos`);
  items.push(`Mantenha até ${maxAlerts} alertas ativos ao mesmo tempo`);
  if (plan.modules.diary) items.push('Diário e planejamento de saídas');
  if (plan.modules.offline) items.push('Previsão salva no aparelho para consultar sem conexão');
  if (plan.modules.customMetrics) items.push('Escolha quais indicadores quer acompanhar');
  if (plan.modules.customWind) items.push('Defina o vento ideal em cada local');
  if (plan.modules.communityVote) items.push('Ajude a validar relatos da comunidade');
  if (plan.modules.rankingEmphasis)
    items.push('Ordene o ranking por vento, chuva ou ondas sem mudar a nota');
  if (plan.modules.liveWebcams) items.push('Câmeras ao vivo nos locais com transmissão');
  return items;
}
