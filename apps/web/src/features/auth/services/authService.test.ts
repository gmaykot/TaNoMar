import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContractError } from '@/shared/api/errors';
import { getAccountDeletionStatus, parseAppFocus } from './authService';

afterEach(() => vi.unstubAllGlobals());

describe('parseAppFocus', () => {
  it('aceita ausência e os três focos', () => {
    expect(parseAppFocus(undefined)).toBeNull();
    expect(parseAppFocus(null)).toBeNull();
    expect(parseAppFocus('')).toBeNull();
    expect(parseAppFocus('pescador')).toBe('pescador');
    expect(parseAppFocus('surfista')).toBe('surfista');
    expect(parseAppFocus('ambos')).toBe('ambos');
  });

  it('rejeita valor fora do contrato', () => {
    expect(() => parseAppFocus('kitesurf')).toThrow(ContractError);
  });
});

describe('getAccountDeletionStatus', () => {
  it('envia o protocolo somente no corpo de um POST para caminho constante', async () => {
    const protocol = 'secret-protocol-abcdefghijklmnopqrstuvwxyz123456';
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'cancellation_pending',
          updatedAt: '2026-09-28T12:00:00Z',
          supportChannel: 'privacidade@tanomar.app',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await getAccountDeletionStatus(protocol);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/public/account-deletions/status');
    expect(url).not.toContain(protocol);
    expect(options.method).toBe('POST');
    expect(options.body).toBe(JSON.stringify({ protocol }));
    expect(new Headers(options.headers).has('X-Deletion-Protocol')).toBe(false);
  });
});
