import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { UserMenu } from './UserMenu';

const { logout, authState } = vi.hoisted(() => ({
  logout: vi.fn(),
  authState: { showPartners: false },
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: {
      id: 'user-1',
      name: 'Ana',
      email: 'ana@example.com',
      pictureUrl: null,
      role: 'User',
      plan: { code: 'premium', name: 'Premium' },
      entitlements: {
        maxForecastDays: 8,
        maxFavorites: 20,
        maxPersonalSpots: 10,
        maxAlerts: 10,
      },
      features: { showPartners: authState.showPartners },
      preferences: { region: 'Florianópolis', windUnit: 'kmh', forecastNotifications: true },
    },
    loginWithGoogle: vi.fn(),
    logout,
  }),
}));

describe('UserMenu', () => {
  it('abre o menu, leva para a conta e chama logout', async () => {
    authState.showPartners = false;
    const user = userEvent.setup();
    renderWithProviders(<UserMenu />);

    await user.click(screen.getByRole('button', { name: 'Abrir menu da conta de Ana' }));
    expect(screen.getByRole('menu', { name: 'Menu da conta' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Conta' })).toHaveAttribute('href', '/conta');
    expect(screen.getByRole('menuitem', { name: 'Meus locais' })).toHaveAttribute(
      'href',
      '/locais?filtro=meus',
    );
    expect(screen.getByRole('menuitem', { name: 'Sobre' })).toHaveAttribute('href', '/sobre');
    expect(screen.queryByRole('menuitem', { name: 'Parceiros' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Moderação' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: 'Sair' }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('mostra Parceiros quando a flag está ligada', async () => {
    authState.showPartners = true;
    const user = userEvent.setup();
    renderWithProviders(<UserMenu />);
    await user.click(screen.getByRole('button', { name: 'Abrir menu da conta de Ana' }));
    expect(screen.getByRole('menuitem', { name: 'Parceiros' })).toHaveAttribute(
      'href',
      '/parceiros',
    );
  });
});
