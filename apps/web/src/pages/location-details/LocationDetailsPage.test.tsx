import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { forecastFixture } from '@/features/forecast/fixtures/forecast';
import { locationsFixture } from '@/features/locations/fixtures/locations';
import { saveTripPlan } from '@/features/diary/diaryStorage';
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
        current: authState.lockMarine ? 'Assinatura' : '0.70 m',
        range: '0.40–1.10 m',
        locked: authState.lockMarine,
        points: [
          { time: '05:00', value: 0.4 },
          { time: '07:00', value: 1.1 },
          { time: '12:00', value: 0.7 },
          { time: '17:00', value: 1.4 },
        ],
      },
      {
        key: 'swell',
        label: 'Swell',
        current: authState.lockMarine ? 'Assinatura' : '0,50 m',
        range: '0,40–0,60 m',
        locked: authState.lockMarine,
        points: [
          { time: '05:00', value: 0.4 },
          { time: '07:00', value: 0.6 },
          { time: '12:00', value: 0.5 },
        ],
      },
      {
        key: 'atmospheric-pressure',
        label: 'Pressão',
        current: authState.lockMarine ? 'Assinatura' : '1018 hPa',
        range: '1016–1020 hPa',
        detail: 'estável',
        locked: authState.lockMarine,
        points: [
          { time: '05:00', value: 1016 },
          { time: '07:00', value: 1014 },
          { time: '12:00', value: 1018 },
        ],
      },
    ],
    tide: {
      current: authState.lockMarine ? 'Assinatura' : '0.85 m',
      phase: 'Enchente',
      nextExtreme: 'Preamar 14:20 · 1.20 m',
      locked: authState.lockMarine,
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
      if (!forecast) return [];
      const metrics = authState.lockMarine
        ? forecast.metrics.map((metric) =>
            metric.key === 'waves' ||
            metric.key === 'wave-period' ||
            metric.key === 'swell' ||
            metric.key === 'water-temperature'
              ? { ...metric, value: 'Assinatura', locked: true }
              : metric,
          )
        : forecast.metrics;
      return [
        {
          date: day.date,
          label: day.label,
          shortLabel: day.shortLabel,
          forecast: {
            ...forecast,
            metrics,
            hourWindows: forecast.hourWindows.map((window, hourIndex) => {
              const pressure = authState.includeForecastPressure
                ? {
                    key: 'pressure' as const,
                    label: 'Pressão',
                    value: hourIndex === 0 ? '1018 hPa' : hourIndex === 1 ? '1016 hPa' : '1014 hPa',
                    detail: 'estável',
                  }
                : undefined;
              if (hourIndex === 0) {
                return { ...window, metrics, pressure };
              }
              return {
                ...window,
                score: hourIndex === 1 ? 7.2 : 5.4,
                classification: hourIndex === 1 ? 'very-good' : 'regular',
                pressure,
                metrics: metrics.map((metric) => {
                  if (metric.key === 'rain') {
                    return {
                      ...metric,
                      value: hourIndex === 1 ? '0,2 mm (45%)' : '1,4 mm (80%)',
                    };
                  }
                  if (metric.key === 'wind') {
                    return {
                      ...metric,
                      value: hourIndex === 1 ? '18 km/h Nordeste' : '22 km/h Sul',
                    };
                  }
                  if (metric.key === 'waves' && !metric.locked) {
                    return {
                      ...metric,
                      value: hourIndex === 1 ? '0,9 m' : '1,3 m',
                      detail: hourIndex === 1 ? 'Nordeste' : 'Sul',
                    };
                  }
                  if (metric.key === 'wave-period' && !metric.locked) {
                    return { ...metric, value: hourIndex === 1 ? '9 s' : '6 s' };
                  }
                  return metric;
                }),
              };
            }),
            ...(authState.includeForecastPressure
              ? {
                  pressure: {
                    key: 'pressure' as const,
                    label: 'Pressão',
                    value: '1018 hPa',
                    detail: 'estável',
                  },
                }
              : {}),
          },
        },
      ];
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

const { showSaveConfirmation } = vi.hoisted(() => ({
  showSaveConfirmation: vi.fn(),
}));

const authState = vi.hoisted(() => ({
  maxFavorites: 20,
  focus: null as string | null,
  showAppFocus: false,
  visibleMetrics: undefined as string[] | undefined,
  includeForecastPressure: true,
  lockMarine: false,
  canDiary: true,
  role: 'User' as 'User' | 'Admin',
  liveWebcams: false,
}));

vi.mock('@/app/layout/saveConfirmationEvents', () => ({ showSaveConfirmation }));

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: {
      id: 'user-1',
      name: 'Ana',
      email: 'ana@example.com',
      pictureUrl: null,
      role: authState.role,
      plan: {
        code: authState.maxFavorites > 0 ? 'premium' : 'free',
        name: authState.maxFavorites > 0 ? 'Mestre' : 'Free',
      },
      entitlements: {
        maxForecastDays: 8,
        maxFavorites: authState.maxFavorites,
        maxPersonalSpots: authState.maxFavorites > 0 ? 10 : 0,
        maxAlerts: 10,
      },
      modules: {
        marine: true,
        diary: authState.canDiary,
        offline: true,
        customMetrics: true,
        communityVote: true,
        rankingEmphasis: true,
        liveWebcams: authState.liveWebcams,
      },
      features: { showPartners: false, showAppFocus: authState.showAppFocus },
      preferences: {
        region: 'Florianópolis',
        windUnit: 'kmh',
        forecastNotifications: true,
        focus: authState.focus,
        visibleMetrics: authState.visibleMetrics,
      },
    },
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('@/features/webcam/services/webcamService', () => ({
  getSpotWebcam: () => Promise.resolve({ linked: false }),
  searchSpotWebcams: vi.fn(),
  lookupYouTubeWebcam: vi.fn(),
  linkSpotWebcam: vi.fn(),
  unlinkSpotWebcam: vi.fn(),
}));

vi.mock('@/features/locations/services/locationsService', () => ({
  getLocations: () => Promise.resolve(locationsFixture),
  setFavorite: () => Promise.resolve(),
  setEnabled: () => Promise.resolve(),
  createLocation: vi.fn(),
  updateLocation: vi.fn(),
  deleteLocation: vi.fn(),
  getPendingLocations: vi.fn(),
  approveLocation: vi.fn(),
  rejectLocation: vi.fn(),
}));

function renderLocation(path = '/locais/pantano_do_sul') {
  return renderWithProviders(
    <Routes>
      <Route path="/locais/:locationId" element={<LocationDetailsPage />} />
      <Route path="/premium" element={<p>Página de planos</p>} />
    </Routes>,
    [path],
  );
}

function visibleDaySlide() {
  const slide = screen
    .getByLabelText('Previsão por dia')
    .querySelector<HTMLElement>('[data-snap-key]:not([aria-hidden="true"])');
  expect(slide).not.toBeNull();
  return slide!;
}

describe('LocationDetailsPage', () => {
  beforeEach(() => {
    authState.maxFavorites = 20;
    authState.focus = null;
    authState.showAppFocus = false;
    authState.visibleMetrics = undefined;
    authState.includeForecastPressure = true;
    authState.lockMarine = false;
    authState.canDiary = true;
    authState.role = 'User';
    authState.liveWebcams = false;
    localStorage.clear();
    showSaveConfirmation.mockClear();
  });

  it('mostra estado amigável para local inexistente', async () => {
    renderLocation('/locais/nao-existe');
    expect(await screen.findByText('Local não encontrado')).toBeInTheDocument();
  });

  it('organiza recomendação, condições, maré, evolução e detalhes sem duplicar métricas', async () => {
    renderLocation();
    expect(await screen.findByLabelText('Previsão por dia')).toBeInTheDocument();
    const slide = within(visibleDaySlide());
    const recommendation = slide.getByRole('heading', { name: 'Melhores horários para pescar' });
    expect(recommendation).toBeInTheDocument();
    const card = recommendation.closest('section');
    expect(card).toBeTruthy();
    if (!card) return;
    expect(within(card).getByText('Hoje · 05/09')).toBeInTheDocument();
    expect(within(card).getByText('Excelente')).toBeInTheDocument();
    expect(slide.getByRole('group', { name: 'Horários recomendados' })).toBeInTheDocument();
    expect(slide.getByText('Entenda a nota')).toBeInTheDocument();
    expect(slide.queryByText(/^Selecionado$/)).not.toBeInTheDocument();
    expect(slide.queryByRole('heading', { name: /Condição às/ })).not.toBeInTheDocument();
    const conditions = slide
      .getByRole('heading', { name: 'Condições às 05h30' })
      .closest('section');
    expect(conditions).toBeTruthy();
    if (!conditions) return;
    expect(within(conditions).getByText('Vento')).toBeInTheDocument();
    expect(within(conditions).getByText('8%')).toBeInTheDocument();
    expect(within(conditions).getByText('Chuva')).toBeInTheDocument();
    expect(slide.getAllByText('Ondas')).toHaveLength(2);
    expect(slide.getAllByText('Temperatura')).toHaveLength(2);
    expect(slide.getByText('Pressão')).toBeInTheDocument();
    expect(slide.getByText('Atualização: não informada pela fonte.')).toBeInTheDocument();
    expect(slide.queryByText('Swell')).not.toBeInTheDocument();
    expect(slide.getByRole('heading', { name: 'Maré' })).toBeInTheDocument();
    expect(await slide.findByText('Enchente')).toBeInTheDocument();
    expect(slide.getByRole('img', { name: 'Altura da maré ao longo do dia' })).toBeInTheDocument();
    expect(slide.getByRole('heading', { name: 'Evolução das condições' })).toBeInTheDocument();
    expect(slide.getByText('Detalhes da previsão')).toBeInTheDocument();
  });

  it('atualiza métricas, maré e gráficos ao selecionar outra hora', async () => {
    const user = userEvent.setup();
    renderLocation();
    expect(await screen.findByLabelText('Previsão por dia')).toBeInTheDocument();
    const slide = within(visibleDaySlide());
    expect(await slide.findByText('8%')).toBeInTheDocument();
    expect(slide.getByText('1018 hPa')).toBeInTheDocument();
    expect(slide.getByLabelText('Nota 9,1 de 10, Excelente')).toBeInTheDocument();

    await user.click(slide.getByRole('button', { name: 'Ver condições das 07h' }));

    expect(await slide.findByText('Condições às 07h')).toBeInTheDocument();
    expect(slide.getByLabelText('Nota 7,2 de 10, Muito bom')).toBeInTheDocument();
    expect(slide.getByText('Muito bom')).toBeInTheDocument();
    expect(
      slide.getByRole('button', { name: 'Ver condições das 07h, selecionado' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(slide.getByText('45% chance')).toBeInTheDocument();
    expect(slide.getByText('1016 hPa')).toBeInTheDocument();
    expect(slide.getByText('0,9 m')).toBeInTheDocument();
    expect(slide.getByText('Nordeste')).toBeInTheDocument();
    expect(slide.getByText(/Período:/)).toHaveTextContent(/Período: 9 s/);
    expect(slide.getByText('Às 07h')).toBeInTheDocument();
    expect(slide.getByText(/Preamar · 14h20/)).toBeInTheDocument();
    expect(slide.getAllByText('seleção').length).toBeGreaterThan(0);
  });

  it('no foco surfista mostra condições do mar e esconde a nota de pesca', async () => {
    authState.focus = 'surfista';
    authState.showAppFocus = true;
    renderLocation();

    expect(await screen.findByRole('heading', { name: 'Maré' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Nota /)).not.toBeInTheDocument();
    const slide = within(visibleDaySlide());
    expect(slide.queryByText('Chuva')).not.toBeInTheDocument();
    expect(slide.getAllByText('Ondas').length).toBeGreaterThan(0);
    expect(slide.queryByText('Swell')).not.toBeInTheDocument();
    expect(screen.queryByText('Nenhum relato ativo')).not.toBeInTheDocument();
    expect(screen.queryByText('Enviar relato')).not.toBeInTheDocument();
  });

  it('mantém a pressão no painel quando ela vem do detalhe do mar', async () => {
    authState.includeForecastPressure = false;
    renderLocation();

    expect(await screen.findByLabelText('Previsão por dia')).toBeInTheDocument();
    expect(await within(visibleDaySlide()).findByText('Pressão')).toBeInTheDocument();
  });

  it('omite na apresentação o indicador desmarcado na conta', async () => {
    authState.focus = 'ambos';
    authState.showAppFocus = true;
    authState.visibleMetrics = ['wind', 'waves', 'rain'];
    renderLocation();

    expect(await screen.findByLabelText('Previsão por dia')).toBeInTheDocument();
    const slide = within(visibleDaySlide());
    expect((await slide.findAllByText('Ondas')).length).toBeGreaterThan(0);
    expect(slide.queryByText('Swell')).not.toBeInTheDocument();
    expect(slide.getByRole('heading', { name: 'Maré' })).toBeInTheDocument();
  });

  it('mantém o cadeado do mar no detalhe do local no plano Free', async () => {
    authState.maxFavorites = 0;
    authState.lockMarine = true;
    renderLocation();

    expect(await screen.findByLabelText('Previsão por dia')).toBeInTheDocument();
    const slide = within(visibleDaySlide());
    expect(await slide.findByLabelText('Ondas bloqueado no plano atual')).toBeInTheDocument();

    expect(await slide.findByLabelText('Maré bloqueada no plano atual')).toBeInTheDocument();
  });

  it('abre o drawer de planos ao favoritar sem cota', async () => {
    const user = userEvent.setup();
    authState.maxFavorites = 0;
    renderLocation();
    const favorite = await screen.findByRole('button', {
      name: 'Favoritar. Disponível na assinatura.',
    });
    expect(favorite).toBeEnabled();
    expect(favorite).toHaveTextContent('Favoritar');

    await user.click(favorite);
    const dialog = await screen.findByRole('dialog', { name: 'Ver os planos?' });
    expect(dialog).toHaveTextContent('Favoritar está na Assinatura.');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pântano do Sul' })).toBeInTheDocument();

    await user.click(favorite);
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Ver planos' }),
    );
    expect(await screen.findByText('Página de planos')).toBeInTheDocument();
  });

  it('Capitão dono não inclui câmera no próprio local', async () => {
    const location = locationsFixture.find((item) => item.id === 'pantano_do_sul');
    if (!location) throw new Error('fixture pantano_do_sul ausente');
    location.isOwner = true;
    location.visibility = 'private';
    authState.liveWebcams = true;
    try {
      renderLocation();
      expect(await screen.findByRole('heading', { name: 'Pântano do Sul' })).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Procurar câmera próxima' }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Incluir do YouTube' })).not.toBeInTheDocument();
      expect(screen.getByText('Sem câmera ao vivo neste local.')).toBeInTheDocument();
    } finally {
      location.isOwner = false;
      location.visibility = 'official';
    }
  });

  it('Admin inclui câmera em qualquer local', async () => {
    authState.role = 'Admin';
    renderLocation();
    expect(await screen.findByRole('heading', { name: 'Pântano do Sul' })).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Procurar câmera próxima' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Incluir do YouTube' })).toBeInTheDocument();
  });

  it('não mostra câmera nem convite no plano Free', async () => {
    const location = locationsFixture.find((item) => item.id === 'pantano_do_sul');
    if (!location) throw new Error('fixture pantano_do_sul ausente');
    location.hasLiveWebcam = true;
    authState.maxFavorites = 0;
    try {
      renderLocation();
      expect(await screen.findByRole('heading', { name: 'Pântano do Sul' })).toBeInTheDocument();
      expect(screen.queryByText('Recurso do plano Capitão')).not.toBeInTheDocument();
      expect(screen.queryByText('Câmera ao vivo')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Ver câmera ao vivo' })).not.toBeInTheDocument();
    } finally {
      location.hasLiveWebcam = false;
    }
  });

  it('mostra o selo Meu local quando o usuário é dono', async () => {
    const location = locationsFixture.find((item) => item.id === 'pantano_do_sul');
    if (!location) throw new Error('fixture pantano_do_sul ausente');
    location.isOwner = true;
    location.visibility = 'shared';

    try {
      renderLocation();

      expect(await screen.findByText('Meu local')).toBeInTheDocument();
      expect(screen.queryByText('Compartilhado')).not.toBeInTheDocument();
    } finally {
      location.isOwner = false;
      location.visibility = 'official';
    }
  });

  it('mostra o selo Compartilhado quando o local é da comunidade', async () => {
    const location = locationsFixture.find((item) => item.id === 'pantano_do_sul');
    if (!location) throw new Error('fixture pantano_do_sul ausente');
    location.visibility = 'shared';

    try {
      renderLocation();

      expect(await screen.findByText('Compartilhado')).toBeInTheDocument();
      expect(screen.queryByText('Meu local')).not.toBeInTheDocument();
    } finally {
      location.visibility = 'official';
    }
  });

  it('mostra o controle para usar o local nas previsões', async () => {
    renderLocation();
    const enabled = await screen.findByRole('button', { name: 'Nas previsões' });
    expect(enabled).toHaveAttribute('aria-pressed', 'true');
  });

  it('mostra as ações livres antes das travadas', async () => {
    authState.maxFavorites = 0;
    authState.canDiary = false;
    renderLocation();

    const toolbar = await screen.findByRole('toolbar', { name: 'Ações do local' });
    const actions = within(toolbar)
      .getAllByRole('button')
      .map((item) => item.textContent?.replace(/\s+/g, ' ').trim());

    expect(actions).toEqual(['Nas previsões', 'Planejar saída', 'Favoritar']);
  });

  it('permite trocar o dia arrastando o carrossel nos detalhes', async () => {
    renderLocation();
    expect(await screen.findByLabelText('Previsão por dia')).toBeInTheDocument();
    expect(within(visibleDaySlide()).getAllByText('05h30').length).toBeGreaterThan(0);

    const track = screen.getByLabelText('Previsão por dia');
    const slides = [...track.querySelectorAll<HTMLElement>('[data-snap-key]')];
    Object.defineProperty(track, 'clientWidth', { configurable: true, value: 320 });
    Object.defineProperty(track, 'scrollLeft', {
      configurable: true,
      writable: true,
      value: 320,
    });
    slides.forEach((day, index) => {
      Object.defineProperty(day, 'offsetLeft', { configurable: true, value: index * 320 });
      Object.defineProperty(day, 'offsetWidth', { configurable: true, value: 320 });
    });

    act(() => {
      track.dispatchEvent(new Event('scrollend'));
      track.dispatchEvent(new Event('scroll'));
    });

    await waitFor(() => {
      expect(within(visibleDaySlide()).getAllByText('16h30').length).toBeGreaterThan(0);
    });
  });

  it('confirma e planeja a saída com a melhor janela do dia selecionado', async () => {
    const user = userEvent.setup();
    renderLocation('/locais/pantano_do_sul?data=2026-09-06');

    await user.click(await screen.findByRole('button', { name: 'Planejar saída' }));

    expect(localStorage.getItem('tanomar.trip-plan.v1')).toBeNull();
    const dialog = await screen.findByRole('dialog', { name: 'Planejar esta saída?' });
    expect(dialog).toHaveTextContent('Pântano do Sul em 06/09, na melhor janela 16:30–19:00');
    await user.click(within(dialog).getByRole('button', { name: 'Planejar saída' }));

    expect(
      screen.getByText('Saída em 06/09 · 16:30–19:00. Guardada neste aparelho.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver no diário' })).toHaveAttribute('href', '/diario');
    expect(showSaveConfirmation).toHaveBeenCalledWith('Saída planejada.');
    expect(JSON.parse(localStorage.getItem('tanomar.trip-plan.v1') ?? '[]')).toEqual([
      expect.objectContaining({
        spotId: 'pantano_do_sul',
        spotName: 'Pântano do Sul',
        date: '2026-09-06',
        time: '16:30–19:00',
        notes: '',
      }),
    ]);
  });

  it('não grava o planejamento se a confirmação for cancelada', async () => {
    const user = userEvent.setup();
    renderLocation('/locais/pantano_do_sul?data=2026-09-06');

    await user.click(await screen.findByRole('button', { name: 'Planejar saída' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem('tanomar.trip-plan.v1')).toBeNull();
    expect(showSaveConfirmation).not.toHaveBeenCalled();
  });

  it('mostra a saída já planejada depois de reabrir o local', async () => {
    const user = userEvent.setup();
    saveTripPlan({
      spotId: 'pantano_do_sul',
      spotName: 'Pântano do Sul',
      date: '2026-09-06',
      time: '16:30–19:00',
      notes: '',
    });
    renderLocation('/locais/pantano_do_sul?data=2026-09-06');

    expect(
      await screen.findByText('Saída em 06/09 · 16:30–19:00. Guardada neste aparelho.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver no diário' })).toHaveAttribute('href', '/diario');

    await user.click(screen.getByRole('button', { name: 'Planejar saída' }));
    expect(await screen.findByRole('dialog', { name: 'Planejar esta saída?' })).toHaveTextContent(
      'Já existe um planejamento para Pântano do Sul em 06/09',
    );
  });

  it('abre o drawer de planos ao planejar saída sem o módulo de diário', async () => {
    const user = userEvent.setup();
    authState.canDiary = false;
    saveTripPlan({
      spotId: 'pantano_do_sul',
      spotName: 'Pântano do Sul',
      date: '2026-09-06',
      time: '16:30–19:00',
      notes: '',
    });
    renderLocation('/locais/pantano_do_sul?data=2026-09-06');

    const plan = await screen.findByRole('button', {
      name: 'Planejar saída. Disponível na assinatura.',
    });
    expect(plan).toBeEnabled();
    expect(plan).toHaveTextContent('Planejar saída');
    expect(screen.queryByRole('link', { name: 'Ver no diário' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Guardada neste aparelho/)).not.toBeInTheDocument();

    await user.click(plan);
    const dialog = await screen.findByRole('dialog', { name: 'Ver os planos?' });
    expect(dialog).toHaveTextContent('Planejar saída está na Assinatura.');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem('tanomar.trip-plan.v1')).not.toBeNull();

    await user.click(plan);
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Ver planos' }),
    );
    expect(await screen.findByText('Página de planos')).toBeInTheDocument();
  });
});
