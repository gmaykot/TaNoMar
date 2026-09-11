import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthSessionProvider } from '@/features/auth/providers/AuthSessionProvider';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { offlineAuthUser } from '@/features/auth/fixtures/user';
import { saveOfflineUser } from '@/features/auth/utils/offlineSession';
import { saveOfflineForecast } from '@/features/forecast/utils/offlineForecast';
import { forecastFixture } from '@/features/forecast/fixtures/forecast';
import { RequireAuth } from '@/app/router/RequireAuth';
import { renderWithProviders } from '@/test/renderWithProviders';
import { resetApiClientState } from '@/shared/api/client';
import { resetApiSession } from '@/shared/api/session';

const { disableDevicePush } = vi.hoisted(() => ({
  disableDevicePush: vi.fn<() => Promise<void>>(),
}));

vi.mock('@/features/notifications/services/devicePushService', () => ({ disableDevicePush }));

function jsonResponse(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function renderSession(path: string) {
  return renderWithProviders(
    <AuthSessionProvider>
      <Routes>
        <Route path="/entrar" element={<p>Tela de login</p>} />
        <Route element={<RequireAuth />}>
          <Route path="/app" element={<LoggedArea />} />
        </Route>
      </Routes>
    </AuthSessionProvider>,
    [path],
  );
}

function LoggedArea() {
  const auth = useAuth();
  return (
    <div>
      <p>Área logada</p>
      <p>{auth.user?.name}</p>
      <button type="button" onClick={() => void auth.logout()}>
        Sair
      </button>
    </div>
  );
}

describe('AuthSessionProvider offline', () => {
  beforeEach(() => {
    disableDevicePush.mockResolvedValue();
  });

  afterEach(() => {
    localStorage.clear();
    resetApiSession();
    resetApiClientState();
    vi.unstubAllGlobals();
  });

  it('não fica preso no boot quando o refresh falha por rede', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    renderSession('/app');

    expect(await screen.findByText('Tela de login')).toBeInTheDocument();
    expect(screen.queryByText('Abrindo sua sessão')).not.toBeInTheDocument();
  });

  it('entra no aplicativo com a previsão salva quando o refresh falha por rede', async () => {
    saveOfflineUser(offlineAuthUser);
    saveOfflineForecast(forecastFixture);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    renderSession('/app');

    expect(await screen.findByText('Área logada')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
  });

  it('não restaura a sessão offline sem previsão salva', async () => {
    saveOfflineUser(offlineAuthUser);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    renderSession('/app');

    expect(await screen.findByText('Tela de login')).toBeInTheDocument();
  });

  it('limpa o snapshot e a previsão no logout', async () => {
    saveOfflineUser(offlineAuthUser);
    saveOfflineForecast(forecastFixture);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/auth/refresh')) {
          return Promise.resolve(jsonResponse(200, { accessToken: 'token' }));
        }
        if (url.includes('/me')) {
          return Promise.resolve(jsonResponse(200, offlineAuthUser));
        }
        if (url.includes('/auth/logout')) {
          return Promise.resolve(jsonResponse(204));
        }
        return Promise.resolve(jsonResponse(200, {}));
      }),
    );

    renderSession('/app');
    expect(await screen.findByText('Área logada')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(await screen.findByText('Tela de login')).toBeInTheDocument();
    expect(localStorage.getItem('tanomar.offline-session.v1')).toBeNull();
    expect(localStorage.getItem('tanomar.offline-forecast.v1')).toBeNull();
  });

  it('encerra a sessão local mesmo quando a desinscrição de push não conclui', async () => {
    disableDevicePush.mockReturnValue(new Promise(() => undefined));
    saveOfflineUser(offlineAuthUser);
    saveOfflineForecast(forecastFixture);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/auth/refresh')) {
          return Promise.resolve(jsonResponse(200, { accessToken: 'token' }));
        }
        if (url.includes('/me')) return Promise.resolve(jsonResponse(200, offlineAuthUser));
        if (url.includes('/auth/logout')) return Promise.resolve(jsonResponse(204));
        return Promise.resolve(jsonResponse(200, {}));
      }),
    );

    renderSession('/app');
    expect(await screen.findByText('Área logada')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(await screen.findByText('Tela de login')).toBeInTheDocument();
    expect(localStorage.getItem('tanomar.offline-session.v1')).toBeNull();
    expect(localStorage.getItem('tanomar.offline-forecast.v1')).toBeNull();
  });
});
