import { describe, expect, it } from 'vitest';
import { ContractError } from '@/shared/api/errors';
import { parsePlanCatalog, parsePlanCatalogList } from './subscriptionPlanMapper';

const sample = {
  code: 'premium',
  name: 'Mestre',
  tagline: 'O equilíbrio para planejar a semana.',
  monthlyPriceCents: 1990,
  featured: true,
  sortOrder: 2,
  entitlements: {
    maxForecastDays: 8,
    maxFavorites: 20,
    maxPersonalSpots: 10,
    maxAlerts: 10,
  },
  modules: {
    marine: true,
    diary: true,
    offline: true,
    customMetrics: true,
    communityVote: true,
    rankingEmphasis: true,
  },
};

describe('parsePlanCatalog', () => {
  it('aceita o contrato do catálogo', () => {
    expect(parsePlanCatalog(sample)).toMatchObject({
      code: 'premium',
      name: 'Mestre',
      monthlyPriceCents: 1990,
      featured: true,
      entitlements: { maxForecastDays: 8, maxAlerts: 10 },
      modules: { marine: true, diary: true },
    });
  });

  it('rejeita payload incompleto', () => {
    expect(() => parsePlanCatalog({ ...sample, monthlyPriceCents: '1990' })).toThrow(ContractError);
  });
});

describe('parsePlanCatalogList', () => {
  it('mapeia a lista', () => {
    expect(parsePlanCatalogList([sample])).toHaveLength(1);
  });

  it('rejeita valor que não é lista', () => {
    expect(() => parsePlanCatalogList(sample)).toThrow(ContractError);
  });
});
