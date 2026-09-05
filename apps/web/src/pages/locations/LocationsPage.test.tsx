import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { locationsFixture } from '@/features/locations/fixtures/locations';
import { renderWithProviders } from '@/test/renderWithProviders';
import { LocationsPage } from './LocationsPage';

vi.mock('@/features/locations/services/locationsService', () => ({
  getLocations: () => Promise.resolve(locationsFixture),
  setFavorite: () => Promise.resolve(),
  createLocation: vi.fn(),
  updateLocation: vi.fn(),
  deleteLocation: vi.fn(),
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
    logout: vi.fn(),
  }),
}));

describe('LocationsPage', () => {
  it('filtra locais ignorando acentos', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LocationsPage />);

    const search = await screen.findByRole('searchbox', { name: 'Buscar locais' });
    expect(screen.getByText('11 locais encontrados')).toBeInTheDocument();
    await user.type(search, 'acores');
    expect(screen.getByText('1 local encontrado')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Açores' })).toBeInTheDocument();
  });

  it('mostra estado vazio para uma busca sem resultado', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LocationsPage />);
    await user.type(await screen.findByRole('searchbox'), 'lugar inexistente');
    expect(screen.getByText('Nenhum local encontrado')).toBeInTheDocument();
  });

  it('filtra a lista de favoritos', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LocationsPage />);
    await screen.findByRole('heading', { name: 'Campeche' });
    await user.click(screen.getByRole('button', { name: 'Favoritos' }));
    expect(screen.getByText('Nenhum local encontrado')).toBeInTheDocument();
  });

  it('aplica o filtro de favoritos pela URL', async () => {
    renderWithProviders(<LocationsPage />, ['/locais?filtro=favoritos']);
    expect(await screen.findByText('Nenhum local encontrado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Favoritos' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.queryByRole('heading', { name: 'Campeche' })).not.toBeInTheDocument();
  });
});
