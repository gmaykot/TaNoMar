import { ContractError } from '@/shared/api/errors';
import type { PlatformSettings } from '../types/platformSettings';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parsePlatformSettings(value: unknown): PlatformSettings {
  if (!isRecord(value) || typeof value.showPartners !== 'boolean') {
    throw new ContractError('Configuração da plataforma inválida.');
  }
  return { showPartners: value.showPartners };
}
