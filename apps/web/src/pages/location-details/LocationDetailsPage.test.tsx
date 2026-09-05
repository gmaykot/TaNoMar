import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { forecastFixture } from '@/features/forecast/fixtures/forecast';
import { locationsFixture } from '@/features/locations/fixtures/locations';
import { renderWithProviders } from '@/test/renderWithProviders';
import { LocationDetailsPage } from './LocationDetailsPage';

vi.mock('@/features/forecast/services/forecastService', () => ({
  getForecast: () => Promise.resolve(forecastFixture),
  getMarineDetails: async () => ({
    spotId: 'pantano_do_sul',
    date: '2026-09-05',
    series: [
      {
        key: 'waves',
        label: 'Ondas',
        current: '0.70 m',
        range: '0.40–1.10 m',
        points: [
          { time: '05:00', value: 0.4 },
          { time: '12:00', value: 0.7 },
        ],
      },
      {
        key: 'atmospheric-pressure',
        label: 'Pressão',
        current: '1018 hPa',
        range: '1016–1020 hPa',
        detail: 'estável',
        points: [
          { time: '05:00', value: 1016 },
          { time: '12:00', value: 1018 },
        ],
      },
    ],
    tide: {
      current: '0.85 m',
      phase: 'Enchente',
      nextExtreme: 'Preamar 14:20 · 1.20 m',
      extremes: [{ type: 'preamar', time: '14:20', height: '1.20 m' }],
      points: [
        { time: '00:00', value: 0.2 },
        { time: '06:00', value: 0.8 },
      ],
    },
  }),
  getLocationForecast: async (locationId: string) => {
    const location = locationsFixture.find((item) => item.id === locationId);
    if (!location) return null;
    const days = forecastFixture.days.flatMap((day) => {
      const forecast = day.ranking.find((item) => item.locationId === locationId);
      return forecast
        ? [{ date: day.date, label: day.label, shortLabel: day.shortLabel, forecast }]
        : [];
    });
    return { location, days };
  },
}));

vi.mock('@/features/community/services/communityService', () => ({
  getReports: () => Promise.resolve([]),
  createReport: vi.fn(),
  confirmReport: vi.fn(),
  contestReport: vi.fn(),
  deleteReport: vi.fn(),
}));

const authState = vi.hoisted(() => ({
  maxFavorites: 20,
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
        code: authState.maxFavorites > 0 ? 'premium' : 'free',
        name: authState.maxFavorites > 0 ? 'Premium' : 'Free',
      },
      entitlements: {
        maxForecastDays: 8,
        maxFavorites: authState.maxFavorites,
        maxPersonalSpots: authState.maxFavorites > 0 ? 10 : 0,
        maxAlerts: 10,
      },
      features: { showPartners: false },
      preferences: { region: 'Florianópolis', windUnit: 'kmh', forecastNotifications: true },
    },
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('@/features/locations/services/locationsService', () => ({
  getLocations: () => Promise.resolve(locationsFixture),
  setFavorite: () => Promise.resolve(),
  createLocation: vi.fn(),
  updateLocation: vi.fn(),
  deleteLocation: vi.fn(),
  getPendingLocations: vi.fn(),
  approveLocation: vi.fn(),
  rejectLocation: vi.fn(),
}));

describe('LocationDetailsPage', () => {
  beforeEach(() => {
    authState.maxFavorites = 20;
  });

  it('mostra estado amigável para local inexistente', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/locais/:locationId" element={<LocationDetailsPage />} />
      </Routes>,
      ['/locais/nao-existe'],
    );
    expect(await screen.findByText('Local não encontrado')).toBeInTheDocument();
  });

  it('mostra clima do ar no card e mar só depois de abrir', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/locais/:locationId" element={<LocationDetailsPage />} />
      </Routes>,
      ['/locais/pantano_do_sul'],
    );
    expect(await screen.findByText('Vento')).toBeInTheDocument();
    expect(screen.getByText('Chuva')).toBeInTheDocument();
    expect(screen.queryByText('Ondas')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Maré')).not.toBeInTheDocument();

    await user.click(screen.getByText('Mar e maré'));
    expect(await screen.findByRole('heading', { name: 'Mar' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Maré e pressão' })).toBeInTheDocument();
    expect(screen.getByText('Enchente')).toBeInTheDocument();
    expect(screen.getByText('Ondas')).toBeInTheDocument();
    expect(screen.getByText('Pressão')).toBeInTheDocument();
    expect(screen.getByLabelText('Maré')).toBeInTheDocument();
  });

  it('bloqueia favoritar no plano Free com cadeado Premium', async () => {
    authState.maxFavorites = 0;
    renderWithProviders(
      <Routes>
        <Route path="/locais/:locationId" element={<LocationDetailsPage />} />
      </Routes>,
      ['/locais/pantano_do_sul'],
    );
    const favorite = await screen.findByRole('button', {
      name: 'Favoritar bloqueado no plano atual',
    });
    expect(favorite).toBeDisabled();
    expect(favorite).toHaveTextContent('Premium');
  });
});
