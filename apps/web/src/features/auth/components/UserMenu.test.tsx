import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { UserMenu } from './UserMenu';

const { logout, authState } = vi.hoisted(() => ({
  logout: vi.fn(),
  authState: { role: 'User', planCode: 'premium' as 'free' | 'premium', planName: 'Mestre' },
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: {
      id: 'user-1',
      name: 'Ana',
      email: 'ana@example.com',
      pictureUrl: null,
      role: authState.role,
      plan: { code: authState.planCode, name: authState.planName },
      entitlements: {
        maxForecastDays: 8,
        maxFavorites: 20,
        maxPersonalSpots: 10,
        maxAlerts: 10,
      },
      features: { showPartners: true },
      preferences: { region: 'Florianópolis', windUnit: 'kmh', forecastNotifications: true },
    },
    loginWithGoogle: vi.fn(),
    logout,
  }),
}));

describe('UserMenu', () => {
  beforeEach(() => {
    authState.role = 'User';
    authState.planCode = 'premium';
    authState.planName = 'Mestre';
    logout.mockClear();
  });

  it('destaca a conta e oferece mudar de plano', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UserMenu />);

    await user.click(screen.getByRole('button', { name: 'Abrir menu da conta de Ana' }));

    expect(screen.getByRole('menu', { name: 'Menu da conta' })).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
    expect(screen.getByText('Plano Mestre')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Mudar plano' })).toHaveAttribute(
      'href',
      '/premium#planos',
    );
    expect(screen.getByRole('menuitem', { name: 'Conta' })).toHaveAttribute('href', '/conta');
    expect(screen.getByRole('menuitem', { name: 'Sobre' })).toHaveAttribute('href', '/sobre');
    expect(screen.queryByRole('menuitem', { name: 'Meus locais' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Favoritos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Parceiros' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: 'Sair' }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('convida o plano Free a conhecer a assinatura', async () => {
    authState.planCode = 'free';
    authState.planName = 'Free';
    const user = userEvent.setup();
    renderWithProviders(<UserMenu />);

    await user.click(screen.getByRole('button', { name: 'Abrir menu da conta de Ana' }));
    expect(screen.getByText('Plano Free')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Conhecer os planos' })).toHaveAttribute(
      'href',
      '/premium',
    );
  });

  it('mantém o acesso administrativo para administradores', async () => {
    authState.role = 'Admin';
    const user = userEvent.setup();
    renderWithProviders(<UserMenu />);

    await user.click(screen.getByRole('button', { name: 'Abrir menu da conta de Ana' }));
    expect(screen.getByRole('menuitem', { name: 'Administração' })).toHaveAttribute(
      'href',
      '/admin',
    );
  });
});
