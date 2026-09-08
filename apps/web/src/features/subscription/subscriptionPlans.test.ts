import { describe, expect, it } from 'vitest';
import {
  centsFromReaisInput,
  formatBrlFromCents,
  planFeatureList,
  plansWithFreeBaseline,
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
    liveWebcams: false,
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

describe('plansWithFreeBaseline', () => {
  it('coloca o Free na frente dos planos pagos', () => {
    expect(
      plansWithFreeBaseline([plan], [{ ...plan, code: 'free', name: 'Free' }]).map(
        (item) => item.code,
      ),
    ).toEqual(['free', 'premium']);
  });

  it('mantém só os pagos quando o catálogo não traz o Free', () => {
    expect(plansWithFreeBaseline([plan])).toEqual([plan]);
  });
});

describe('planFeatureList', () => {
  it('lista cotas e módulos ligados', () => {
    expect(planFeatureList(plan)).toEqual([
      'Até 8 dias de previsão',
      'Detalhes de ondas, swell, temperaturas e maré',
      'Cadastre até 10 locais próprios',
      'Salve até 20 locais favoritos',
      'Mantenha até 10 alertas ativos ao mesmo tempo',
      'Diário e planejamento de saídas',
      'Previsão salva no aparelho para consultar sem conexão',
      'Escolha quais indicadores quer acompanhar',
      'Ajude a validar relatos da comunidade',
      'Ordene o ranking por vento, chuva ou ondas sem mudar a nota',
    ]);
  });

  it('inclui câmeras ao vivo quando o módulo está ligado', () => {
    expect(planFeatureList({ ...plan, modules: { ...plan.modules, liveWebcams: true } })).toContain(
      'Câmeras ao vivo nos locais com transmissão',
    );
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
          liveWebcams: false,
        },
      }),
    ).toEqual([
      'Até 8 dias de previsão',
      'Cadastre até 10 locais próprios',
      'Salve até 20 locais favoritos',
      'Mantenha até 10 alertas ativos ao mesmo tempo',
    ]);
  });
});
