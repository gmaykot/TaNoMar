import { describe, expect, it } from 'vitest';
import { forecastFixture } from '@/features/forecast/fixtures/forecast';
import { locationsFixture } from '@/features/locations/fixtures/locations';
import { enrichForecastOwnership } from './enrichForecastOwnership';

describe('enrichForecastOwnership', () => {
  it('marca isOwner nos itens de ranking a partir da lista de locais', () => {
    const forecast = enrichForecastOwnership(
      {
        ...forecastFixture,
        days: forecastFixture.days.map((day) => ({
          ...day,
          ranking: day.ranking.map((item) => ({ ...item, isOwner: false })),
        })),
      },
      locationsFixture,
    );

    const owned = forecast.days[0]?.ranking.find((item) => item.locationId === 'molhe-da-barra');
    expect(owned?.isOwner).toBe(true);
    expect(owned?.visibility).toBe('private');
    expect(forecast.days[0]?.ranking.find((item) => item.locationId === 'pantano_do_sul')?.isOwner).toBe(
      false,
    );
  });

  it('marca visibilidade compartilhada nos itens de ranking', () => {
    const locations = locationsFixture.map((location) =>
      location.id === 'pantano_do_sul'
        ? { ...location, visibility: 'shared' as const, isOwner: false }
        : location,
    );
    const forecast = enrichForecastOwnership(forecastFixture, locations);
    expect(
      forecast.days[0]?.ranking.find((item) => item.locationId === 'pantano_do_sul')?.visibility,
    ).toBe('shared');
    expect(
      forecast.days[0]?.ranking.find((item) => item.locationId === 'molhe-da-barra')?.isOwner,
    ).toBe(true);
  });

  it('mantém a previsão quando não há locais do usuário', () => {
    const locations = locationsFixture.map((location) => ({ ...location, isOwner: false }));
    const forecast = enrichForecastOwnership(forecastFixture, locations);
    expect(forecast).toEqual(forecastFixture);
  });
});
