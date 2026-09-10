import { afterEach, describe, expect, it } from 'vitest';
import { forecastFixture } from '@/features/forecast/fixtures/forecast';
import {
  clearOfflineForecast,
  readOfflineForecast,
  saveOfflineForecast,
  shouldUseOfflineForecast,
} from './offlineForecast';

describe('offlineForecast', () => {
  afterEach(() => {
    clearOfflineForecast();
  });

  it('grava e lê a previsão salva', () => {
    expect(saveOfflineForecast(forecastFixture)).toBe(true);
    expect(readOfflineForecast()).toEqual(forecastFixture);
  });

  it('usa a cópia salva quando a query ainda não respondeu', () => {
    expect(
      shouldUseOfflineForecast({
        hasOfflineModule: true,
        saved: forecastFixture,
        liveData: undefined,
        isError: false,
        isPending: true,
      }),
    ).toBe(true);
  });

  it('não usa a cópia salva quando a API já devolveu dados', () => {
    expect(
      shouldUseOfflineForecast({
        hasOfflineModule: true,
        saved: forecastFixture,
        liveData: forecastFixture,
        isError: false,
        isPending: false,
      }),
    ).toBe(false);
  });

  it('não usa a cópia salva sem o módulo offline', () => {
    expect(
      shouldUseOfflineForecast({
        hasOfflineModule: false,
        saved: forecastFixture,
        liveData: undefined,
        isError: true,
        isPending: false,
      }),
    ).toBe(false);
  });
});
