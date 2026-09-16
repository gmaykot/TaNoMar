import { describe, expect, it } from 'vitest';
import type {
  ForecastRankingItem,
  MarineDetails,
  MarineSeries,
} from '@/features/fishing/types/fishing';
import { forecastSeriesOptions } from './forecastSeries';

const forecast: ForecastRankingItem = {
  locationId: 'campeche',
  locationName: 'Campeche',
  score: 8,
  classification: 'very-good',
  bestWindow: '05:00 e 17:00',
  bestHours: ['05:00', '17:00'],
  hourWindows: [
    {
      time: '05:00',
      score: 9.1,
      metrics: [
        { key: 'wind', label: 'Vento', value: '7 km/h Leste' },
        { key: 'rain', label: 'Chuva', value: '0,1 mm (8%)' },
        { key: 'waves', label: 'Ondas', value: '0,4 m' },
        { key: 'air-temperature', label: 'Temperatura', value: '21 °C' },
      ],
    },
    {
      time: '17:00',
      score: 8.2,
      metrics: [
        { key: 'wind', label: 'Vento', value: '18 km/h Sul' },
        { key: 'rain', label: 'Chuva', value: '1,4 mm (45%)' },
        { key: 'waves', label: 'Ondas', value: '1,1 m' },
        { key: 'air-temperature', label: 'Temperatura', value: '24 °C' },
      ],
    },
  ],
  scoreBreakdown: 'Nota pela média das 3 melhores horas.',
  metricsHour: '05:00',
  windOrigin: 'terra',
  metrics: [{ key: 'wind', label: 'Vento', value: '7 km/h Leste' }],
  isOwner: false,
  isFavorite: false,
  visibility: 'official',
};

function series(
  key: MarineSeries['key'],
  label: string,
  points: MarineSeries['points'],
): MarineSeries {
  return { key, label, current: 'n/d', range: 'n/d', points };
}

const marine: MarineDetails = {
  spotId: 'campeche',
  date: '2026-09-05',
  series: [
    series('waves', 'Ondas', [
      { time: '05:00', value: 0.4 },
      { time: '08:00', value: 0.7 },
      { time: '12:00', value: 0.9 },
      { time: '17:00', value: 1.4 },
    ]),
    series('water-temperature', 'Água', [
      { time: '05:00', value: 19 },
      { time: '12:00', value: 21 },
      { time: '17:00', value: 20 },
    ]),
    series('wind', 'Vento', [
      { time: '05:00', value: 4 },
      { time: '08:00', value: 9 },
      { time: '12:00', value: 13 },
      { time: '17:00', value: 16 },
    ]),
    series('rain', 'Chuva', [
      { time: '05:00', value: 5 },
      { time: '08:00', value: 12 },
      { time: '12:00', value: 22 },
      { time: '17:00', value: 28 },
    ]),
  ],
  tide: {
    current: '0.8 m',
    phase: 'Enchente',
    nextExtreme: 'Preamar 14:20',
    extremes: [],
    points: [],
  },
};

describe('forecastSeriesOptions', () => {
  it('usa a série horária do dia para vento e chuva, não só os melhores horários', () => {
    const options = forecastSeriesOptions(forecast, marine);
    expect(options.find((item) => item.key === 'wind')).toMatchObject({
      source: 'hourly',
      points: [
        { time: '05:00', value: 4 },
        { time: '08:00', value: 9 },
        { time: '12:00', value: 13 },
        { time: '17:00', value: 16 },
      ],
    });
    expect(options.find((item) => item.key === 'rain')).toMatchObject({
      source: 'hourly',
      points: [
        { time: '05:00', value: 5 },
        { time: '08:00', value: 12 },
        { time: '12:00', value: 22 },
        { time: '17:00', value: 28 },
      ],
    });
  });

  it('converte o vento da série do dia quando a unidade é nó', () => {
    const wind = forecastSeriesOptions(forecast, marine, 'kt').find((item) => item.key === 'wind');
    expect(wind?.unit).toBe('nós');
    expect(wind?.points[0]).toEqual({ time: '05:00', value: 2.2 });
  });

  it('cai para todas as horas selecionáveis quando o detalhe do mar não tem a série', () => {
    const custom: ForecastRankingItem = {
      ...forecast,
      selectableHourWindows: [
        {
          time: '06:00',
          score: 8,
          metrics: [{ key: 'wind', label: 'Vento', value: '5 km/h' }],
        },
        {
          time: '10:00',
          score: 7,
          metrics: [{ key: 'wind', label: 'Vento', value: '11 km/h' }],
        },
        {
          time: '15:00',
          score: 6,
          metrics: [{ key: 'wind', label: 'Vento', value: '14 km/h' }],
        },
      ],
    };
    const wind = forecastSeriesOptions(custom, undefined).find((item) => item.key === 'wind');
    expect(wind).toMatchObject({
      source: 'hour-windows',
      points: [
        { time: '06:00', value: 5 },
        { time: '10:00', value: 11 },
        { time: '15:00', value: 14 },
      ],
    });
  });
});
