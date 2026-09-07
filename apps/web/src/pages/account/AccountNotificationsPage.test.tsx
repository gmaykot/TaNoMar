import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AccountNotificationsPage } from './AccountNotificationsPage';

const { showSaveConfirmation, togglePush, updatePreferences, authState } = vi.hoisted(() => ({
  showSaveConfirmation: vi.fn(),
  togglePush: vi.fn(),
  updatePreferences: vi.fn((preferences: unknown) => Promise.resolve(preferences)),
  authState: { maxAlerts: 10 },
}));

vi.mock('@/app/layout/saveConfirmationEvents', () => ({ showSaveConfirmation }));
vi.mock('@/features/auth/services/preferencesService', () => ({ updatePreferences }));
vi.mock('@/features/notifications/hooks/useDevicePush', () => ({
  useDevicePush: () => ({
    available: true,
    configured: true,
    loading: false,
    iosNeedsInstall: false,
    enabled: false,
    pending: false,
    error: null,
    toggle: togglePush,
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
      plan: { code: authState.maxAlerts > 0 ? 'premium' : 'free', name: 'Premium' },
      entitlements: {
        maxForecastDays: 8,
        maxFavorites: 20,
        maxPersonalSpots: 10,
        maxAlerts: authState.maxAlerts,
      },
      features: { showPartners: false },
      preferences: { region: 'Florianópolis', windUnit: 'kmh', forecastNotifications: true },
    },
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe('AccountNotificationsPage', () => {
  beforeEach(() => {
    authState.maxAlerts = 10;
    togglePush.mockReset();
    updatePreferences.mockClear();
    showSaveConfirmation.mockClear();
  });

  it('salva a preferência da conta separadamente dos avisos do aparelho', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AccountNotificationsPage />);

    await user.click(screen.getByRole('checkbox', { name: /Quero notificações de previsão/ }));
    await user.click(screen.getByRole('button', { name: 'Salvar preferência' }));

    await waitFor(() => {
      expect(updatePreferences).toHaveBeenCalledWith(
        expect.objectContaining({ forecastNotifications: false }),
      );
      expect(showSaveConfirmation).toHaveBeenCalledWith('Preferências salvas.');
    });
    expect(togglePush).not.toHaveBeenCalled();
  });

  it('liga avisos no aparelho imediatamente', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AccountNotificationsPage />);

    await user.click(screen.getByRole('checkbox', { name: /Receber avisos com o app fechado/ }));
    expect(togglePush).toHaveBeenCalledWith(true);
    expect(updatePreferences).not.toHaveBeenCalled();
  });

  it('mantém notificações de previsão bloqueadas no plano Free', () => {
    authState.maxAlerts = 0;
    renderWithProviders(<AccountNotificationsPage />);

    expect(
      screen.getByLabelText('Notificações de previsão bloqueadas no plano atual'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salvar preferência' })).not.toBeInTheDocument();
  });
});
