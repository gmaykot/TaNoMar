import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { locationsFixture } from '@/features/locations/fixtures/locations';
import { renderWithProviders } from '@/test/renderWithProviders';
import { LocationsPage } from './LocationsPage';

const authState = vi.hoisted(() => ({
  maxPersonalSpots: 10,
  maxFavorites: 20,
}));

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
      plan: {
        code: authState.maxPersonalSpots > 0 || authState.maxFavorites > 0 ? 'premium' : 'free',
        name: authState.maxPersonalSpots > 0 || authState.maxFavorites > 0 ? 'Premium' : 'Free',
      },
      entitlements: {
        maxForecastDays: 8,
        maxFavorites: authState.maxFavorites,
        maxPersonalSpots: authState.maxPersonalSpots,
        maxAlerts: 10,
      },
      preferences: { region: 'Florianópolis', windUnit: 'kmh', forecastNotifications: true },
    },
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe('LocationsPage', () => {
  beforeEach(() => {
    authState.maxPersonalSpots = 10;
    authState.maxFavorites = 20;
  });

  it('mostra novo local só dentro de meus locais', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LocationsPage />);

    expect(await screen.findByRole('heading', { name: 'Campeche' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Novo local' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Meus locais' }));
    expect(screen.getByRole('button', { name: 'Novo local' })).toBeEnabled();
  });

  it('bloqueia favoritar no plano Free com cadeado Premium', async () => {
    authState.maxPersonalSpots = 0;
    authState.maxFavorites = 0;
    renderWithProviders(<LocationsPage />);
    const favorite = await screen.findAllByRole('button', {
      name: 'Favoritar bloqueado no plano atual',
    });
    expect(favorite.length).toBeGreaterThan(0);
    expect(favorite[0]).toBeDisabled();
  });

  it('diferencia os locais pelo perfil costeiro', async () => {
    renderWithProviders(<LocationsPage />);
    expect(await screen.findByRole('heading', { name: 'Campeche' })).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: 'Praia aberta' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('img', { name: 'Praia semiaberta' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('img', { name: 'Águas protegidas' }).length).toBeGreaterThan(0);
  });

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

  it('bloqueia meus locais e favoritos no plano Free', async () => {
    authState.maxPersonalSpots = 0;
    authState.maxFavorites = 0;
    renderWithProviders(<LocationsPage />, ['/locais?filtro=favoritos']);

    expect(await screen.findByRole('heading', { name: 'Campeche' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: 'Meus locais, disponível no Premium' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Favoritos, disponível no Premium' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Novo local' })).not.toBeInTheDocument();
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
