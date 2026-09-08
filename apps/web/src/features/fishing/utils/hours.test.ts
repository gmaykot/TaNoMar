import { describe, expect, it } from 'vitest';
import { formatHourLabel, formatHourList, splitRecommendationHours } from './hours';

describe('hours', () => {
  it('compacta horários em português', () => {
    expect(formatHourLabel('07:00')).toBe('07h');
    expect(formatHourLabel('05:30')).toBe('05h30');
    expect(formatHourList(['05:00', '08:00'])).toBe('05h e 08h');
    expect(formatHourList(['05:30', '07:00', '17:00'])).toBe('05h30, 07h e 17h');
  });

  it('separa o melhor horário das alternativas', () => {
    expect(splitRecommendationHours(['05:00', '07:00', '08:00'], '07:00')).toEqual({
      best: '07:00',
      alternatives: ['05:00', '08:00'],
    });
  });
});
