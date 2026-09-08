import { describe, expect, it } from 'vitest';
import { formatScoreBreakdown, metricsHourCaption, windOriginLabel } from './scoreBreakdown';

describe('scoreBreakdown', () => {
  it('formata a média das horas em ordem cronológica', () => {
    expect(
      formatScoreBreakdown([
        { time: '17:00', score: 8.2 },
        { time: '05:00', score: 9.1 },
        { time: '06:00', score: 8.8 },
      ]),
    ).toBe('Média das 3 melhores horas · 05:00 9,1 · 06:00 8,8 · 17:00 8,2');
  });

  it('formata uma hora só', () => {
    expect(formatScoreBreakdown([{ time: '06:00', score: 8.2 }])).toBe('Nota da hora · 06:00 8,2');
  });

  it('nomeia a origem do vento e a hora das métricas', () => {
    expect(windOriginLabel('terra')).toBe('Vento de terra');
    expect(metricsHourCaption('05:00')).toBe('Condições às 05:00');
  });
});
