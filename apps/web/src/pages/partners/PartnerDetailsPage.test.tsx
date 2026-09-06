import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { PartnerDetailsPage } from './PartnerDetailsPage';

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
  usePartner: (_slug: string, enabled: boolean) =>
    enabled
      ? {
          isPending: false,
          isError: false,
          data: {
            id: 'pesca-campeche',
            slug: 'pesca-campeche',
            name: 'Pesca Campeche',
            category: 'guia',
            tagline: 'Saídas no sul da ilha',
            about: 'Leva quem quer pescar no Campeche.',
            city: 'Florianópolis',
            whatsApp: '5548999999999',
            instagram: 'pescacampeche',
            website: 'https://pesca.example',
            mapsUrl: null,
            coverImageUrl: null,
            isFeatured: true,
            offers: [
              {
                title: 'Pesca marítima',
                description: 'Saída de manhã',
                priceLabel: 'R$ 150 por pessoa',
                endsAt: null,
              },
            ],
          },
        }
      : { isPending: false, isError: false, data: undefined },
}));

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/parceiros/:partnerSlug" element={<PartnerDetailsPage />} />
      <Route path="/" element={<p>Início</p>} />
    </Routes>,
    ['/parceiros/pesca-campeche'],
  );
}

describe('PartnerDetailsPage', () => {
  it('mostra hero, oferta e o WhatsApp como ação principal', () => {
    authState.showPartners = true;
    renderPage();
    expect(screen.getByRole('heading', { name: 'Pesca Campeche' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'O que oferece' })).toBeInTheDocument();
    expect(screen.getByText('Pesca marítima')).toBeInTheDocument();
    expect(screen.getByText('R$ 150 por pessoa')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Falar no WhatsApp' })).toHaveAttribute(
      'href',
      'https://wa.me/5548999999999?text=Vi%20voc%C3%AAs%20no%20T%C3%A1NoMar.',
    );
    expect(screen.getByRole('link', { name: 'Instagram' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Falar com o parceiro' })).not.toBeInTheDocument();
  });

  it('volta para o início quando a vitrine está desligada', () => {
    authState.showPartners = false;
    renderPage();
    expect(screen.getByText('Início')).toBeInTheDocument();
  });
});
