import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { forecastFixture } from '@/features/forecast/fixtures/forecast';
import { renderWithProviders } from '@/test/renderWithProviders';
import { RankingPage } from './RankingPage';

const { getForecast, authState } = vi.hoisted(() => ({
  getForecast: vi.fn(() => Promise.resolve(forecastFixture)),
  authState: { planCode: 'premium' as 'free' | 'premium' },
}));

vi.mock('@/features/forecast/services/forecastService', () => ({
  getForecast,
  getLocationForecast: () => Promise.resolve(null),
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
        code: authState.planCode,
        name: authState.planCode === 'premium' ? 'Premium' : 'Free',
      },
      entitlements: {
        maxForecastDays: authState.planCode === 'premium' ? 8 : 3,
        maxFavorites: 20,
        maxPersonalSpots: 10,
        maxAlerts: 10,
      },
      preferences: { region: 'Florianópolis', windUnit: 'kmh', forecastNotifications: true },
    },
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe('RankingPage', () => {
  beforeEach(() => {
    authState.planCode = 'premium';
    getForecast.mockClear();
    getForecast.mockResolvedValue(forecastFixture);
  });

  it('reordena o ranking quando a ênfase muda', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RankingPage />, ['/ranking']);

    expect(
      await screen.findByRole('heading', { name: 'Os melhores locais, em ordem.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Vento. Toque para ordenar com menos vento.' }),
    ).toHaveAttribute('aria-pressed', 'false');

    await user.click(
      screen.getByRole('button', { name: 'Vento. Toque para ordenar com menos vento.' }),
    );

    expect(
      screen.getByRole('heading', { name: 'Os melhores locais, em ordem.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Menos vento. Toque para ordenar com mais vento.' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('menos')).toBeInTheDocument();
    expect(screen.getAllByText(/Vento 7 km\/h/).length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(getForecast).toHaveBeenCalledWith('wind');
    });

    await user.click(
      screen.getByRole('button', { name: 'Menos vento. Toque para ordenar com mais vento.' }),
    );

    expect(
      screen.getByRole('heading', { name: 'Os melhores locais, em ordem.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('mais')).toBeInTheDocument();
    await waitFor(() => {
      expect(getForecast).toHaveBeenCalledWith('wind-more');
    });
  });

  it('aplica a ênfase da URL', async () => {
    renderWithProviders(<RankingPage />, ['/ranking?enfase=chuva']);

    expect(
      await screen.findByRole('heading', { name: 'Os melhores locais, em ordem.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Menos chuva. Toque para ordenar com mais chuva.' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(getForecast).toHaveBeenCalledWith('rain');
  });

  it('bloqueia a ênfase no plano Free', async () => {
    authState.planCode = 'free';
    renderWithProviders(<RankingPage />, ['/ranking?enfase=vento']);

    expect(
      await screen.findByRole('heading', { name: 'Os melhores locais, em ordem.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vento, disponível no Premium' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Chuva, disponível no Premium' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ondas, disponível no Premium' })).toBeDisabled();
    expect(getForecast).toHaveBeenCalledWith(undefined);
  });
});
