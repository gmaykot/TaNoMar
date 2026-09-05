import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AccountPage } from './AccountPage';

const { logout, authState } = vi.hoisted(() => ({
  logout: vi.fn(),
  authState: {
    maxPersonalSpots: 10,
    maxFavorites: 20,
    maxAlerts: 10,
  },
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
      role: 'User',
      plan: {
        code: authState.maxPersonalSpots > 0 || authState.maxFavorites > 0 ? 'premium' : 'free',
        name: authState.maxPersonalSpots > 0 || authState.maxFavorites > 0 ? 'Premium' : 'Free',
      },
      entitlements: {
        maxForecastDays: 8,
        maxFavorites: authState.maxFavorites,
        maxPersonalSpots: authState.maxPersonalSpots,
        maxAlerts: authState.maxAlerts,
      },
      preferences: { region: 'Florianópolis', windUnit: 'kmh', forecastNotifications: true },
    },
    loginWithGoogle: vi.fn(),
    logout,
  }),
}));

describe('AccountPage', () => {
  beforeEach(() => {
    authState.maxPersonalSpots = 10;
    authState.maxFavorites = 20;
    authState.maxAlerts = 10;
  });

  it('mostra atalhos da área logada e chama logout', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AccountPage />);

    expect(screen.getByRole('link', { name: /Meus pesqueiros/ })).toHaveAttribute(
      'href',
      '/locais?filtro=meus',
    );
    expect(screen.getByRole('link', { name: /Favoritos/ })).toHaveAttribute(
      'href',
      '/locais?filtro=favoritos',
    );
    expect(screen.getByRole('link', { name: /Novo local/ })).toHaveAttribute(
      'href',
      '/locais/novo',
    );
    expect(screen.getByText(/pescadores relatam como está o mar/)).toBeInTheDocument();
    expect(screen.getByText(/perfil costeiro/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver fontes/ })).toHaveAttribute('href', '/sobre');
    expect(screen.getByText('Plano')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
    expect(screen.getByText('Pesqueiros')).toBeInTheDocument();
    expect(screen.getByText('1 / 10')).toBeInTheDocument();
    expect(screen.getByText('2 / 20')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Toda a ilha' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'Sair' }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('bloqueia pesqueiros, favoritos e notificações no plano Free', () => {
    authState.maxPersonalSpots = 0;
    authState.maxFavorites = 0;
    authState.maxAlerts = 0;
    renderWithProviders(<AccountPage />);

    expect(screen.getByLabelText('Meus pesqueiros bloqueado no plano atual')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByLabelText('Favoritos bloqueado no plano atual')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByLabelText('Notificações bloqueado no plano atual')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(
      screen.getByLabelText('Notificações de previsão bloqueadas no plano atual'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Meus pesqueiros/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Favoritos/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Novo local/ })).not.toBeInTheDocument();
  });
});
