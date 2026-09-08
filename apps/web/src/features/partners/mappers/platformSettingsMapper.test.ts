import { describe, expect, it } from 'vitest';
import { ContractError } from '@/shared/api/errors';
import { parsePlatformSettings } from './platformSettingsMapper';

describe('parsePlatformSettings', () => {
  it('aceita o contrato admin', () => {
    expect(parsePlatformSettings({ showPartners: true })).toEqual({
      showPartners: true,
      showAppFocus: false,
    });
    expect(parsePlatformSettings({ showPartners: false, showAppFocus: true })).toEqual({
      showPartners: false,
      showAppFocus: true,
    });
  });

  it('rejeita payload incompleto', () => {
    expect(() => parsePlatformSettings({})).toThrow(ContractError);
  });
});
