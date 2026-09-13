import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  activateBiometricUnlockForUser,
  deactivateBiometricUnlock,
  disableBiometricUnlock,
  enableBiometricUnlock,
  isBiometricUnlockRequired,
  isMobileDevice,
  isPlatformBiometricsAvailable,
  markJustLoggedIn,
  hasJustLoggedIn,
  clearJustLoggedIn,
  markBiometricOfferHandled,
  shouldOfferBiometricUnlock,
  verifyBiometricUnlock,
} from './biometricUnlock';

const storageKey = 'tanomar.biometric-unlock.v1';

function mockPlatformBiometrics(options?: { available?: boolean; userAgent?: string }) {
  const create = vi.fn();
  const get = vi.fn();
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
  vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(
    options?.userAgent ?? 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36',
  );
  Object.defineProperty(navigator, 'credentials', {
    configurable: true,
    value: { create, get },
  });
  vi.stubGlobal('PublicKeyCredential', {
    isUserVerifyingPlatformAuthenticatorAvailable: vi.fn(async () => options?.available !== false),
  });
  return { create, get };
}

describe('biometricUnlock', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('reconhece celular e ignora desktop', () => {
    expect(isMobileDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true);
    expect(isMobileDevice('Mozilla/5.0 (Linux; Android 14; Pixel 8)')).toBe(true);
    expect(isMobileDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(false);
    expect(isMobileDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe(false);
  });

  it('não pede biometria no desktop mesmo com credencial salva', () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        userId: 'user-1',
        userName: 'Ana',
        credentialId: 'abc',
        rpId: 'localhost',
        active: true,
      }),
    );
    expect(isBiometricUnlockRequired()).toBe(false);
  });

  it('grava a credencial local e exige o desbloqueio só no celular', async () => {
    const { create, get } = mockPlatformBiometrics();
    create.mockResolvedValue({
      type: 'public-key',
      rawId: new Uint8Array([1, 2, 3, 4]).buffer,
    });
    get.mockResolvedValue({ type: 'public-key' });

    expect(await isPlatformBiometricsAvailable()).toBe(true);
    await enableBiometricUnlock({ id: 'user-1', name: 'Ana', email: 'ana@example.com' });
    expect(isBiometricUnlockRequired()).toBe(true);
    expect(shouldOfferBiometricUnlock('user-1')).toBe(false);

    await verifyBiometricUnlock();
    expect(get).toHaveBeenCalledTimes(1);

    deactivateBiometricUnlock();
    expect(isBiometricUnlockRequired()).toBe(false);
    activateBiometricUnlockForUser('user-1');
    expect(isBiometricUnlockRequired()).toBe(true);

    disableBiometricUnlock();
    expect(isBiometricUnlockRequired()).toBe(false);
  });

  it('não oferece de novo depois de recusar', () => {
    expect(shouldOfferBiometricUnlock('user-1')).toBe(true);
    markBiometricOfferHandled('user-1');
    expect(shouldOfferBiometricUnlock('user-1')).toBe(false);
    expect(shouldOfferBiometricUnlock('user-2')).toBe(true);
  });

  it('marca o login recém-feito só nesta aba', () => {
    expect(hasJustLoggedIn()).toBe(false);
    markJustLoggedIn();
    expect(hasJustLoggedIn()).toBe(true);
    clearJustLoggedIn();
    expect(hasJustLoggedIn()).toBe(false);
  });
});
