import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AccountPage } from './AccountPage';

const { logout } = vi.hoisted(() => ({
  logout: vi.fn(),
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
      plan: { code: 'premium', name: 'Premium' },
      entitlements: {
        maxForecastDays: 8,
        maxFavorites: 20,
        maxPersonalSpots: 10,
        maxAlerts: 10,
      },
      preferences: { region: 'Florianópolis', windUnit: 'kmh', forecastNotifications: true },
    },
    loginWithGoogle: vi.fn(),
    logout,
  }),
}));

describe('AccountPage', () => {
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
    expect(screen.getByText(/Relatos de condição e perigo/)).toBeInTheDocument();
    expect(screen.getByText(/perfil costeiro/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver fontes/ })).toHaveAttribute('href', '/sobre');

    await user.click(screen.getByRole('button', { name: 'Sair' }));
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
