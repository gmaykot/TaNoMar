import { describe, expect, it } from 'vitest';
import {
  pathWithForecastDate,
  readForecastDate,
  resolveForecastDate,
  writeForecastDate,
} from './forecastDate';

describe('forecastDate', () => {
  it('lê e grava o dia da previsão na query', () => {
    const params = new URLSearchParams('enfase=vento');
    expect(readForecastDate(params)).toBe('');

    writeForecastDate(params, '2026-09-06');
    expect(params.get('data')).toBe('2026-09-06');
    expect(params.get('enfase')).toBe('vento');
    expect(readForecastDate(params)).toBe('2026-09-06');

    writeForecastDate(params, '');
    expect(params.has('data')).toBe(false);
    expect(params.get('enfase')).toBe('vento');
  });

  it('acrescenta o dia ao caminho sem outros filtros', () => {
    expect(pathWithForecastDate('/ranking', '')).toBe('/ranking');
    expect(pathWithForecastDate('/ranking', '2026-09-06')).toBe('/ranking?data=2026-09-06');
    expect(pathWithForecastDate('/app', '2026-09-06')).toBe('/app?data=2026-09-06');
  });

  it('usa o dia pedido quando ele existe na previsão', () => {
    const days = ['2026-09-05', '2026-09-06'];
    expect(resolveForecastDate('2026-09-06', days)).toBe('2026-09-06');
    expect(resolveForecastDate('2026-09-09', days)).toBe('2026-09-05');
    expect(resolveForecastDate('', days)).toBe('2026-09-05');
    expect(resolveForecastDate('2026-09-06', [])).toBe('');
  });
});
