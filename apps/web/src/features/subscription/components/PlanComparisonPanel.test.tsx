import { afterEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { PlanComparisonPanel } from './PlanComparisonPanel';
import type { PlanCatalog } from '../subscriptionPlans';

afterEach(() => {
  window.location.hash = '';
});

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
  modules: {
    marine: false,
    diary: false,
    offline: false,
    customMetrics: false,
    communityVote: false,
    rankingEmphasis: false,
    liveWebcams: false,
  },
};

describe('PlanComparisonPanel', () => {
  it('abre a tabela só quando o usuário pede a comparação', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PlanComparisonPanel plans={[freePlan]} />);

    expect(screen.queryByRole('table', { name: 'Comparação dos planos' })).not.toBeInTheDocument();
    await user.click(screen.getByText('Comparar os planos'));
    expect(screen.getByRole('table', { name: 'Comparação dos planos' })).toBeInTheDocument();
    expect(screen.getByText('Grátis')).toBeInTheDocument();
  });

  it('abre a tabela quando a URL aponta para a comparação', async () => {
    renderWithProviders(<PlanComparisonPanel plans={[freePlan]} />);
    expect(screen.queryByRole('table', { name: 'Comparação dos planos' })).not.toBeInTheDocument();

    window.location.hash = '#comparacao-planos';

    expect(await screen.findByRole('table', { name: 'Comparação dos planos' })).toBeInTheDocument();
  });
});
