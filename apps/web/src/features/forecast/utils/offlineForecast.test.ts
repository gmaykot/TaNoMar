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
    localStorage.removeItem('tanomar.offline-forecast.v1');
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

  it('ignora a cópia legada v1 e não a migra', () => {
    localStorage.setItem('tanomar.offline-forecast.v1', JSON.stringify({ forecast: forecastFixture }));
    expect(readOfflineForecast()).toBeNull();
    expect(localStorage.getItem('tanomar.offline-forecast.v2')).toBeNull();
  });

  it('descarta JSON v2 inválido ou corrompido', () => {
    localStorage.setItem('tanomar.offline-forecast.v2', '{corrompido');
    expect(readOfflineForecast()).toBeNull();
    localStorage.setItem('tanomar.offline-forecast.v2', JSON.stringify({ forecast: { days: [] } }));
    expect(readOfflineForecast()).toBeNull();
  });
});
