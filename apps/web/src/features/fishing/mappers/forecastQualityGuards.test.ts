import { describe, expect, it } from 'vitest';
import { ContractError } from '@/shared/api/errors';
import { parseForecastQuality, parseRankingForecast } from './wireGuards';

const validQuality = {
  dataCompleteness: { validHours: 16, expectedHours: 16, ratio: 1 },
  confidence: { level: 'high', reasons: [] },
  dataUpdatedAt: '2026-09-27T12:00:00+00:00',
  evaluatedAt: '2026-09-27T13:00:00+00:00',
};

describe('parseForecastQuality', () => {
  it('aceita quality High válida', () => {
    expect(parseForecastQuality(validQuality)).toEqual(validQuality);
  });

  it('aceita quality Medium válida', () => {
    const quality = {
      ...validQuality,
      dataCompleteness: { validHours: 10, expectedHours: 16, ratio: 0.625 },
      confidence: { level: 'medium', reasons: ['limited_hour_coverage'] },
    };
    expect(parseForecastQuality(quality)).toEqual(quality);
  });

  it('aceita quality Low válida', () => {
    const quality = {
      ...validQuality,
      dataCompleteness: { validHours: 4, expectedHours: 16, ratio: 0.25 },
      confidence: { level: 'low', reasons: ['sparse_hour_coverage', 'stale_snapshot'] },
    };
    expect(parseForecastQuality(quality)).toEqual(quality);
  });

  it('aceita ratio 0', () => {
    const quality = {
      ...validQuality,
      dataCompleteness: { validHours: 0, expectedHours: 16, ratio: 0 },
    };
    expect(parseForecastQuality(quality).dataCompleteness.ratio).toBe(0);
  });

  it('aceita ratio 1', () => {
    expect(parseForecastQuality(validQuality).dataCompleteness.ratio).toBe(1);
  });

  it('rejeita ratio menor que 0', () => {
    expect(() =>
      parseForecastQuality({
        ...validQuality,
        dataCompleteness: { validHours: 0, expectedHours: 16, ratio: -0.1 },
      }),
    ).toThrow(ContractError);
  });

  it('rejeita ratio maior que 1', () => {
    expect(() =>
      parseForecastQuality({
        ...validQuality,
        dataCompleteness: { validHours: 16, expectedHours: 16, ratio: 1.01 },
      }),
    ).toThrow(ContractError);
  });

  it('rejeita validHours maior que expectedHours', () => {
    expect(() =>
      parseForecastQuality({
        ...validQuality,
        dataCompleteness: { validHours: 17, expectedHours: 16, ratio: 1 },
      }),
    ).toThrow(ContractError);
  });

  it('rejeita expectedHours 0', () => {
    expect(() =>
      parseForecastQuality({
        ...validQuality,
        dataCompleteness: { validHours: 0, expectedHours: 0, ratio: 0 },
      }),
    ).toThrow(ContractError);
  });

  it('rejeita confidence desconhecida', () => {
    expect(() =>
      parseForecastQuality({
        ...validQuality,
        confidence: { level: 'excelente', reasons: [] },
      }),
    ).toThrow(ContractError);
  });

  it('rejeita reason desconhecida', () => {
    expect(() =>
      parseForecastQuality({
        ...validQuality,
        confidence: { level: 'low', reasons: ['missing_tide'] },
      }),
    ).toThrow(ContractError);
  });

  it('rejeita timestamp inválido', () => {
    expect(() => parseForecastQuality({ ...validQuality, dataUpdatedAt: 'ontem' })).toThrow(
      ContractError,
    );
    expect(() => parseForecastQuality({ ...validQuality, evaluatedAt: 123 })).toThrow(ContractError);
  });

  it('rejeita quality nula sem inventar default', () => {
    expect(() => parseForecastQuality(null)).toThrow(ContractError);
  });

  it('preserva 3/16 = 0.1875', () => {
    const quality = parseForecastQuality({
      ...validQuality,
      dataCompleteness: { validHours: 3, expectedHours: 16, ratio: 0.1875 },
      confidence: { level: 'low', reasons: ['sparse_hour_coverage'] },
    });
    expect(quality.dataCompleteness).toEqual({
      validHours: 3,
      expectedHours: 16,
      ratio: 0.1875,
    });
  });

  it('rejeita item disponível sem quality', () => {
    expect(() =>
      parseRankingForecast({
        generatedAt: '2026-09-05T11:00:00Z',
        availableFrom: '2026-09-05',
        availableTo: '2026-09-07',
        days: [
          {
            date: '2026-09-05',
            unavailableSpotIds: [],
            ranking: [
              {
                spotId: 'campeche',
                spotName: 'Campeche',
                score: { state: 'available', value: 8 },
                classification: { state: 'available', value: 'Muito bom' },
                bestHours: { state: 'available', value: ['06:00'] },
                wind: { state: 'available', value: '8 km/h' },
                gusts: { state: 'available', value: '10 km/h' },
                waves: { state: 'available', value: '0,80 m' },
                wavePeriod: { state: 'available', value: '8 s' },
                swell: { state: 'available', value: '0,50 m' },
                rain: { state: 'available', value: '0 mm (0%)' },
                airTemperature: { state: 'available', value: '22 °C' },
                waterTemperature: { state: 'available', value: '20 °C' },
              },
            ],
          },
        ],
      }),
    ).toThrow(ContractError);
  });
});
