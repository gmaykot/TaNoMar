import { describe, expect, it } from 'vitest';
import { forecastAtHour } from './forecastAtHour';
import type { ForecastRankingItem } from '../types/fishing';

const forecast: ForecastRankingItem = {
  locationId: 'campeche',
  locationName: 'Campeche',
  score: 8,
  classification: 'very-good',
  bestWindow: '05:00, 07:00 e 17:00',
  bestHours: ['05:00', '07:00', '17:00'],
  hourWindows: [
    {
      time: '05:00',
      score: 9.1,
      metrics: [{ key: 'wind', label: 'Vento', value: '8 km/h Leste' }],
      pressure: { key: 'pressure', label: 'Pressão', value: '1018 hPa' },
    },
    {
      time: '07:00',
      score: 8.9,
      classification: 'very-good',
      windOrigin: 'mar',
      highlights: ['Vento do mar'],
      metrics: [{ key: 'wind', label: 'Vento', value: '14 km/h Nordeste' }],
      pressure: { key: 'pressure', label: 'Pressão', value: '1016 hPa' },
    },
  ],
  scoreBreakdown: 'Nota pela média das 3 melhores horas.',
  metricsHour: '05:00',
  windOrigin: 'terra',
  highlights: ['Vento de terra'],
  metrics: [{ key: 'wind', label: 'Vento', value: '8 km/h Leste' }],
  pressure: { key: 'pressure', label: 'Pressão', value: '1018 hPa' },
  isOwner: false,
  visibility: 'official',
};

describe('forecastAtHour', () => {
  it('devolve o forecast original sem hora', () => {
    expect(forecastAtHour(forecast, null)).toBe(forecast);
  });

  it('troca métricas, nota e classificação da janela selecionada', () => {
    expect(forecastAtHour(forecast, '07:00')).toMatchObject({
      metricsHour: '07:00',
      windOrigin: 'mar',
      highlights: ['Vento do mar'],
      metrics: [{ key: 'wind', value: '14 km/h Nordeste' }],
      pressure: { value: '1016 hPa' },
      score: 8.9,
      classification: 'very-good',
    });
  });

  it('só atualiza a hora quando a janela não tem métricas', () => {
    const withoutMetrics = {
      ...forecast,
      hourWindows: [{ time: '17:00', score: 8.7 }],
    };
    expect(forecastAtHour(withoutMetrics, '17:00')).toMatchObject({
      metricsHour: '17:00',
      metrics: forecast.metrics,
      score: 8.7,
    });
  });
});
