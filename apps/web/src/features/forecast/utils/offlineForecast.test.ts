import { afterEach, describe, expect, it } from 'vitest';
import { forecastFixture, forecastQualityFixture } from '@/features/forecast/fixtures/forecast';
import {
  clearOfflineForecast,
  offlineForecastStorageKey,
  readOfflineForecast,
  saveOfflineForecast,
  shouldUseOfflineForecast,
} from './offlineForecast';

describe('offlineForecast', () => {
  afterEach(() => {
    clearOfflineForecast();
    localStorage.removeItem('tanomar.offline-forecast.v1');
    localStorage.removeItem('tanomar.offline-forecast.v2');
  });

  it('grava e lê a previsão v3', () => {
    expect(saveOfflineForecast(forecastFixture)).toBe(true);
    expect(localStorage.getItem(offlineForecastStorageKey)).toContain('"forecast"');
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
    expect(localStorage.getItem(offlineForecastStorageKey)).toBeNull();
    expect(localStorage.getItem('tanomar.offline-forecast.v1')).toBeNull();
  });

  it('ignora a cópia v2 e não a migra', () => {
    localStorage.setItem('tanomar.offline-forecast.v2', JSON.stringify({ forecast: forecastFixture }));
    expect(readOfflineForecast()).toBeNull();
    expect(localStorage.getItem(offlineForecastStorageKey)).toBeNull();
    expect(localStorage.getItem('tanomar.offline-forecast.v2')).toBeNull();
  });

  it('descarta JSON v3 inválido ou corrompido', () => {
    localStorage.setItem(offlineForecastStorageKey, '{corrompido');
    expect(readOfflineForecast()).toBeNull();
    expect(localStorage.getItem(offlineForecastStorageKey)).toBeNull();
    localStorage.setItem(offlineForecastStorageKey, JSON.stringify({ forecast: { days: [] } }));
    expect(readOfflineForecast()).toBeNull();
    expect(localStorage.getItem(offlineForecastStorageKey)).toBeNull();
  });

  it('rejeita v3 sem quality em item disponível', () => {
    const withoutQuality = {
      ...forecastFixture,
      days: forecastFixture.days.map((day) => ({
        ...day,
        ranking: day.ranking.map((item) => ({ ...item, quality: undefined })),
      })),
    };
    localStorage.setItem(
      offlineForecastStorageKey,
      JSON.stringify({ savedAt: '2026-09-07T08:00:00Z', forecast: withoutQuality }),
    );
    expect(readOfflineForecast()).toBeNull();
    expect(localStorage.getItem(offlineForecastStorageKey)).toBeNull();
  });

  it('rejeita v3 com quality inválida', () => {
    const invalid = {
      ...forecastFixture,
      days: forecastFixture.days.map((day) => ({
        ...day,
        ranking: day.ranking.map((item) => ({
          ...item,
          quality: { ...forecastQualityFixture, confidence: { level: 'alta', reasons: [] } },
        })),
      })),
    };
    localStorage.setItem(
      offlineForecastStorageKey,
      JSON.stringify({ savedAt: '2026-09-07T08:00:00Z', forecast: invalid }),
    );
    expect(readOfflineForecast()).toBeNull();
    expect(localStorage.getItem(offlineForecastStorageKey)).toBeNull();
  });

  it('preserva score real zero e confiança High na v3', () => {
    const withZero = {
      ...forecastFixture,
      days: [
        {
          ...forecastFixture.days[0]!,
          ranking: [
            {
              ...forecastFixture.days[0]!.ranking[0]!,
              score: 0,
              classification: 'difficult' as const,
              quality: forecastQualityFixture,
            },
          ],
        },
      ],
    };
    expect(saveOfflineForecast(withZero)).toBe(true);
    expect(readOfflineForecast()?.days[0]?.ranking[0]).toMatchObject({
      score: 0,
      quality: { confidence: { level: 'high' } },
    });
    expect(localStorage.getItem(offlineForecastStorageKey)).not.toBeNull();
  });

  it('não usa savedAt como idade meteorológica', () => {
    localStorage.setItem(
      offlineForecastStorageKey,
      JSON.stringify({
        savedAt: '2026-09-10T08:00:00-03:00',
        forecast: forecastFixture,
      }),
    );
    const loaded = readOfflineForecast();
    expect(loaded?.days[0]?.ranking[0]?.quality?.dataUpdatedAt).toBe(
      forecastQualityFixture.dataUpdatedAt,
    );
    expect(JSON.parse(localStorage.getItem(offlineForecastStorageKey)!).savedAt).toBe(
      '2026-09-10T08:00:00-03:00',
    );
  });

  it('rejeita v3 com JSON quality nula em item disponível', () => {
    const withNullQuality = {
      ...forecastFixture,
      days: forecastFixture.days.map((day) => ({
        ...day,
        ranking: day.ranking.map((item) => ({ ...item, quality: null })),
      })),
    };
    localStorage.setItem(
      offlineForecastStorageKey,
      JSON.stringify({ savedAt: '2026-09-07T08:00:00Z', forecast: withNullQuality }),
    );
    expect(readOfflineForecast()).toBeNull();
    expect(localStorage.getItem(offlineForecastStorageKey)).toBeNull();
  });

  it('preserva a V3 válida durante falha de rede', () => {
    expect(saveOfflineForecast(forecastFixture)).toBe(true);
    const saved = readOfflineForecast();

    expect(
      shouldUseOfflineForecast({
        hasOfflineModule: true,
        saved,
        liveData: undefined,
        isError: true,
        isPending: false,
      }),
    ).toBe(true);
    expect(localStorage.getItem(offlineForecastStorageKey)).not.toBeNull();
  });
});
