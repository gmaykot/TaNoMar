import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { forecastFixture } from '@/features/forecast/fixtures/forecast';
import { renderWithProviders } from '@/test/renderWithProviders';
import { HomePage } from './HomePage';

const { authState } = vi.hoisted(() => ({
  authState: {
    planCode: 'premium' as 'free' | 'premium',
    showPartners: false,
    visibleMetrics: undefined as string[] | undefined,
  },
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
      plan: {
        code: authState.planCode,
        name: authState.planCode === 'premium' ? 'Premium' : 'Free',
      },
      entitlements: {
        maxForecastDays: 8,
        maxFavorites: 20,
        maxPersonalSpots: 10,
        maxAlerts: 10,
      },
      features: { showPartners: authState.showPartners },
      preferences: {
        region: 'Florianópolis',
        windUnit: 'kmh',
        forecastNotifications: true,
        visibleMetrics: authState.visibleMetrics,
      },
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
    authState.planCode = 'premium';
    authState.showPartners = false;
    authState.visibleMetrics = undefined;
  });

  it('mostra o convite do Premium somente para o plano Free', async () => {
    authState.planCode = 'free';
    renderWithProviders(<HomePage />);

    expect(
      await screen.findByRole('link', { name: /Pesque com mais contexto no Premium/ }),
    ).toHaveAttribute('href', '/premium');
  });

  it('não mostra o convite do Premium para quem já é Premium', async () => {
    renderWithProviders(<HomePage />);

    await screen.findByRole('heading', { name: 'Pântano do Sul' });
    expect(
      screen.queryByRole('link', { name: /Pesque com mais contexto no Premium/ }),
    ).not.toBeInTheDocument();
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

  it('mostra somente os indicadores escolhidos pelo usuário Premium', async () => {
    authState.visibleMetrics = ['rain'];
    renderWithProviders(<HomePage />);

    const heading = await screen.findByRole('heading', { name: 'Pântano do Sul' });
    const hero = heading.closest('article');
    expect(hero).toBeTruthy();
    if (!hero) return;
    expect(within(hero).getByText('Chuva')).toBeInTheDocument();
    expect(within(hero).queryByText('Vento')).not.toBeInTheDocument();
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
    expect(
      partners.compareDocumentPosition(explore) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      ranking.compareDocumentPosition(partners) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('marca o local pessoal com o selo Meu local no ranking do dia', async () => {
    renderWithProviders(<HomePage />);

    expect(await screen.findByRole('heading', { name: 'Molhe da Barra' })).toBeInTheDocument();
    expect(screen.getByText('Meu local')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pântano do Sul' })).toBeInTheDocument();
    expect(screen.getAllByText('Meu local')).toHaveLength(1);
  });

  it('omite a área de parceiros quando a vitrine está desligada', async () => {
    renderWithProviders(<HomePage />);
    expect(await screen.findByRole('heading', { name: 'Pântano do Sul' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Parceiros' })).not.toBeInTheDocument();
  });
});
