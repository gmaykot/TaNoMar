import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { forecastFixture } from '@/features/forecast/fixtures/forecast';
import { renderWithProviders } from '@/test/renderWithProviders';
import { HomePage } from './HomePage';

const { authState } = vi.hoisted(() => ({
  authState: { showPartners: false },
}));

vi.mock('@/features/forecast/services/forecastService', () => ({
  getForecast: () => Promise.resolve(forecastFixture),
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
            {
              id: 'guia-sul',
              slug: 'guia-sul',
              name: 'Guia do Sul',
              category: 'guia',
              tagline: null,
              about: null,
              city: 'Florianópolis',
              whatsApp: null,
              instagram: 'guiadosul',
              website: null,
              mapsUrl: null,
              coverImageUrl: null,
              isFeatured: false,
              offers: [],
            },
          ],
        }
      : { isPending: false, isError: false, data: undefined },
}));

describe('HomePage', () => {
  beforeEach(() => {
    authState.showPartners = false;
  });

  it('troca a melhor escolha quando a data muda', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);

    expect(await screen.findByRole('heading', { name: 'Pântano do Sul' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Amanhã/ }));
    expect(screen.getByRole('heading', { name: 'Armação' })).toBeInTheDocument();
  });

  it('expõe a previsão do dia como carrossel', async () => {
    renderWithProviders(<HomePage />);

    expect(await screen.findByRole('heading', { name: 'Pântano do Sul' })).toBeInTheDocument();
    expect(screen.getByLabelText('Previsão por dia')).toHaveAttribute(
      'aria-roledescription',
      'carrossel',
    );
    expect(screen.getByRole('button', { name: /Hoje/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Amanhã/ })).toBeInTheDocument();
  });

  it('troca o dia ao arrastar o carrossel', async () => {
    renderWithProviders(<HomePage />);
    expect(await screen.findByRole('heading', { name: 'Pântano do Sul' })).toBeInTheDocument();

    const track = screen.getByLabelText('Previsão por dia');
    const slides = [...track.querySelectorAll<HTMLElement>('[data-snap-key]')];
    Object.defineProperty(track, 'clientWidth', { configurable: true, value: 320 });
    Object.defineProperty(track, 'scrollLeft', { configurable: true, writable: true, value: 320 });
    slides.forEach((slide, index) => {
      Object.defineProperty(slide, 'offsetLeft', { configurable: true, value: index * 320 });
      Object.defineProperty(slide, 'offsetWidth', { configurable: true, value: 320 });
    });

    track.dispatchEvent(new Event('scrollend'));
    track.dispatchEvent(new Event('scroll'));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Armação' })).toBeInTheDocument();
    });
  });

  it('mostra parceiros em destaque entre o ranking e os locais', async () => {
    authState.showPartners = true;
    renderWithProviders(<HomePage />);

    expect(await screen.findByRole('heading', { name: 'Parceiros' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver Loja do Mar' })).toHaveAttribute(
      'href',
      '/parceiros/loja-do-mar',
    );
    expect(screen.queryByRole('heading', { name: 'Guia do Sul' })).not.toBeInTheDocument();

    const partners = screen.getByRole('heading', { name: 'Parceiros' }).closest('section');
    const explore = screen.getByRole('link', { name: /Explore todos os locais/ });
    const ranking = screen.getByRole('heading', { name: 'Ranking do dia' }).closest('section');
    expect(partners).toBeTruthy();
    expect(ranking).toBeTruthy();
    expect(partners && ranking).toBeTruthy();
    if (!partners || !ranking) return;
    expect(partners.compareDocumentPosition(explore) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(ranking.compareDocumentPosition(partners) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('omite a área de parceiros quando a vitrine está desligada', async () => {
    renderWithProviders(<HomePage />);
    expect(await screen.findByRole('heading', { name: 'Pântano do Sul' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Parceiros' })).not.toBeInTheDocument();
  });
});
