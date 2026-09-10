import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { PlanComparisonTable } from './PlanComparisonTable';
import type { PlanCatalog } from '../subscriptionPlans';

const modulesOff = {
  marine: false,
  diary: false,
  offline: false,
  customMetrics: false,
  communityVote: false,
  rankingEmphasis: false,
  liveWebcams: false,
};

const freePlan: PlanCatalog = {
  code: 'free',
  name: 'Free',
  tagline: 'Consulta o mapa TáNoMar.',
  monthlyPriceCents: 0,
  featured: false,
  enabled: true,
  sortOrder: 0,
  activeUserCount: 0,
  entitlements: {
    maxForecastDays: 3,
    maxFavorites: 0,
    maxPersonalSpots: 0,
    maxAlerts: 0,
  },
  modules: modulesOff,
};

const paidPlan: PlanCatalog = {
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
  modules: { ...modulesOff, marine: true, liveWebcams: true },
};

describe('PlanComparisonTable', () => {
  it('mostra o Free como primeira coluna da comparação', () => {
    render(<PlanComparisonTable plans={[freePlan, paidPlan]} currentPlanCode="free" />);

    const table = screen.getByRole('table', { name: 'Comparação dos planos' });
    expect(within(table).getByRole('columnheader', { name: /Free/ })).toBeInTheDocument();
    expect(within(table).getByText('Plano atual')).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Mestre' })).toBeInTheDocument();
    expect(within(table).getByText('Grátis')).toBeInTheDocument();
    expect(within(table).getByText('R$ 19,90')).toBeInTheDocument();
    expect(within(table).getByText('3 dias')).toBeInTheDocument();
    expect(within(table).getByRole('rowheader', { name: 'Detalhes do mar' })).toBeInTheDocument();
    expect(within(table).getByRole('rowheader', { name: 'Diário' })).toBeInTheDocument();
    expect(within(table).getByRole('rowheader', { name: 'Previsão offline' })).toBeInTheDocument();
    expect(within(table).getByRole('rowheader', { name: 'Vento ideal' })).toBeInTheDocument();
    expect(
      within(table).getByRole('rowheader', { name: 'Relatos da comunidade' }),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole('rowheader', {
        name: 'Ordenar ranking por vento, chuva ou ondas',
      }),
    ).toBeInTheDocument();
    expect(within(table).getAllByText('Incluído').length).toBeGreaterThanOrEqual(1);
    expect(within(table).queryByText('0')).not.toBeInTheDocument();
    expect(within(table).getAllByText('—').length).toBeGreaterThanOrEqual(3);
    expect(within(table).getByText('Incluídas')).toBeInTheDocument();
  });
});
