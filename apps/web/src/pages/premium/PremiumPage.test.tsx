import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { PremiumPage } from './PremiumPage';
import type { BillingCatalog } from '@/features/billing/billing';

const paidModules = {
  marine: true,
  diary: true,
  offline: true,
  customMetrics: true,
  communityVote: true,
  rankingEmphasis: true,
};

const catalog: BillingCatalog = {
  enabled: false,
  discountPercent: 20,
  plans: [
    {
      code: 'arrais',
      name: 'Arrais',
      tagline: 'O primeiro comando da sua pesca.',
      monthlyPriceCents: 1490,
      annualPriceCents: 14304,
      featured: false,
      enabled: true,
      sortOrder: 1,
      activeUserCount: 0,
      entitlements: {
        maxForecastDays: 5,
        maxFavorites: 10,
        maxPersonalSpots: 5,
        maxAlerts: 5,
      },
      modules: paidModules,
      quotes: [],
    },
    {
      code: 'premium',
      name: 'Mestre',
      tagline: 'O equilíbrio para planejar a semana.',
      monthlyPriceCents: 1990,
      annualPriceCents: 19104,
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
      modules: paidModules,
      quotes: [],
    },
    {
      code: 'capitao',
      name: 'Capitão',
      tagline: 'Mais cotas para quem pesca o ano todo.',
      monthlyPriceCents: 2490,
      annualPriceCents: 23904,
      featured: false,
      enabled: true,
      sortOrder: 3,
      activeUserCount: 0,
      entitlements: {
        maxForecastDays: 8,
        maxFavorites: 40,
        maxPersonalSpots: 20,
        maxAlerts: 20,
      },
      modules: paidModules,
      quotes: [],
    },
  ],
};

const { authState, billingState, startCheckout } = vi.hoisted(() => ({
  authState: {
    user: { plan: { code: 'free', name: 'Free' } } as {
      plan: { code: string; name: string };
      billing?: { status: string; cycle: string | null; enabled: boolean };
    },
  },
  billingState: { enabled: false },
  startCheckout: vi.fn(),
}));

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => authState,
}));

vi.mock('@/features/billing/services/billingService', () => ({
  getBillingCatalog: () =>
    Promise.resolve({
      ...catalog,
      enabled: billingState.enabled,
      plans: catalog.plans.map((plan) => ({ ...plan })),
    }),
  startBillingCheckout: (...args: unknown[]) => startCheckout(...args),
  getBillingSubscription: vi.fn(),
  cancelBillingSubscription: vi.fn(),
}));

describe('PremiumPage', () => {
  beforeEach(() => {
    authState.user = { plan: { code: 'free', name: 'Free' } };
    billingState.enabled = false;
    startCheckout.mockReset();
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
    expect(screen.getByText(/A cobrança ainda não começa por aqui/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Previsão ampliada' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Leitura sob medida' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Seus locais e favoritos' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Alertas de oportunidade' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Diário de pesca' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Previsão offline' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Confirmação da comunidade' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Assinar no mês/ })).not.toBeInTheDocument();
  });

  it('marca o plano atual quando a conta já é assinante', async () => {
    authState.user = { plan: { code: 'premium', name: 'Mestre' } };
    renderWithProviders(<PremiumPage />);

    expect(await screen.findByText(/Você já é assinante · Mestre/)).toBeInTheDocument();
    expect(screen.getByText('Seu plano atual')).toBeInTheDocument();
  });

  it('abre o checkout mensal quando a cobrança está ligada', async () => {
    billingState.enabled = true;
    startCheckout.mockResolvedValue({
      checkoutId: 'chk_1',
      checkoutUrl: 'https://asaas.com/checkoutSession/show?id=chk_1',
      expiresAt: '2026-09-08T12:00:00Z',
    });
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    const user = userEvent.setup();
    renderWithProviders(<PremiumPage />);

    expect(
      await screen.findByRole('button', { name: 'Assinar no mês · R$ 14,90' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Assinar no mês · R$ 14,90' }));
    expect(startCheckout).toHaveBeenCalledWith('arrais', 'MONTHLY');
  });

  it('explica o retorno do checkout sem promover o plano localmente', async () => {
    renderWithProviders(<PremiumPage />, ['/premium?checkout=success']);

    expect(
      await screen.findByText(
        'Recebemos o retorno do pagamento. O plano entra quando a cobrança for confirmada.',
      ),
    ).toBeInTheDocument();
  });
});
