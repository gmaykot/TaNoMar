import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { FocusOnboardingPage } from './FocusOnboardingPage';

const { updatePreferences, authState } = vi.hoisted(() => ({
  updatePreferences: vi.fn((preferences: unknown) => Promise.resolve(preferences)),
  authState: { focus: null as string | null },
}));

vi.mock('@/features/auth/services/preferencesService', () => ({ updatePreferences }));

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    status: 'authenticated',
    userLoading: false,
    user: {
      id: 'user-1',
      name: 'Ana',
      email: 'ana@example.com',
      pictureUrl: null,
      role: 'User',
      plan: { code: 'free', name: 'Free' },
      entitlements: {
        maxForecastDays: 3,
        maxFavorites: 0,
        maxPersonalSpots: 0,
        maxAlerts: 0,
      },
      features: { showPartners: false, showAppFocus: true },
      preferences: {
        region: 'Florianópolis',
        windUnit: 'kmh',
        forecastNotifications: true,
        focus: authState.focus,
      },
    },
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe('FocusOnboardingPage', () => {
  beforeEach(() => {
    authState.focus = null;
    updatePreferences.mockClear();
  });

  it('salva o foco escolhido no primeiro acesso', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FocusOnboardingPage />, ['/comecar']);

    expect(screen.getByRole('heading', { name: 'Qual é o seu foco?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Começar' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /Surfista/ }));
    expect(screen.getByRole('button', { name: /Surfista/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Começar' }));

    await waitFor(() => {
      expect(updatePreferences).toHaveBeenCalledWith(
        expect.objectContaining({
          focus: 'surfista',
          forecastNotifications: true,
        }),
      );
    });
  });
});
