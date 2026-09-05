import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { PartnersPage } from './PartnersPage';

const { authState } = vi.hoisted(() => ({
  authState: { showPartners: true },
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
      features: { showPartners: authState.showPartners },
      preferences: { region: 'Florianópolis', windUnit: 'kmh', forecastNotifications: true },
    },
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('@/features/partners/hooks/usePartners', () => ({
  usePartners: (enabled: boolean) =>
    enabled
      ? {
          isPending: false,
          isError: false,
          data: [
            {
              id: 'loja-do-mar',
              slug: 'loja-do-mar',
              name: 'Loja do Mar',
              category: 'loja',
              tagline: 'Iscas na Lagoa',
              about: null,
              city: 'Florianópolis',
              whatsApp: '5548999999999',
              instagram: null,
              website: null,
              mapsUrl: null,
              coverImageUrl: null,
              isFeatured: true,
              offers: [],
            },
          ],
        }
      : { isPending: false, isError: false, data: undefined },
}));

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/parceiros" element={<PartnersPage />} />
      <Route path="/" element={<p>Início</p>} />
    </Routes>,
    ['/parceiros'],
  );
}

describe('PartnersPage', () => {
  it('lista parceiros publicados', () => {
    authState.showPartners = true;
    renderPage();
    expect(screen.getByRole('heading', { name: 'Quem ajuda a ir ao mar.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver Loja do Mar' })).toHaveAttribute(
      'href',
      '/parceiros/loja-do-mar',
    );
  });

  it('volta para o início quando a flag está desligada', () => {
    authState.showPartners = false;
    renderPage();
    expect(screen.getByText('Início')).toBeInTheDocument();
  });
});
