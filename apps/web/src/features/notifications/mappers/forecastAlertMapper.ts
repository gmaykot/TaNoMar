import { ContractError } from '@/shared/api/errors';
import type { ForecastAlert } from '../types/forecastAlert';

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) throw new ContractError('Alerta inválido.');
  return value as Record<string, unknown>;
}

function parseAlert(value: unknown): ForecastAlert {
  const item = record(value);
  const id = item.id;
  const spotId = item.spotId;
  const spotName = item.spotName;
  const minimumScore = item.minimumScore;
  const leadHours = item.leadHours;
  const isActive = item.isActive;
  if (
    typeof id !== 'string' ||
    typeof spotId !== 'string' ||
    typeof spotName !== 'string' ||
    typeof minimumScore !== 'number' ||
    typeof leadHours !== 'number' ||
    typeof isActive !== 'boolean'
  )
    throw new ContractError('Alerta incompleto.');
  return {
    id,
    spotId,
    spotName,
    minimumScore,
    leadHours,
    isActive,
    lastNotifiedDate: typeof item.lastNotifiedDate === 'string' ? item.lastNotifiedDate : null,
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : '',
    updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : '',
  };
}

export function parseForecastAlerts(value: unknown): ForecastAlert[] {
  if (!Array.isArray(value)) throw new ContractError('Lista de alertas inválida.');
  return value.map(parseAlert);
}

export function parseForecastAlert(value: unknown) {
  return parseAlert(value);
}
