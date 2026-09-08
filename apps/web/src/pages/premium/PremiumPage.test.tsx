import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { PremiumPage } from './PremiumPage';
import type { PlanCatalog } from '@/features/subscription/subscriptionPlans';

const paidModules = {
  marine: true,
  diary: true,
  offline: true,
  customMetrics: true,
  communityVote: true,
  rankingEmphasis: true,
};

const catalog: PlanCatalog[] = [
  {
    code: 'arrais',
    name: 'Arrais',
    tagline: 'O primeiro comando da sua pesca.',
    monthlyPriceCents: 1490,
    featured: false,
    sortOrder: 1,
    entitlements: {
      maxForecastDays: 5,
      maxFavorites: 10,
      maxPersonalSpots: 5,
      maxAlerts: 5,
    },
    modules: paidModules,
  },
  {
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
  },
  {
    code: 'capitao',
    name: 'Capitão',
    tagline: 'Mais cotas para quem pesca o ano todo.',
    monthlyPriceCents: 2490,
    featured: false,
    sortOrder: 3,
    entitlements: {
      maxForecastDays: 8,
      maxFavorites: 40,
      maxPersonalSpots: 20,
      maxAlerts: 20,
    },
    modules: paidModules,
  },
];

const { authState } = vi.hoisted(() => ({
  authState: {
    user: { plan: { code: 'free', name: 'Free' } } as { plan: { code: string; name: string } },
  },
}));

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => authState,
}));

vi.mock('@/features/subscription/services/subscriptionPlansService', () => ({
  getSubscriptionPlans: () => Promise.resolve(catalog),
}));

describe('PremiumPage', () => {
  beforeEach(() => {
    authState.user = { plan: { code: 'free', name: 'Free' } };
  });

  it('lista os três planos de assinatura e os recursos incluídos', async () => {
    renderWithProviders(<PremiumPage />);

    expect(await screen.findByRole('heading', { name: 'Arrais' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mestre' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Capitão' })).toBeInTheDocument();
    expect(screen.getByText('R$ 14,90')).toBeInTheDocument();
    expect(screen.getByText('R$ 19,90')).toBeInTheDocument();
    expect(screen.getByText('R$ 24,90')).toBeInTheDocument();
    expect(screen.getByText('Mais escolhido')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Previsão ampliada' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Leitura sob medida' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Seus locais e favoritos' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Alertas de oportunidade' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Diário de pesca' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Previsão offline' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Confirmação da comunidade' })).toBeInTheDocument();
  });

  it('marca o plano atual quando a conta já é assinante', async () => {
    authState.user = { plan: { code: 'premium', name: 'Mestre' } };
    renderWithProviders(<PremiumPage />);

    expect(await screen.findByText(/Você já é assinante · Mestre/)).toBeInTheDocument();
    expect(screen.getByText('Seu plano atual')).toBeInTheDocument();
  });
});
