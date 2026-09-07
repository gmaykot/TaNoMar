import { apiRequest } from '@/shared/api/client';
import { parseForecastAlert, parseForecastAlerts } from '../mappers/forecastAlertMapper';
import type { ForecastAlert } from '../types/forecastAlert';

export function getForecastAlerts() {
  return apiRequest('/me/alerts').then(parseForecastAlerts);
}

export function createForecastAlert(input: {
  spotId: string;
  minimumScore: number;
  leadHours: number;
}) {
  return apiRequest('/me/alerts', { method: 'POST', body: JSON.stringify(input) }).then(
    parseForecastAlert,
  );
}

export function updateForecastAlert(alert: ForecastAlert) {
  return apiRequest(`/me/alerts/${encodeURIComponent(alert.id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      spotId: alert.spotId,
      minimumScore: alert.minimumScore,
      leadHours: alert.leadHours,
      isActive: alert.isActive,
    }),
  }).then(parseForecastAlert);
}

export function deleteForecastAlert(id: string) {
  return apiRequest(`/me/alerts/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
