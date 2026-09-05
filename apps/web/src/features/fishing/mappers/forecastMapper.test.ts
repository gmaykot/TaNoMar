import { describe, expect, it } from 'vitest';
import { mapForecast, mapForecastItem, mapLocation, mapMarineDetails } from './forecastMapper';
import { parseMarineDetails, parseRankingForecast, parseSpot } from './wireGuards';

const now = new Date('2026-09-05T12:00:00-03:00');

function available<T>(value: T) {
  return { state: 'available' as const, value };
}

function locked() {
  return { state: 'locked' as const, reason: 'plan_required', requiredPlan: 'Premium' };
}

const rankingWire = {
  generatedAt: '2026-09-05T11:00:00Z',
  availableFrom: '2026-09-05',
  availableTo: '2026-09-07',
  days: [
    {
      date: '2026-09-05',
      unavailableSpotIds: [],
      ranking: [
        {
          spotId: 'pantano_do_sul',
          spotName: 'Pântano do Sul',
          score: available(9.1),
          classification: available('Excelente'),
          bestHours: available(['05:00', '06:00', '17:00']),
          wind: available('8 km/h Leste'),
          gusts: available('12 km/h'),
          waves: locked(),
          wavePeriod: locked(),
          swell: locked(),
          rain: available('0.0 mm (10%)'),
          airTemperature: available('22.0 °C'),
          waterTemperature: locked(),
        },
      ],
    },
    {
      date: '2026-09-06',
      unavailableSpotIds: [],
      ranking: [
        {
          spotId: 'armacao',
          spotName: 'Armação',
          score: available(8.2),
          classification: available('Muito bom'),
          bestHours: available(['06:00']),
          wind: available('10 km/h Nordeste'),
          gusts: available('14 km/h'),
          waves: available('0.70 m'),
          wavePeriod: available('7.0 s'),
          swell: available('0.50 m'),
          rain: available('0.2 mm (20%)'),
          airTemperature: available('21.0 °C'),
          waterTemperature: available('20.0 °C'),
        },
      ],
    },
    {
      date: '2026-09-07',
      unavailableSpotIds: [],
      ranking: [
        {
          spotId: 'campeche',
          spotName: 'Campeche',
          score: available(6.4),
          classification: available('Regular'),
          bestHours: available(['07:00', '16:00']),
          wind: available('18 km/h Sul'),
          gusts: available('24 km/h'),
          waves: available('1.20 m'),
          wavePeriod: available('8.0 s'),
          swell: available('0.80 m'),
          rain: available('1.0 mm (40%)'),
          airTemperature: available('20.0 °C'),
          waterTemperature: available('19.0 °C'),
        },
      ],
    },
  ],
};

describe('forecastMapper', () => {
  it('converte o contrato da API para os tipos da UI', () => {
    const forecast = mapForecast(parseRankingForecast(rankingWire), now);
    expect(forecast.days).toHaveLength(3);
    expect(forecast.days[0]).toMatchObject({ date: '2026-09-05', label: 'Hoje' });
    expect(forecast.days[1]).toMatchObject({ date: '2026-09-06', label: 'Amanhã' });
    expect(forecast.days[2]?.label).toBe('Segunda');
    expect(forecast.days[0]?.ranking[0]).toMatchObject({
      locationId: 'pantano_do_sul',
      locationName: 'Pântano do Sul',
      score: 9.1,
      classification: 'excellent',
      bestWindow: '05:00–17:00',
    });
  });

  it('marca métricas premium como locked', () => {
    const item = mapForecastItem(parseRankingForecast(rankingWire).days[0]!.ranking[0]!);
    const waves = item.metrics.find((metric) => metric.key === 'waves');
    expect(waves).toMatchObject({ value: 'Premium', locked: true, detail: 'Premium' });
  });

  it('mapeia o perfil do local', () => {
    const location = mapLocation(
      parseSpot({
        id: 'campeche',
        name: 'Campeche',
        slug: 'campeche',
        description: null,
        city: 'Florianópolis',
        state: 'SC',
        region: 'Ilha de Santa Catarina',
        type: 'praia',
        visibility: 'official',
        profile: 'praia_aberta',
        latitude: -27.65407,
        longitude: -48.46908,
        seaOrientationDegrees: 110,
        isFavorite: false,
        isInRanking: true,
        isApproved: true,
        isOwner: false,
      }),
    );
    expect(location).toMatchObject({
      id: 'campeche',
      profile: 'praia_aberta',
      latitude: -27.65407,
    });
  });

  it('converte o detalhe do mar e marca Premium', () => {
    const marine = mapMarineDetails(
      parseMarineDetails({
        spotId: 'campeche',
        date: '2026-09-05',
        waves: available({
          current: '0.70 m',
          range: '0.40–1.10 m',
          direction: 'Leste',
          points: [
            { time: '05:00', value: 0.4 },
            { time: '06:00', value: 0.7 },
          ],
        }),
        wavePeriod: available({
          current: '7.0 s',
          range: '6.0–8.0 s',
          points: [
            { time: '05:00', value: 6 },
            { time: '06:00', value: 7 },
          ],
        }),
        swell: available({
          current: '0.50 m',
          range: '0.30–0.60 m',
          detail: '8.0 s',
          points: [
            { time: '05:00', value: 0.3 },
            { time: '06:00', value: 0.5 },
          ],
        }),
        waterTemperature: locked(),
        atmosphericPressure: available({
          current: '1018 hPa',
          range: '1016–1020 hPa',
          detail: 'estável',
          points: [
            { time: '05:00', value: 1018 },
            { time: '06:00', value: 1018 },
          ],
        }),
        tide: { state: 'unavailable' },
      }),
    );
    expect(marine.series[0]).toMatchObject({
      label: 'Ondas',
      current: '0.70 m',
      direction: 'Leste',
    });
    expect(marine.series[3]).toMatchObject({ locked: true, current: 'Premium' });
    expect(marine.series[4]).toMatchObject({ label: 'Pressão', current: '1018 hPa', detail: 'estável' });
    expect(marine.tide.unavailable).toBe(true);
  });

  it('preserva a atribuição da tábua de maré', () => {
    const marine = mapMarineDetails(
      parseMarineDetails({
        spotId: 'campeche',
        date: '2026-09-05',
        waves: locked(),
        wavePeriod: locked(),
        swell: locked(),
        waterTemperature: locked(),
        atmosphericPressure: locked(),
        tide: available({
          current: '0.64 m',
          phase: 'Enchente',
          nextExtreme: 'Preamar 13:34 · 1.13 m',
          attribution: 'Tábua de Florianópolis. Fonte: Marinha (Tábua de Maré API).',
          extremes: [
            { type: 'baixa-mar', time: '04:40', height: '0.46 m' },
            { type: 'preamar', time: '13:34', height: '1.13 m' },
          ],
          points: [
            { time: '04:40', value: 0.46 },
            { time: '13:34', value: 1.13 },
          ],
        }),
      }),
    );
    expect(marine.tide).toMatchObject({
      current: '0.64 m',
      phase: 'Enchente',
      attribution: 'Tábua de Florianópolis. Fonte: Marinha (Tábua de Maré API).',
    });
    expect(marine.tide.extremes).toHaveLength(2);
  });
});
