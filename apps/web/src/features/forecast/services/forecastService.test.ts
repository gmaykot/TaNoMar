import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getForecast } from './forecastService';

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
          score: { state: 'available', value: 9.1 },
          classification: { state: 'available', value: 'Excelente' },
          bestHours: { state: 'available', value: ['05:00', '06:00', '17:00'] },
          wind: { state: 'available', value: '8 km/h Leste' },
          gusts: { state: 'available', value: '12 km/h' },
          waves: { state: 'locked', reason: 'plan_required', requiredPlan: 'Premium' },
          wavePeriod: { state: 'locked', reason: 'plan_required', requiredPlan: 'Premium' },
          swell: { state: 'locked', reason: 'plan_required', requiredPlan: 'Premium' },
          rain: { state: 'available', value: '0.0 mm (10%)' },
          airTemperature: { state: 'available', value: '22.0 °C' },
          waterTemperature: { state: 'locked', reason: 'plan_required', requiredPlan: 'Premium' },
        },
      ],
    },
  ],
};

const { apiRequest } = vi.hoisted(() => ({
  apiRequest: vi.fn(),
}));

vi.mock('@/shared/api/client', () => ({ apiRequest }));

describe('getForecast', () => {
  beforeEach(() => {
    apiRequest.mockReset();
    apiRequest.mockResolvedValue(rankingWire);
  });

  it('busca o ranking padrão sem query de ênfase', async () => {
    await getForecast();
    expect(apiRequest).toHaveBeenCalledWith('/forecasts/ranking');
  });

  it('envia a ênfase na query do ranking', async () => {
    await getForecast('wind');
    expect(apiRequest).toHaveBeenCalledWith('/forecasts/ranking?emphasis=wind');
    await getForecast('wind-more');
    expect(apiRequest).toHaveBeenCalledWith('/forecasts/ranking?emphasis=wind-more');
  });
});
