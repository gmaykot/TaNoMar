import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { LandingPage } from './LandingPage';

const { install, pwaState } = vi.hoisted(() => ({
  install: vi.fn(),
  pwaState: { canInstall: false },
}));

vi.mock('@/app/hooks/usePwaLifecycle', () => ({
  usePwaLifecycle: () => ({
    online: true,
    canInstall: pwaState.canInstall,
    install,
    showIosInstall: false,
    dismissIosInstall: vi.fn(),
    needRefresh: false,
    dismissRefresh: vi.fn(),
    update: vi.fn(),
  }),
}));

vi.mock('@/features/subscription/hooks/useSubscriptionPlans', () => ({
  useSubscriptionPlans: () => ({
    isPending: false,
    isError: false,
    data: [
      {
        code: 'free',
        name: 'Free',
        tagline: 'Consulta o mapa TáNoMar.',
        monthlyPriceCents: 0,
        featured: false,
        enabled: true,
        sortOrder: 0,
        activeUserCount: 0,
        entitlements: {
          maxForecastDays: 3,
          maxFavorites: 0,
          maxPersonalSpots: 0,
          maxAlerts: 0,
        },
        modules: {
          marine: false,
          diary: false,
          offline: false,
          customMetrics: false,
          communityVote: false,
          rankingEmphasis: false,
          liveWebcams: false,
        },
      },
      {
        code: 'premium',
        name: 'Mestre',
        tagline: 'O equilíbrio para planejar a semana.',
        monthlyPriceCents: 1990,
        featured: true,
        enabled: true,
        sortOrder: 2,
        activeUserCount: 0,
        entitlements: {
          maxForecastDays: 8,
          maxFavorites: 20,
          maxPersonalSpots: 10,
          maxAlerts: 10,
        },
        modules: {
          marine: true,
          diary: true,
          offline: true,
          customMetrics: true,
          communityVote: true,
          rankingEmphasis: true,
          liveWebcams: false,
        },
      },
    ],
  }),
}));

describe('LandingPage', () => {
  afterEach(() => {
    window.location.hash = '';
  });

  it('apresenta o produto e usa o catálogo configurado', () => {
    pwaState.canInstall = false;
    renderWithProviders(<LandingPage />);

    expect(
      screen.getByRole('heading', { name: 'Entenda o mar antes de sair para pescar.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('banner').querySelector('img')?.getAttribute('src')).toContain(
      'tanomar-horizontal-slogan',
    );
    expect(screen.getAllByText(/Grande Florianópolis/).length).toBeGreaterThan(0);
    expect(screen.getByText('Entre com Google. O Free não pede cartão.')).toBeInTheDocument();
    expect(screen.getByText('Demonstração da Home com dados ilustrativos')).toBeInTheDocument();
    expect(screen.getByText('Demonstração do ranking com dados ilustrativos')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'O ranking coloca nota, melhores horários e condições lado a lado.',
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('R$ 19,90').length).toBeGreaterThan(0);
    expect(screen.getByText('No anual, R$ 191,04 com 20% de desconto')).toBeInTheDocument();
    expect(screen.getAllByText('O Free não tem prazo de teste', { exact: false })).not.toHaveLength(
      0,
    );
    expect(
      screen.getByText('Mapa, ranking e até 3 dias de previsão', { exact: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Ordene o ranking por vento, chuva ou ondas sem mudar a nota'),
    ).toBeInTheDocument();
    expect(screen.getByText('Recomendado')).toBeInTheDocument();
    expect(screen.queryByText('Mais escolhido')).not.toBeInTheDocument();
    expect(screen.queryByText('calculada pela API', { exact: false })).not.toBeInTheDocument();
    screen.getAllByRole('link', { name: 'Começar grátis' }).forEach((link) => {
      expect(link).toHaveAttribute('href', '/entrar');
    });
    expect(screen.queryByRole('button', { name: 'Instalar agora' })).not.toBeInTheDocument();
  });

  it('compara o Free com os planos pagos e oferece o atalho no menu do celular', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LandingPage />);

    expect(screen.queryByRole('table', { name: 'Comparação dos planos' })).not.toBeInTheDocument();
    await user.click(screen.getByText('Comparar os planos'));
    const comparison = screen.getByRole('table', { name: 'Comparação dos planos' });
    expect(within(comparison).getByRole('columnheader', { name: 'Free' })).toBeInTheDocument();
    expect(within(comparison).getByText('Grátis')).toBeInTheDocument();
    expect(within(comparison).getByRole('columnheader', { name: 'Mestre' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
    const menu = screen.getByRole('navigation', { name: 'Navegação da apresentação no celular' });
    expect(within(menu).getByRole('link', { name: 'Comparar planos' })).toHaveAttribute(
      'href',
      '#comparacao-planos',
    );
  });

  it('explica a nota, a cobertura e as regras essenciais antes da assinatura', () => {
    renderWithProviders(<LandingPage />);

    expect(
      screen.getByRole('heading', { name: 'Uma comparação objetiva das condições previstas.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Espécie e modalidade de pesca não entram no cálculo.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Locais oficiais da Grande Florianópolis.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Ranking e melhores horários' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Vento ideal e previsão offline' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Quais locais estão disponíveis?')).toBeInTheDocument();
    expect(screen.getByText('Como entro?')).toBeInTheDocument();
    expect(screen.getByText('Posso usar um local que não está na lista?')).toBeInTheDocument();
    expect(screen.getByText('O que é o vento ideal?')).toBeInTheDocument();
    expect(screen.getByText('Funciona sem internet?')).toBeInTheDocument();
    expect(screen.getByText('Qual a diferença entre Arrais e Mestre?')).toBeInTheDocument();
    expect(screen.getByText('Como funcionam os alertas?')).toBeInTheDocument();
    expect(screen.getByText('Onde há câmeras ao vivo?')).toBeInTheDocument();
    expect(screen.getByText(/não garante manutenção nem disponibilidade/)).toBeInTheDocument();
    expect(screen.getByText('Posso cancelar a assinatura?')).toBeInTheDocument();
    expect(
      screen.getByText(/abra Gerenciar assinatura e toque em Cancelar renovação/),
    ).toBeInTheDocument();
  });

  it('abre instruções acessíveis e mantém todas as plataformas disponíveis', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LandingPage />);

    await user.click(screen.getByRole('button', { name: 'Como instalar o TáNoMar' }));
    expect(screen.getByRole('dialog', { name: 'Instale no seu dispositivo' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'iPhone/iPad · Safari' }));
    expect(screen.getByText('Selecione “Adicionar à Tela de Início”.')).toBeInTheDocument();
  });

  it('oferece a instalação real somente quando o navegador permite', async () => {
    const user = userEvent.setup();
    pwaState.canInstall = true;
    install.mockClear();
    renderWithProviders(<LandingPage />);

    await user.click(screen.getByRole('button', { name: 'Instalar agora' }));
    expect(install).toHaveBeenCalledOnce();
  });
});
