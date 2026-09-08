import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { forecastFixture } from '@/features/forecast/fixtures/forecast';
import { renderWithProviders } from '@/test/renderWithProviders';
import { HomePage } from './HomePage';

const { authState, forecastState } = vi.hoisted(() => ({
  authState: {
    planCode: 'premium' as 'free' | 'premium',
    showPartners: false,
    visibleMetrics: undefined as string[] | undefined,
    focus: null as string | null,
    showAppFocus: false,
  },
  forecastState: { error: false },
}));

vi.mock('@/features/forecast/services/forecastService', () => ({
  getForecast: () =>
    forecastState.error ? Promise.reject(new Error('offline')) : Promise.resolve(forecastFixture),
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
        name: authState.planCode === 'premium' ? 'Mestre' : 'Free',
      },
      entitlements: {
        maxForecastDays: 8,
        maxFavorites: 20,
        maxPersonalSpots: 10,
        maxAlerts: 10,
      },
      features: { showPartners: authState.showPartners, showAppFocus: authState.showAppFocus },
      preferences: {
        region: 'Florianópolis',
        windUnit: 'kmh',
        forecastNotifications: true,
        visibleMetrics: authState.visibleMetrics,
        focus: authState.focus,
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
    authState.focus = null;
    authState.showAppFocus = false;
    forecastState.error = false;
    localStorage.removeItem('tanomar.offline-forecast.v1');
  });

  it('mostra o convite da assinatura somente para o plano Free', async () => {
    authState.planCode = 'free';
    renderWithProviders(<HomePage />);

    expect(
      await screen.findByRole('link', { name: /Pesque com mais contexto na assinatura/ }),
    ).toHaveAttribute('href', '/premium');
  });

  it('não mostra o convite da assinatura para quem já é assinante', async () => {
    renderWithProviders(<HomePage />);

    await screen.findByRole('heading', { name: 'Pântano do Sul' });
    expect(
      screen.queryByRole('link', { name: /Pesque com mais contexto na assinatura/ }),
    ).not.toBeInTheDocument();
  });

  it('oferece salvar a previsão offline somente para o Premium', async () => {
    renderWithProviders(<HomePage />);

    await screen.findByRole('heading', { name: 'Pântano do Sul' });
    expect(screen.getByRole('button', { name: /Salvar para usar offline/ })).toBeInTheDocument();
  });

  it('não oferece salvar a previsão offline para o plano Free', async () => {
    authState.planCode = 'free';
    renderWithProviders(<HomePage />);

    await screen.findByRole('heading', { name: 'Pântano do Sul' });
    expect(
      screen.queryByRole('button', { name: /Salvar para usar offline/ }),
    ).not.toBeInTheDocument();
  });

  it('usa a previsão salva offline para o Premium quando a API falha', async () => {
    forecastState.error = true;
    localStorage.setItem(
      'tanomar.offline-forecast.v1',
      JSON.stringify({ forecast: forecastFixture }),
    );
    renderWithProviders(<HomePage />);

    expect(await screen.findByRole('heading', { name: 'Pântano do Sul' })).toBeInTheDocument();
  });

  it('não usa a previsão salva offline para o plano Free quando a API falha', async () => {
    authState.planCode = 'free';
    forecastState.error = true;
    localStorage.setItem(
      'tanomar.offline-forecast.v1',
      JSON.stringify({ forecast: forecastFixture }),
    );
    renderWithProviders(<HomePage />);

    expect(await screen.findByText('Previsão indisponível')).toBeInTheDocument();
  });

  it('troca a melhor escolha quando a data muda', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);

    expect(await screen.findByRole('heading', { name: 'Pântano do Sul' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Amanhã/ }));
    expect(screen.getByRole('heading', { name: 'Armação' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Onde vale pescar?' })).toBeInTheDocument();
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

  it('mostra condições e as notas dos melhores horários sem sugerir evolução diária', async () => {
    renderWithProviders(<HomePage />);

    const hero = (await screen.findByRole('heading', { name: 'Pântano do Sul' })).closest(
      'article',
    );
    expect(hero).toBeTruthy();
    if (!hero) return;
    expect(within(hero).getByText('Condições às 05h30')).toBeInTheDocument();
    expect(within(hero).getByText(/Rajadas/)).toBeInTheDocument();
    expect(within(hero).getByText('Ondas')).toBeInTheDocument();
    expect(within(hero).getByText(/Período:/)).toBeInTheDocument();
    expect(within(hero).getByText('Chuva')).toBeInTheDocument();
    expect(
      within(hero).getByRole('region', { name: 'Notas dos melhores horários' }),
    ).toBeInTheDocument();
    expect(within(hero).queryByRole('img', { name: /Evolução das notas/ })).not.toBeInTheDocument();
    expect(within(hero).getAllByText('05h30')).toHaveLength(2);
    expect(within(hero).getAllByText('9,1')).toHaveLength(2);
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
    expect(screen.queryByText('Compartilhado')).not.toBeInTheDocument();
  });

  it('no foco surfista esconde a nota e prioriza o mar', async () => {
    authState.focus = 'surfista';
    authState.showAppFocus = true;
    renderWithProviders(<HomePage />);

    const heading = await screen.findByRole('heading', { name: 'Como está o mar hoje?' });
    expect(heading).toBeInTheDocument();
    const hero = (await screen.findByRole('heading', { name: 'Pântano do Sul' })).closest(
      'article',
    );
    expect(hero).toBeTruthy();
    if (!hero) return;
    expect(within(hero).queryByLabelText(/Nota /)).not.toBeInTheDocument();
    expect(within(hero).queryByText('Chuva')).not.toBeInTheDocument();
    expect(within(hero).getByText('Swell')).toBeInTheDocument();
  });

  it('omite a área de parceiros quando a vitrine está desligada', async () => {
    renderWithProviders(<HomePage />);
    expect(await screen.findByRole('heading', { name: 'Pântano do Sul' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Parceiros' })).not.toBeInTheDocument();
  });
});
