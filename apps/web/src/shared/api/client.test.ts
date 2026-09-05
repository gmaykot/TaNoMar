import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, refreshAccessTokenOnce, resetApiClientState } from './client';
import { ApiError } from './errors';
import { getAccessToken, resetApiSession, setAccessToken, setOnSessionLost } from './session';

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  resetApiSession();
  resetApiClientState();
  vi.unstubAllGlobals();
});

describe('apiRequest', () => {
  it('renova a sessão em 401 e repete o pedido', async () => {
    setAccessToken('expired');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { title: 'Unauthorized' }))
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: 'novo' }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest('/forecasts/ranking')).resolves.toEqual({ ok: true });
    expect(getAccessToken()).toBe('novo');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/auth/refresh');
  });

  it('encerra a sessão quando o refresh falha', async () => {
    const lost = vi.fn();
    setOnSessionLost(lost);
    setAccessToken('expired');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(401, {}))
        .mockResolvedValueOnce(jsonResponse(401, {})),
    );

    await expect(apiRequest('/me')).rejects.toBeInstanceOf(ApiError);
    expect(lost).toHaveBeenCalledOnce();
    expect(getAccessToken()).toBeNull();
  });

  it('compartilha um único refresh em voo', async () => {
    let resolveRefresh: ((value: Response) => void) | undefined;
    const pendingRefresh = new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    });
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      if (String(input).includes('/auth/refresh')) return pendingRefresh;
      return Promise.resolve(jsonResponse(200, { ok: true }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const first = refreshAccessTokenOnce();
    const second = refreshAccessTokenOnce();
    resolveRefresh?.(jsonResponse(200, { accessToken: 'novo' }));

    await expect(Promise.all([first, second])).resolves.toEqual(['novo', 'novo']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe('novo');
  });

  it('reusa o refresh recém-resolvido no remount do Strict Mode', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { accessToken: 'novo' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(refreshAccessTokenOnce()).resolves.toBe('novo');
    await expect(refreshAccessTokenOnce()).resolves.toBe('novo');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
