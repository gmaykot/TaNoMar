import type { PlanModules } from '@/features/auth/types/auth';

export interface PlanEntitlements {
  maxForecastDays: number;
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

export function subscriptionPlanIcon(code: string): SubscriptionPlanIcon {
  if (code === 'arrais') return 'anchor';
  if (code === 'capitao') return 'ship';
  return 'compass';
}

export function planFeatureList(plan: PlanCatalog) {
  const { maxForecastDays, maxFavorites, maxPersonalSpots, maxAlerts } = plan.entitlements;
  const items = [`Até ${maxForecastDays} dias de previsão`];
  if (plan.modules.marine) items.push('Detalhes do mar');
  items.push(`${maxPersonalSpots} locais pessoais e ${maxFavorites} favoritos`);
  items.push(maxAlerts === 1 ? '1 alerta de oportunidade' : `${maxAlerts} alertas de oportunidade`);
  const extras = [
    plan.modules.diary ? 'Diário' : null,
    plan.modules.offline ? 'offline' : null,
    plan.modules.customMetrics ? 'indicadores' : null,
  ].filter((item): item is string => item !== null);
  if (extras.length === 1) items.push(capitalizeFeature(extras[0]));
  if (extras.length === 2) items.push(`${capitalizeFeature(extras[0])} e ${extras[1]}`);
  if (extras.length === 3) items.push('Diário, offline e indicadores');
  if (plan.modules.communityVote) items.push('Confirmar e contestar relatos');
  if (plan.modules.rankingEmphasis) items.push('Ênfase no ranking');
  return items;
}

function capitalizeFeature(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
