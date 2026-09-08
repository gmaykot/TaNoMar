import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AccountPreferencesPage } from './AccountPreferencesPage';

const { showSaveConfirmation, updatePreferences, authState } = vi.hoisted(() => ({
  showSaveConfirmation: vi.fn(),
  updatePreferences: vi.fn((preferences: unknown) => Promise.resolve(preferences)),
  authState: { premium: true, showAppFocus: true },
}));

vi.mock('@/app/layout/saveConfirmationEvents', () => ({ showSaveConfirmation }));
vi.mock('@/features/auth/services/preferencesService', () => ({ updatePreferences }));

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
        code: authState.premium ? 'premium' : 'free',
        name: authState.premium ? 'Premium' : 'Free',
      },
      entitlements: {
        maxForecastDays: 8,
        maxFavorites: authState.premium ? 20 : 0,
        maxPersonalSpots: authState.premium ? 10 : 0,
        maxAlerts: authState.premium ? 10 : 0,
      },
      features: { showPartners: false, showAppFocus: authState.showAppFocus },
      preferences: { region: 'Florianópolis', windUnit: 'kmh', forecastNotifications: true },
    },
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe('AccountPreferencesPage', () => {
  beforeEach(() => {
    authState.premium = true;
    authState.showAppFocus = true;
    updatePreferences.mockClear();
    showSaveConfirmation.mockClear();
  });

  it('salva regiões, exibição e indicadores sem alterar notificações', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AccountPreferencesPage />);

    expect(screen.getByRole('link', { name: /Conta/ })).toHaveAttribute('href', '/conta');
    expect(screen.getByRole('button', { name: 'Toda a ilha' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      screen.getByText(
        'Marque o que deseja ver nos cards. Essa escolha não altera a nota de pesca.',
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Ondas' }));
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => {
      expect(updatePreferences).toHaveBeenCalledWith(
        expect.objectContaining({
          forecastNotifications: true,
          focus: 'pescador',
          visibleMetrics: expect.not.arrayContaining(['waves']),
        }),
      );
      expect(showSaveConfirmation).toHaveBeenCalledWith('Preferências salvas.');
    });
  });

  it('salva a troca de foco sem recalcular a nota', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AccountPreferencesPage />);

    await user.click(screen.getByRole('radio', { name: /Surfista/ }));
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => {
      expect(updatePreferences).toHaveBeenCalledWith(
        expect.objectContaining({
          focus: 'surfista',
          forecastNotifications: true,
        }),
      );
    });
  });

  it('esconde a escolha de foco quando o admin desliga', () => {
    authState.showAppFocus = false;
    renderWithProviders(<AccountPreferencesPage />);
    expect(screen.queryByRole('group', { name: 'Foco do aplicativo' })).not.toBeInTheDocument();
  });

  it('mantém os indicadores bloqueados no plano Free', () => {
    authState.premium = false;
    renderWithProviders(<AccountPreferencesPage />);

    expect(
      screen.getByLabelText('Seleção de indicadores bloqueada no plano atual'),
    ).toBeInTheDocument();
  });
});
