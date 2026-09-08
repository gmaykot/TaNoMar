import { describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { RequireFocus } from './RequireFocus';

const authState = vi.hoisted(() => ({
  focus: null as string | null,
  userLoading: false,
}));

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    status: 'authenticated',
    userLoading: authState.userLoading,
    user: {
      id: 'user-1',
      name: 'Ana',
      email: 'ana@example.com',
      pictureUrl: null,
      role: 'User',
      plan: { code: 'free', name: 'Free' },
      entitlements: {
        maxForecastDays: 3,
        maxFavorites: 0,
        maxPersonalSpots: 0,
        maxAlerts: 0,
      },
      features: { showPartners: false },
      preferences: {
        region: 'Florianópolis',
        windUnit: 'kmh',
        forecastNotifications: true,
        focus: authState.focus,
      },
    },
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
  }),
}));

function renderGuard() {
  return renderWithProviders(
    <Routes>
      <Route path="/comecar" element={<p>Escolha o foco</p>} />
      <Route element={<RequireFocus />}>
        <Route path="/" element={<p>Área com foco</p>} />
      </Route>
    </Routes>,
    ['/'],
  );
}

describe('RequireFocus', () => {
  it('envia quem ainda não escolheu o foco para o primeiro acesso', () => {
    authState.focus = null;
    authState.userLoading = false;
    renderGuard();
    expect(screen.getByText('Escolha o foco')).toBeInTheDocument();
  });

  it('libera o aplicativo depois da escolha', () => {
    authState.focus = 'pescador';
    authState.userLoading = false;
    renderGuard();
    expect(screen.getByText('Área com foco')).toBeInTheDocument();
  });
});
