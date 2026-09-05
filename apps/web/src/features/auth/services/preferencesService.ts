import { apiRequest } from '@/shared/api/client';
import { parseAuthUser } from './authService';
import type { AuthUser } from '../types/auth';

export async function updatePreferences(
  input: AuthUser['preferences'],
): Promise<AuthUser['preferences']> {
  const payload = await apiRequest('/me/preferences', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  if (typeof payload === 'object' && payload !== null && 'region' in payload) {
    const record = payload as Record<string, unknown>;
    return {
      region: typeof record.region === 'string' ? record.region : input.region,
      windUnit: typeof record.windUnit === 'string' ? record.windUnit : input.windUnit,
      forecastNotifications:
        typeof record.forecastNotifications === 'boolean'
          ? record.forecastNotifications
          : input.forecastNotifications,
    };
  }
  return parseAuthUser(await apiRequest('/me')).preferences;
}
