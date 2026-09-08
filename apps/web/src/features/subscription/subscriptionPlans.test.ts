import { describe, expect, it } from 'vitest';
import {
  centsFromReaisInput,
  formatBrlFromCents,
  planFeatureList,
  reaisFromCents,
  type PlanCatalog,
} from './subscriptionPlans';

const plan: PlanCatalog = {
  code: 'premium',
  name: 'Mestre',
  tagline: 'O equilíbrio para planejar a semana.',
  monthlyPriceCents: 1990,
  featured: true,
  enabled: true,
  sortOrder: 2,
  activeUserCount: 0,
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

describe('formatBrlFromCents', () => {
  it('formata o preço em reais', () => {
    expect(formatBrlFromCents(1490)).toBe('R$ 14,90');
    expect(formatBrlFromCents(0)).toBe('R$ 0,00');
  });
});

describe('centsFromReaisInput', () => {
  it('converte o valor digitado para centavos', () => {
    expect(centsFromReaisInput('14,90')).toBe(1490);
    expect(centsFromReaisInput('19.90')).toBe(1990);
    expect(reaisFromCents(2490)).toBe('24.90');
    expect(centsFromReaisInput('abc')).toBeNull();
  });
});

describe('planFeatureList', () => {
  it('lista cotas e módulos ligados', () => {
    expect(planFeatureList(plan)).toEqual([
      'Até 8 dias de previsão',
      'Detalhes do mar',
      '10 locais pessoais e 20 favoritos',
      '10 alertas de oportunidade',
      'Diário, offline e indicadores',
      'Confirmar e contestar relatos',
      'Ênfase no ranking',
    ]);
  });

  it('omite módulos desligados', () => {
    expect(
      planFeatureList({
        ...plan,
        modules: {
          marine: false,
          diary: false,
          offline: false,
          customMetrics: false,
          communityVote: false,
          rankingEmphasis: false,
        },
      }),
    ).toEqual([
      'Até 8 dias de previsão',
      '10 locais pessoais e 20 favoritos',
      '10 alertas de oportunidade',
    ]);
  });
});
