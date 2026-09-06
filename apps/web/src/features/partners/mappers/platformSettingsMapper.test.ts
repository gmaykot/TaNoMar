import { describe, expect, it } from 'vitest';
import { ContractError } from '@/shared/api/errors';
import { parsePlatformSettings } from './platformSettingsMapper';

describe('parsePlatformSettings', () => {
  it('aceita o contrato admin', () => {
    expect(parsePlatformSettings({ showPartners: true })).toEqual({ showPartners: true });
  });

  it('rejeita payload incompleto', () => {
    expect(() => parsePlatformSettings({})).toThrow(ContractError);
  });
});
