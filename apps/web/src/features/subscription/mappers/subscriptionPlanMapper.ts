import { ContractError } from '@/shared/api/errors';
import type { PlanModules } from '@/features/auth/types/auth';
import type { PlanCatalog, PlanEntitlements } from '../subscriptionPlans';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function readInteger(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

function readBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : null;
}

function parseEntitlements(value: unknown): PlanEntitlements {
  if (!isRecord(value)) throw new ContractError('Cotas do plano inválidas.');
  const maxForecastDays = readInteger(value.maxForecastDays);
  const maxFavorites = readInteger(value.maxFavorites);
  const maxPersonalSpots = readInteger(value.maxPersonalSpots);
  const maxAlerts = readInteger(value.maxAlerts);
  if (
    maxForecastDays === null ||
    maxFavorites === null ||
    maxPersonalSpots === null ||
    maxAlerts === null
  ) {
    throw new ContractError('Cotas do plano incompletas.');
  }
  return { maxForecastDays, maxFavorites, maxPersonalSpots, maxAlerts };
}

function parseModules(value: unknown): PlanModules {
  if (!isRecord(value)) throw new ContractError('Módulos do plano inválidos.');
  const marine = readBoolean(value.marine);
  const diary = readBoolean(value.diary);
  const offline = readBoolean(value.offline);
  const customMetrics = readBoolean(value.customMetrics);
  const communityVote = readBoolean(value.communityVote);
  const rankingEmphasis = readBoolean(value.rankingEmphasis);
  if (
    marine === null ||
    diary === null ||
    offline === null ||
    customMetrics === null ||
    communityVote === null ||
    rankingEmphasis === null
  ) {
    throw new ContractError('Módulos do plano incompletos.');
  }
  return { marine, diary, offline, customMetrics, communityVote, rankingEmphasis };
}

export function parsePlanCatalog(value: unknown): PlanCatalog {
  if (!isRecord(value)) throw new ContractError('Plano inválido.');
  const code = readString(value.code);
  const name = readString(value.name);
  const tagline = readString(value.tagline);
  const monthlyPriceCents = readInteger(value.monthlyPriceCents);
  const featured = readBoolean(value.featured);
  const sortOrder = readInteger(value.sortOrder);
  if (
    !code ||
    !name ||
    tagline === null ||
    monthlyPriceCents === null ||
    featured === null ||
    sortOrder === null
  ) {
    throw new ContractError('Plano incompleto.');
  }
  return {
    code,
    name,
    tagline,
    monthlyPriceCents,
    featured,
    sortOrder,
    entitlements: parseEntitlements(value.entitlements),
    modules: parseModules(value.modules),
  };
}

export function parsePlanCatalogList(value: unknown) {
  if (!Array.isArray(value)) throw new ContractError('Lista de planos inválida.');
  return value.map(parsePlanCatalog);
}
