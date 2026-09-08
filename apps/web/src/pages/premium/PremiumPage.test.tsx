import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
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
  liveWebcams: false,
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

const { authState, billingState, startCheckout, cancelSubscription } = vi.hoisted(() => ({
  authState: {
    user: { plan: { code: 'free', name: 'Free' } } as {
      plan: { code: string; name: string };
      billing?: {
        status: string;
        planCode: string | null;
        cycle: string | null;
        catalogMonthlyPrice: number | null;
        catalogAnnualPrice: number | null;
        contractedPrice: number | null;
        renewalPrice: number | null;
        discountPercent: number;
        renewsAt: string | null;
        accessUntil: string | null;
        cancelAtPeriodEnd: boolean;
        enabled: boolean;
      };
    },
  },
  billingState: { enabled: false },
  startCheckout: vi.fn(),
  cancelSubscription: vi.fn(),
}));

const scrollIntoView = vi.fn();
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  configurable: true,
  value: scrollIntoView,
});

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
  cancelBillingSubscription: (...args: unknown[]) => cancelSubscription(...args),
}));

vi.mock('@/features/subscription/services/subscriptionPlansService', () => ({
  getSubscriptionPlans: () =>
    Promise.resolve([
      {
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
      },
    ]),
}));

describe('PremiumPage', () => {
  beforeEach(() => {
    authState.user = { plan: { code: 'free', name: 'Free' } };
    billingState.enabled = false;
    startCheckout.mockReset();
    cancelSubscription.mockReset();
    scrollIntoView.mockReset();
    window.location.hash = '';
  });

  it('lista os três planos de assinatura e os recursos incluídos', async () => {
    renderWithProviders(<PremiumPage />);

    expect(await screen.findByRole('heading', { name: 'Arrais' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mestre' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Capitão' })).toBeInTheDocument();
    expect(screen.getAllByText('R$ 14,90')).toHaveLength(1);
    expect(screen.getAllByText('R$ 19,90')).toHaveLength(1);
    expect(screen.getAllByText('R$ 24,90')).toHaveLength(1);
    expect(screen.getByText('No anual, R$ 191,04 com 20% de desconto')).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Comparação dos planos' })).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByText('Comparar os planos'));
    const comparison = screen.getByRole('table', { name: 'Comparação dos planos' });
    expect(
      await within(comparison).findByRole('columnheader', { name: /Free/ }),
    ).toBeInTheDocument();
    expect(within(comparison).getByText('Grátis')).toBeInTheDocument();
    expect(screen.getByText('Recomendado')).toBeInTheDocument();
    expect(screen.queryByText('Mais escolhido')).not.toBeInTheDocument();
    expect(screen.getByText(/A cobrança ainda não começa por aqui/)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Os planos já existem na conta' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Transmissão de terceiros' })).toBeInTheDocument();
    expect(screen.getByText(/não garante manutenção nem disponibilidade/)).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Saiba como a previsão é feita/ }),
    ).not.toBeInTheDocument();
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
    expect(
      screen.getByRole('heading', { name: 'Gerencie o comando da sua pesca.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cancelar renovação' })).toHaveAttribute(
      'href',
      '#assinatura',
    );
    expect(screen.getByRole('heading', { name: 'Sua assinatura' })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Mestre' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByText('Seu plano atual')).toBeInTheDocument();
    expect(screen.getByText('Compare os demais planos')).toBeInTheDocument();
  });

  it('não oferece checkout para o plano atual sem assinatura ativa', async () => {
    authState.user = {
      plan: { code: 'premium', name: 'Mestre' },
      billing: {
        status: 'inactive',
        planCode: null,
        cycle: null,
        catalogMonthlyPrice: null,
        catalogAnnualPrice: null,
        contractedPrice: null,
        renewalPrice: null,
        discountPercent: 20,
        renewsAt: null,
        accessUntil: null,
        cancelAtPeriodEnd: false,
        enabled: true,
      },
    };
    billingState.enabled = true;
    renderWithProviders(<PremiumPage />);

    const currentPlan = await screen.findByRole('article', { name: 'Mestre' });
    expect(within(currentPlan).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Assinar no mês · R$ 14,90' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Assinar no mês · R$ 24,90' })).toBeInTheDocument();
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
    expect(
      screen.getByRole('heading', { name: 'Cartão só na página do Asaas' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Assinar no mês · R$ 14,90' }));
    expect(startCheckout).toHaveBeenCalledWith('arrais', 'MONTHLY');
  });

  it('permite tentar o checkout de novo depois de uma falha', async () => {
    billingState.enabled = true;
    startCheckout.mockRejectedValue(new Error('falha'));
    const user = userEvent.setup();
    renderWithProviders(<PremiumPage />);

    const button = await screen.findByRole('button', { name: 'Assinar no mês · R$ 14,90' });
    await user.click(button);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível abrir o pagamento.',
    );
    expect(button).toBeEnabled();

    await user.click(button);
    expect(startCheckout).toHaveBeenCalledTimes(2);
  });

  it('leva o atalho de mudança direto para os planos', async () => {
    renderWithProviders(<PremiumPage />, ['/premium#planos']);

    expect(await screen.findByRole('heading', { name: 'Arrais' })).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Comparação dos planos' })).not.toBeInTheDocument();
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' }));
  });

  it('mostra o cancelamento da renovação para voltar ao Free no fim do período', async () => {
    billingState.enabled = true;
    authState.user = {
      plan: { code: 'premium', name: 'Mestre' },
      billing: {
        status: 'active',
        planCode: 'premium',
        cycle: 'YEARLY',
        catalogMonthlyPrice: 19.9,
        catalogAnnualPrice: 191.04,
        contractedPrice: 191.04,
        renewalPrice: 191.04,
        discountPercent: 20,
        renewsAt: '2027-09-08T00:00:00.000Z',
        accessUntil: '2027-09-08T00:00:00.000Z',
        cancelAtPeriodEnd: false,
        enabled: true,
      },
    };
    cancelSubscription.mockResolvedValue({
      ...authState.user.billing,
      status: 'canceled',
      cancelAtPeriodEnd: true,
      renewsAt: null,
    });
    const user = userEvent.setup();
    renderWithProviders(<PremiumPage />, ['/premium#assinatura']);

    expect(await screen.findByRole('heading', { name: 'Sua assinatura' })).toBeInTheDocument();
    expect(screen.getByText(/conta passa para Free/)).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Mestre' })).toHaveTextContent(
      /cancele a renovação/,
    );
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar renovação' }));
    const dialog = screen.getByRole('dialog', { name: 'Cancelar renovação?' });
    expect(within(dialog).getByText(/permanece vigente até/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar renovação' }));
    expect(cancelSubscription).toHaveBeenCalledTimes(1);
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
