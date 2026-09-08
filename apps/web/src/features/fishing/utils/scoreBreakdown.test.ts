import { describe, expect, it } from 'vitest';
import {
  formatScoreBreakdown,
  metricsHourCaption,
  rankingLeadReason,
  windOriginLabel,
} from './scoreBreakdown';

describe('scoreBreakdown', () => {
  it('explica o critério da média sem listar notas por hora', () => {
    expect(
      formatScoreBreakdown([
        { time: '17:00', score: 8.2 },
        { time: '05:00', score: 9.1 },
        { time: '06:00', score: 8.8 },
      ]),
    ).toBe('Nota pela média das 3 melhores horas.');
  });

  it('formata uma hora só', () => {
    expect(formatScoreBreakdown([{ time: '06:00', score: 8.2 }])).toBe(
      'Nota da melhor hora prevista.',
    );
  });

  it('explica por que o local ficou em primeiro', () => {
    expect(rankingLeadReason(3)).toBe(
      'Em primeiro pela média das 3 melhores horas previstas. A nota descreve as condições previstas, não a chance de captura.',
    );
  });

  it('nomeia a origem do vento e a hora das métricas', () => {
    expect(windOriginLabel('terra')).toBe('Vento de terra');
    expect(metricsHourCaption('05:00')).toBe('Condições às 05h');
  });
});
