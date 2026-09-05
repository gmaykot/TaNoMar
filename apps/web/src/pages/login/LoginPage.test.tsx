import { afterEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { screen } from '@testing-library/react';
import { AuthSessionProvider } from '@/features/auth/providers/AuthSessionProvider';
import { RequireAuth } from '@/app/router/RequireAuth';
import { LoginPage } from '@/pages/login/LoginPage';
import { renderWithProviders } from '@/test/renderWithProviders';

function jsonResponse(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('login e guard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('mostra a tela de entrada', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401)));
    renderWithProviders(
      <AuthSessionProvider>
        <LoginPage />
      </AuthSessionProvider>,
      ['/entrar'],
    );
    expect(
      await screen.findByRole('heading', { name: 'Entre para ver o mar de hoje.' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('status') ?? screen.getByRole('group', { name: 'Entrar com Google' }),
    ).toBeTruthy();
  });

  it('redireciona rotas protegidas para o login', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401)));
    renderWithProviders(
      <AuthSessionProvider>
        <Routes>
          <Route path="/entrar" element={<p>Tela de login</p>} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<p>Área logada</p>} />
          </Route>
        </Routes>
      </AuthSessionProvider>,
      ['/'],
    );
    expect(await screen.findByText('Tela de login')).toBeInTheDocument();
  });
});
