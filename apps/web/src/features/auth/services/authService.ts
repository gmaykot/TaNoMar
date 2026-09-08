import { isAppFocus, type AppFocus } from '@/features/auth/appFocus';
import { parseBillingSubscription } from '@/features/billing/mappers/billingMapper';
import { fishingMetricKeys, type FishingMetricKey } from '@/features/fishing/types/fishing';
import { apiRequest, refreshAccessTokenOnce } from '@/shared/api/client';
import { ContractError } from '@/shared/api/errors';
import { setAccessToken } from '@/shared/api/session';
import type { AuthUser } from '../types/auth';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : null;
}

export function parseVisibleMetrics(value: unknown): FishingMetricKey[] {
  if (value === undefined) return [...fishingMetricKeys];
  if (
    !Array.isArray(value) ||
    value.some(
      (item) => typeof item !== 'string' || !fishingMetricKeys.includes(item as FishingMetricKey),
    )
  ) {
    throw new ContractError('Preferência de indicadores inválida.');
  }
  return [...new Set(value as FishingMetricKey[])];
}

export function parseAppFocus(value: unknown): AppFocus | null {
  if (value === undefined || value === null || value === '') return null;
  if (isAppFocus(value)) return value;
  throw new ContractError('Foco do aplicativo inválido.');
}

function parseAccessToken(payload: unknown) {
  const token = isRecord(payload) ? readString(payload.accessToken) : null;
  if (!token) throw new ContractError('A API não devolveu um access token.');
  return token;
}

export function parseAuthUser(payload: unknown): AuthUser {
  if (!isRecord(payload)) throw new ContractError('Usuário inválido.');
  const plan = isRecord(payload.plan) ? payload.plan : null;
  const entitlements = isRecord(payload.entitlements) ? payload.entitlements : null;
  const id = readString(payload.id);
  const name = readString(payload.name);
  const email = readString(payload.email);
  const role = readString(payload.role);
  const planCode = plan ? readString(plan.code) : null;
  const planName = plan ? readString(plan.name) : null;
  const maxForecastDays = entitlements ? readNumber(entitlements.maxForecastDays) : null;
  const maxFavorites = entitlements ? readNumber(entitlements.maxFavorites) : null;
  const maxPersonalSpots = entitlements ? readNumber(entitlements.maxPersonalSpots) : null;
  const maxAlerts = entitlements ? readNumber(entitlements.maxAlerts) : null;
  const preferencesRecord = isRecord(payload.preferences) ? payload.preferences : null;
  const region = preferencesRecord ? readString(preferencesRecord.region) : 'Florianópolis';
  const windUnit = preferencesRecord ? readString(preferencesRecord.windUnit) : 'kmh';
  const forecastNotifications = preferencesRecord
    ? typeof preferencesRecord.forecastNotifications === 'boolean'
      ? preferencesRecord.forecastNotifications
      : true
    : true;
  const visibleMetrics = parseVisibleMetrics(preferencesRecord?.visibleMetrics);
  const focus = parseAppFocus(preferencesRecord?.focus);
  const featuresRecord = isRecord(payload.features) ? payload.features : null;
  const showPartners = featuresRecord?.showPartners === true;
  if (
    !id ||
    !name ||
    !email ||
    !role ||
    !planCode ||
    !planName ||
    maxForecastDays === null ||
    maxFavorites === null ||
    maxPersonalSpots === null ||
    maxAlerts === null ||
    !region ||
    !windUnit
  ) {
    throw new ContractError('Usuário incompleto.');
  }

  return {
    id,
    name,
    email,
    pictureUrl: readString(payload.pictureUrl),
    role,
    plan: { code: planCode, name: planName },
    entitlements: { maxForecastDays, maxFavorites, maxPersonalSpots, maxAlerts },
    modules: parsePlanModules(payload.modules),
    features: { showPartners },
    preferences: { region, windUnit, forecastNotifications, focus, visibleMetrics },
    billing: parseOptionalBilling(payload.billing),
  };
}

function parseOptionalBilling(value: unknown): AuthUser['billing'] {
  if (value === undefined || value === null) return undefined;
  return parseBillingSubscription(value);
}

function parsePlanModules(value: unknown): AuthUser['modules'] {
  if (value === undefined || value === null) return undefined;
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

export async function loginWithGoogle(credential: string) {
  const token = parseAccessToken(
    await apiRequest('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
      skipAuth: true,
      skipRefresh: true,
    }),
  );
  setAccessToken(token);
  return token;
}

export async function refreshSession() {
  const token = await refreshAccessTokenOnce();
  if (!token) setAccessToken(null);
  return token;
}

export async function logoutSession() {
  try {
    await apiRequest('/auth/logout', {
      method: 'POST',
      skipAuth: true,
      skipRefresh: true,
    });
  } finally {
    setAccessToken(null);
  }
}

export async function getCurrentUser() {
  return parseAuthUser(await apiRequest('/me'));
}
