import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
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
  it('apresenta o produto e usa o catálogo configurado', () => {
    pwaState.canInstall = false;
    renderWithProviders(<LandingPage />);

    expect(
      screen.getByRole('heading', { name: 'Entenda o mar antes de sair para pescar.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('banner').querySelector('img')?.getAttribute('src')).toContain(
      'tanomar-horizontal-slogan',
    );
    expect(screen.getAllByText('Enchente').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Preamar').length).toBeGreaterThan(0);
    expect(
      screen.getByRole('heading', { name: 'Veja a condição, entenda o contexto e compare.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Joaquina')).toBeInTheDocument();
    expect(screen.getByText('Campeche')).toBeInTheDocument();
    expect(screen.getByText('R$ 19,90')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Acessar o TáNoMar' })).not.toHaveLength(0);
    screen.getAllByRole('link', { name: 'Acessar o TáNoMar' }).forEach((link) => {
      expect(link).toHaveAttribute('href', '/entrar');
    });
    expect(screen.queryByRole('button', { name: 'Instalar agora' })).not.toBeInTheDocument();
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
