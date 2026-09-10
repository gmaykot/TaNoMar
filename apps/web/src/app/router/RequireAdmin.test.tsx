import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { RequireAdmin } from './RequireAdmin';

const { authState } = vi.hoisted(() => ({
  authState: {
    status: 'authenticated' as 'authenticated' | 'booting',
    user: null as { role: string } | null,
    userLoading: false,
  },
}));

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => authState,
}));

function renderAdminRoute() {
  return renderWithProviders(
    <Routes>
      <Route element={<RequireAdmin />}>
        <Route path="/admin/locais-sistema" element={<div>locais do sistema</div>} />
      </Route>
      <Route path="/conta" element={<div>conta</div>} />
    </Routes>,
    ['/admin/locais-sistema'],
  );
}

describe('RequireAdmin', () => {
  beforeEach(() => {
    authState.status = 'authenticated';
    authState.user = { role: 'User' };
    authState.userLoading = false;
  });

  it('não deixa o usuário comum abrir a administração de locais', () => {
    renderAdminRoute();

    expect(screen.getByText('conta')).toBeInTheDocument();
    expect(screen.queryByText('locais do sistema')).not.toBeInTheDocument();
  });

  it('libera a administração para o admin', () => {
    authState.user = { role: 'Admin' };
    renderAdminRoute();

    expect(screen.getByText('locais do sistema')).toBeInTheDocument();
    expect(screen.queryByText('conta')).not.toBeInTheDocument();
  });
});
