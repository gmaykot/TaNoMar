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
    features: { showPartners },
    preferences: { region, windUnit, forecastNotifications },
  };
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
