import { describe, expect, it } from 'vitest';
import type { MarineTide } from '@/features/fishing/types/fishing';
import { tideAtHour, tideChartPoints } from './tideAtHour';

const tide: MarineTide = {
  current: '0,85 m',
  phase: 'Enchente',
  nextExtreme: 'Preamar 14:20 · 1,20 m',
  extremes: [
    { type: 'baixa-mar', time: '03:10', height: '0,20 m' },
    { type: 'preamar', time: '14:20', height: '1,20 m' },
  ],
  points: [
    { time: '00:00', value: 0.2 },
    { time: '06:00', value: 0.8 },
    { time: '12:00', value: 1.1 },
    { time: '18:00', value: 0.4 },
  ],
};

describe('tideAtHour', () => {
  it('usa somente o horário selecionado para nível, fase e próxima virada', () => {
    expect(tideAtHour(tide, '06:00')).toEqual({
      level: 0.8,
      phase: 'Enchente',
      nextExtreme: { type: 'preamar', time: '14:20', height: '1,20 m' },
    });
  });

  it('não inventa nível quando não há ponto no horário', () => {
    expect(tideAtHour(tide, '05:30')).toEqual({
      level: null,
      phase: 'Enchente',
      nextExtreme: { type: 'preamar', time: '14:20', height: '1,20 m' },
    });
  });

  it('considera próxima somente a virada posterior à seleção', () => {
    expect(tideAtHour(tide, '15:00').nextExtreme).toBeNull();
  });

  it('marca como estimada a curva formada apenas pelos extremos', () => {
    const result = tideChartPoints({ ...tide, points: [] });
    expect(result.estimated).toBe(true);
    expect(result.points).toEqual([
      { time: '03:10', value: 0.2 },
      { time: '14:20', value: 1.2 },
    ]);
  });
});
