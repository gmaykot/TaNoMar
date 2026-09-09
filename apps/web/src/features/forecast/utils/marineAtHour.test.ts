import { describe, expect, it } from 'vitest';
import type { MarineSeries } from '@/features/fishing/types/fishing';
import { formatMarineCurrent, marinePointAtHour, marineSeriesAtHour } from './marineAtHour';

const series: MarineSeries = {
  key: 'waves',
  label: 'Ondas',
  current: '0.70 m',
  range: '0.40–1.10 m',
  points: [
    { time: '05:00', value: 0.4 },
    { time: '07:00', value: 1.1 },
  ],
};

describe('marineAtHour', () => {
  it('encontra o ponto pela hora e pelo prefixo', () => {
    expect(marinePointAtHour(series.points, '07:00')?.value).toBe(1.1);
    expect(marinePointAtHour(series.points, '05:30')?.value).toBe(0.4);
  });

  it('formata o current com a unidade e as casas da série', () => {
    expect(formatMarineCurrent('0.70 m', 1.1)).toBe('1,10 m');
    expect(formatMarineCurrent('1018 hPa', 1014)).toBe('1014 hPa');
  });

  it('mantém o current da melhor hora e troca nas demais', () => {
    expect(marineSeriesAtHour(series, '05:30', '05:30').current).toBe('0.70 m');
    expect(marineSeriesAtHour(series, '07:00', '05:30').current).toBe('1,10 m');
  });
});
