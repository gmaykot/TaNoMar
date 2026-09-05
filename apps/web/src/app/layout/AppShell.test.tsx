import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AppShell } from './AppShell';

vi.mock('@/app/hooks/usePwaLifecycle', () => ({
  usePwaLifecycle: () => ({
    online: true,
    canInstall: false,
    install: vi.fn(),
    showIosInstall: false,
    dismissIosInstall: vi.fn(),
    needRefresh: false,
    dismissRefresh: vi.fn(),
    update: vi.fn(),
  }),
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
      preferences: { region: 'Florianópolis', windUnit: 'kmh', forecastNotifications: true },
    },
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('@/features/notifications/components/NotificationInbox', () => ({
  NotificationInbox: () => null,
}));

vi.mock('@/features/auth/components/UserMenu', () => ({
  UserMenu: () => null,
}));

function renderShell(initialEntries = ['/']) {
  return renderWithProviders(
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<div>Início</div>} />
        <Route path="/ranking" element={<div>Ranking</div>} />
        <Route path="/locais" element={<div>Locais</div>} />
        <Route path="/conta" element={<div>Conta</div>} />
      </Route>
    </Routes>,
    initialEntries,
  );
}

function footerNav() {
  const navigations = screen.getAllByRole('navigation', { name: 'Navegação principal' });
  return navigations[navigations.length - 1];
}

describe('AppShell', () => {
  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('volta ao topo ao abrir outra página pelo menu inferior', async () => {
    const user = userEvent.setup();
    renderShell(['/']);
    vi.mocked(window.scrollTo).mockClear();

    await user.click(within(footerNav()).getByRole('link', { name: 'Ranking' }));

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
    expect(screen.getByRole('main')).toHaveTextContent('Ranking');
  });

  it('volta ao topo ao tocar de novo o item ativo do menu inferior', async () => {
    const user = userEvent.setup();
    renderShell(['/ranking']);
    vi.mocked(window.scrollTo).mockClear();

    await user.click(within(footerNav()).getByRole('link', { name: 'Ranking' }));

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
  });
});
