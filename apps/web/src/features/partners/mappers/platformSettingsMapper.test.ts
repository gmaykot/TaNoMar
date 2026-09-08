import { describe, expect, it } from 'vitest';
import { ContractError } from '@/shared/api/errors';
import { parsePlatformSettings } from './platformSettingsMapper';

describe('parsePlatformSettings', () => {
  it('aceita o contrato admin', () => {
    expect(parsePlatformSettings({ showPartners: true })).toEqual({
      showPartners: true,
      showLiveWebcams: true,
    });
  });

  it('aceita câmeras ao vivo desligadas', () => {
    expect(parsePlatformSettings({ showPartners: false, showLiveWebcams: false })).toEqual({
      showPartners: false,
      showLiveWebcams: false,
    });
  });

  it('rejeita payload incompleto', () => {
    expect(() => parsePlatformSettings({})).toThrow(ContractError);
  });
});
