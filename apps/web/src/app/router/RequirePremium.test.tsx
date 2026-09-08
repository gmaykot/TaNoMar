import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { RequirePremium } from './RequirePremium';

const { authState } = vi.hoisted(() => ({
  authState: {
    status: 'authenticated',
    user: null as { plan: { code: string } } | null,
    userLoading: false,
  },
}));

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => authState,
}));

function renderRoute() {
  return renderWithProviders(
    <Routes>
      <Route element={<RequirePremium />}>
        <Route path="/diario" element={<div>diário</div>} />
      </Route>
      <Route path="/premium" element={<div>premium</div>} />
    </Routes>,
    ['/diario'],
  );
}

describe('RequirePremium', () => {
  beforeEach(() => {
    authState.user = null;
  });

  it('redireciona o plano Free para a página Premium', () => {
    renderRoute();

    expect(screen.getByText('premium')).toBeInTheDocument();
    expect(screen.queryByText('diário')).not.toBeInTheDocument();
  });

  it('libera o Diário para o plano Premium', () => {
    authState.user = { plan: { code: 'premium' } };

    renderRoute();

    expect(screen.getByText('diário')).toBeInTheDocument();
    expect(screen.queryByText('premium')).not.toBeInTheDocument();
  });

  it('libera o Diário para Arrais e Capitão', () => {
    authState.user = { plan: { code: 'arrais' } };
    renderRoute();
    expect(screen.getByText('diário')).toBeInTheDocument();
  });
});
