import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AccountPage } from './AccountPage';

const { logout, cancelSubscription, authState } = vi.hoisted(() => ({
  logout: vi.fn(),
  cancelSubscription: vi.fn(),
  authState: {
    maxPersonalSpots: 10,
    maxFavorites: 20,
    role: 'User',
    showPartners: false,
    billing: undefined as
      | {
          status: 'active' | 'pending' | 'inactive' | 'past_due' | 'canceled';
          planCode: string | null;
          cycle: 'MONTHLY' | 'YEARLY' | null;
          catalogMonthlyPrice: number | null;
          catalogAnnualPrice: number | null;
          contractedPrice: number | null;
          renewalPrice: number | null;
          discountPercent: number;
          renewsAt: string | null;
          accessUntil: string | null;
          cancelAtPeriodEnd: boolean;
          enabled: boolean;
        }
      | undefined,
  },
}));

vi.mock('@/features/billing/services/billingService', () => ({
  cancelBillingSubscription: (...args: unknown[]) => cancelSubscription(...args),
  getBillingCatalog: vi.fn(),
  getBillingSubscription: vi.fn(),
  startBillingCheckout: vi.fn(),
}));

vi.mock('@/features/locations/hooks/useLocations', () => ({
  useLocations: () => ({
    data: [
      { isOwner: true, isFavorite: true },
      { isOwner: false, isFavorite: true },
    ],
    isPending: false,
  }),
}));

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: {
      id: 'user-1',
      name: 'Ana',
      email: 'ana@example.com',
      pictureUrl: null,
      role: authState.role,
      plan: {
        code: authState.maxPersonalSpots > 0 || authState.maxFavorites > 0 ? 'premium' : 'free',
        name: authState.maxPersonalSpots > 0 || authState.maxFavorites > 0 ? 'Mestre' : 'Free',
      },
      entitlements: {
        maxForecastDays: 8,
        maxFavorites: authState.maxFavorites,
        maxPersonalSpots: authState.maxPersonalSpots,
        maxAlerts: 10,
      },
      features: { showPartners: authState.showPartners },
      preferences: { region: 'Florianópolis', windUnit: 'kmh', forecastNotifications: true },
      billing: authState.billing,
    },
    loginWithGoogle: vi.fn(),
    logout,
  }),
}));

describe('AccountPage', () => {
  beforeEach(() => {
    authState.maxPersonalSpots = 10;
    authState.maxFavorites = 20;
    authState.role = 'User';
    authState.showPartners = false;
    authState.billing = undefined;
    logout.mockClear();
    cancelSubscription.mockReset();
  });

  it('funciona como central da conta e chama logout', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AccountPage />);

    expect(screen.getByRole('link', { name: /Previsão e regiões/ })).toHaveAttribute(
      'href',
      '/conta/preferencias',
    );
    expect(screen.getByRole('link', { name: /Notificações/ })).toHaveAttribute(
      'href',
      '/conta/notificacoes',
    );
    expect(screen.getByRole('link', { name: /Meus locais/ })).toHaveAttribute(
      'href',
      '/locais?filtro=meus',
    );
    expect(screen.getByRole('link', { name: /Favoritos/ })).toHaveAttribute(
      'href',
      '/locais?filtro=favoritos',
    );
    expect(screen.getByRole('link', { name: /Sobre o TáNoMar/ })).toHaveAttribute('href', '/sobre');
    expect(screen.getByRole('link', { name: /Diário de pesca/ })).toHaveAttribute(
      'href',
      '/diario',
    );
    expect(screen.queryByRole('link', { name: /Novo local/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/pescadores relatam como está o mar/)).not.toBeInTheDocument();
    expect(screen.getByText('Plano')).toBeInTheDocument();
    expect(screen.getByText('Mestre')).toBeInTheDocument();
    expect(screen.getByText('1 / 10')).toBeInTheDocument();
    expect(screen.getByText('2 / 20')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Mudar plano/ })).toHaveAttribute(
      'href',
      '/premium#planos',
    );

    await user.click(screen.getByRole('button', { name: 'Sair' }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('separa os acessos de parceiros e administração quando disponíveis', () => {
    authState.role = 'Admin';
    authState.showPartners = true;
    renderWithProviders(<AccountPage />);

    expect(screen.getByRole('link', { name: /Parceiros/ })).toHaveAttribute('href', '/parceiros');
    expect(screen.getByRole('link', { name: /Abrir painel administrativo/ })).toHaveAttribute(
      'href',
      '/admin',
    );
  });

  it('mantém locais e favoritos bloqueados no plano Free', () => {
    authState.maxPersonalSpots = 0;
    authState.maxFavorites = 0;
    renderWithProviders(<AccountPage />);

    expect(screen.getByLabelText('Meus locais bloqueado no plano atual')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByLabelText('Favoritos bloqueado no plano atual')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.queryByRole('link', { name: /Meus locais/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Favoritos/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Diário de pesca bloqueado no plano atual')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.queryByRole('link', { name: /Diário de pesca/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Notificações/ })).toHaveAttribute(
      'href',
      '/conta/notificacoes',
    );
    expect(screen.getByRole('link', { name: /Conhecer os planos/ })).toHaveAttribute(
      'href',
      '/premium',
    );
  });

  it('cancela a renovação sem estorno e mantém o acesso até o fim do período', async () => {
    authState.billing = {
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
    };
    cancelSubscription.mockResolvedValue({
      ...authState.billing,
      status: 'canceled',
      cancelAtPeriodEnd: true,
      renewsAt: null,
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    renderWithProviders(<AccountPage />);

    await user.click(screen.getByRole('button', { name: 'Cancelar renovação' }));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Não há estorno'));
    expect(cancelSubscription).toHaveBeenCalledTimes(1);
  });
});
