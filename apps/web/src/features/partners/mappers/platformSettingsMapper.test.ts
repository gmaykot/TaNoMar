import { describe, expect, it } from 'vitest';
import { ContractError } from '@/shared/api/errors';
import { parsePlatformSettings } from './platformSettingsMapper';

describe('parsePlatformSettings', () => {
  it('aceita o contrato admin', () => {
    expect(parsePlatformSettings({ showPartners: true })).toEqual({
      showPartners: true,
      showAppFocus: false,
      showLiveWebcams: true,
    });
    expect(parsePlatformSettings({ showPartners: false, showAppFocus: true })).toEqual({
      showPartners: false,
      showAppFocus: true,
      showLiveWebcams: true,
    });
  });

  it('aceita câmeras ao vivo desligadas', () => {
    expect(
      parsePlatformSettings({ showPartners: false, showLiveWebcams: false }),
    ).toEqual({
      showPartners: false,
      showAppFocus: false,
      showLiveWebcams: false,
    });
  });

  it('rejeita payload incompleto', () => {
    expect(() => parsePlatformSettings({})).toThrow(ContractError);
  });
});
