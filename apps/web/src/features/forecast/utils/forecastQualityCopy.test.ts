import { describe, expect, it } from 'vitest';
import { forecastQualityFixture } from '@/features/forecast/fixtures/forecast';
import {
  forecastCompletenessCopy,
  forecastConfidenceLabel,
  forecastConfidenceReasonMessages,
  formatForecastDataAge,
} from './forecastQualityCopy';

describe('forecastQualityCopy', () => {
  it('rotula os níveis de confiança', () => {
    expect(forecastConfidenceLabel('high')).toBe('Confiança alta');
    expect(forecastConfidenceLabel('medium')).toBe('Confiança média');
    expect(forecastConfidenceLabel('low')).toBe('Confiança baixa');
  });

  it('usa linguagem histórica no modo offline', () => {
    expect(forecastConfidenceLabel('high', 'offline')).toBe(
      'Confiança na última atualização: Alta',
    );
  });

  it('explica a cobertura sem percentual', () => {
    expect(
      forecastCompletenessCopy({
        ...forecastQualityFixture,
        dataCompleteness: { validHours: 4, expectedHours: 16, ratio: 0.25 },
      }),
    ).toBe('4 de 16 horários com dados completos');
  });

  it('traduz reasons para mensagens humanas', () => {
    expect(
      forecastConfidenceReasonMessages({
        ...forecastQualityFixture,
        confidence: {
          level: 'low',
          reasons: ['sparse_hour_coverage', 'stale_snapshot'],
        },
      }),
    ).toEqual([
      'Poucos horários possuem dados completos.',
      'A previsão está usando dados mais antigos que o normal.',
    ]);
  });

  it('calcula a idade a partir de dataUpdatedAt', () => {
    const now = new Date('2026-09-29T12:00:00.000Z');
    expect(formatForecastDataAge('2026-09-29T11:30:00.000Z', now)).toBe(
      'Dados atualizados há menos de 1 hora',
    );
    expect(formatForecastDataAge('2026-09-29T10:00:00.000Z', now)).toBe(
      'Dados atualizados há 2 horas',
    );
    expect(formatForecastDataAge('2026-09-28T12:00:00.000Z', now)).toBe(
      'Dados atualizados há 1 dia',
    );
    expect(formatForecastDataAge('2026-09-27T12:00:00.000Z', now)).toBe(
      'Dados atualizados há 2 dias',
    );
  });
});
