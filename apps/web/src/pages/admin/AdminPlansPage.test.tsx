import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AdminPlansPage } from './AdminPlansPage';
import type { PlanCatalog } from '@/features/subscription/subscriptionPlans';

const paidModules = {
  marine: true,
  diary: true,
  offline: true,
  customMetrics: true,
  communityVote: true,
  rankingEmphasis: true,
};

const freePlan: PlanCatalog = {
  code: 'free',
  name: 'Free',
  tagline: 'Consulta o mapa TáNoMar.',
  monthlyPriceCents: 0,
  featured: false,
  sortOrder: 0,
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
  },
};

const mestrePlan: PlanCatalog = {
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
  modules: paidModules,
};

const { updateAdminPlan } = vi.hoisted(() => ({
  updateAdminPlan: vi.fn((code: string, input: { name: string }) =>
    Promise.resolve({
      ...mestrePlan,
      ...input,
      code,
      name: input.name,
    }),
  ),
}));

vi.mock('@/features/admin-plans/services/adminPlansService', () => ({
  getAdminPlans: () => Promise.resolve([freePlan, mestrePlan]),
  updateAdminPlan,
}));

vi.mock('@/app/layout/saveConfirmationEvents', () => ({
  showSaveConfirmation: vi.fn(),
}));

describe('AdminPlansPage', () => {
  it('lista os planos e salva preço, cotas e módulos', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminPlansPage />);

    expect(await screen.findByRole('heading', { name: 'Free' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mestre' })).toBeInTheDocument();
    expect(screen.getByText('Mais escolhido')).toBeInTheDocument();

    const mestre = screen.getByRole('article', { name: 'Mestre' });
    const name = within(mestre).getByLabelText('Nome do plano');
    await user.clear(name);
    await user.type(name, 'Mestre da costa');
    await user.click(within(mestre).getByRole('button', { name: 'Salvar plano' }));

    expect(updateAdminPlan).toHaveBeenCalledWith(
      'premium',
      expect.objectContaining({
        name: 'Mestre da costa',
        monthlyPriceCents: 1990,
        maxForecastDays: 8,
        canMarine: true,
        featured: true,
      }),
    );
  });
});
