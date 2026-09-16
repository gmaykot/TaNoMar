const storageKey = 'tanomar.biometric-unlock.v1';
const offerStorageKey = 'tanomar.biometric-unlock.offer.v1';
const justLoggedInKey = 'tanomar.biometric-unlock.just-logged-in';

export interface StoredBiometricUnlock {
  userId: string;
  userName: string;
  credentialId: string;
  rpId: string;
  active: boolean;
}

export function isMobileDevice(
  userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent,
) {
  if (/iphone|ipad|ipod/i.test(userAgent) || /android/i.test(userAgent)) return true;
  return Boolean(
    typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1 && /Mac/i.test(userAgent),
  );
}

export function canProbePlatformBiometrics() {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    isMobileDevice() &&
    Boolean(window.PublicKeyCredential) &&
    Boolean(navigator.credentials?.create) &&
    Boolean(navigator.credentials?.get)
  );
}

export async function isPlatformBiometricsAvailable() {
  if (!canProbePlatformBiometrics()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function readBiometricUnlock(): StoredBiometricUnlock | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as StoredBiometricUnlock).userId !== 'string' ||
      typeof (parsed as StoredBiometricUnlock).userName !== 'string' ||
      typeof (parsed as StoredBiometricUnlock).credentialId !== 'string' ||
      typeof (parsed as StoredBiometricUnlock).rpId !== 'string' ||
      typeof (parsed as StoredBiometricUnlock).active !== 'boolean'
    ) {
      return null;
    }
    return parsed as StoredBiometricUnlock;
  } catch {
    return null;
  }
}

function writeBiometricUnlock(value: StoredBiometricUnlock) {
  localStorage.setItem(storageKey, JSON.stringify(value));
}

export function isBiometricUnlockRequired() {
  if (!canProbePlatformBiometrics()) return false;
  const stored = readBiometricUnlock();
  if (!stored?.active || !stored.credentialId) return false;
  return stored.rpId === window.location.hostname;
}

export function isBiometricUnlockEnabledFor(userId: string) {
  const stored = readBiometricUnlock();
  return Boolean(stored && stored.userId === userId && stored.credentialId && stored.active);
}

export async function enableBiometricUnlock(user: { id: string; name: string; email?: string }) {
  if (!(await isPlatformBiometricsAvailable())) {
    throw new Error('Biometria indisponível neste celular.');
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const webAuthnUserId = crypto.getRandomValues(new Uint8Array(32));
  const credential = await navigator.credentials.create({
    publicKey: {
      rp: { name: 'TáNoMar', id: window.location.hostname },
      user: {
        id: webAuthnUserId,
        name: user.email || user.id,
        displayName: user.name,
      },
      challenge,
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'discouraged',
      },
      timeout: 60_000,
      attestation: 'none',
    },
  });

  if (!credential || credential.type !== 'public-key') {
    throw new Error('Não foi possível ativar a biometria.');
  }

  const publicKey = credential as PublicKeyCredential;
  writeBiometricUnlock({
    userId: user.id,
    userName: user.name,
    credentialId: toBase64Url(publicKey.rawId),
    rpId: window.location.hostname,
    active: true,
  });
  markBiometricOfferHandled(user.id);
}

export function disableBiometricUnlock() {
  try {
    localStorage.removeItem(storageKey);
  } catch {
    /* armazenamento indisponível */
  }
}

export async function verifyBiometricUnlock() {
  const stored = readBiometricUnlock();
  if (!stored?.credentialId) throw new Error('Biometria não está ativada neste aparelho.');

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rpId: stored.rpId,
      allowCredentials: [
        {
          type: 'public-key',
          id: fromBase64Url(stored.credentialId),
          transports: ['internal'],
        },
      ],
      userVerification: 'required',
      timeout: 60_000,
    },
  });

  if (!assertion || assertion.type !== 'public-key') {
    throw new Error('Não foi possível confirmar a biometria.');
  }

  return stored;
}

export function activateBiometricUnlockForUser(userId: string) {
  const stored = readBiometricUnlock();
  if (!stored || stored.userId !== userId || !stored.credentialId) return;
  if (stored.active) return;
  writeBiometricUnlock({ ...stored, active: true });
}

export function deactivateBiometricUnlock() {
  const stored = readBiometricUnlock();
  if (!stored?.active) return;
  writeBiometricUnlock({ ...stored, active: false });
}

export function shouldOfferBiometricUnlock(userId: string) {
  if (isBiometricUnlockEnabledFor(userId) || readBiometricUnlock()?.userId === userId) return false;
  return !wasBiometricOfferDismissed(userId);
}

export function markBiometricOfferHandled(userId: string) {
  writeOfferState(userId, true);
}

export function markJustLoggedIn() {
  try {
    sessionStorage.setItem(justLoggedInKey, '1');
  } catch {
    /* armazenamento indisponível */
  }
}

export function hasJustLoggedIn() {
  try {
    return sessionStorage.getItem(justLoggedInKey) === '1';
  } catch {
    return false;
  }
}

export function clearJustLoggedIn() {
  try {
    sessionStorage.removeItem(justLoggedInKey);
  } catch {
    /* armazenamento indisponível */
  }
}

function wasBiometricOfferDismissed(userId: string) {
  return readOfferState().includes(userId);
}

function writeOfferState(userId: string, dismissed: boolean) {
  const ids = new Set(readOfferState());
  if (dismissed) ids.add(userId);
  else ids.delete(userId);
  try {
    localStorage.setItem(offerStorageKey, JSON.stringify([...ids]));
  } catch {
    /* armazenamento indisponível */
  }
}

function readOfferState() {
  try {
    const raw = localStorage.getItem(offerStorageKey);
    if (!raw) return [] as string[];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) return [];
    return parsed as string[];
  } catch {
    return [] as string[];
  }
}

function toBase64Url(value: ArrayBuffer) {
  const bytes = new Uint8Array(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string) {
  const padded =
    value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes;
}

export function biometricUnlockErrorMessage(error: unknown) {
  if (
    error instanceof DOMException &&
    (error.name === 'NotAllowedError' || error.name === 'AbortError')
  ) {
    return 'A confirmação foi cancelada. Tente de novo quando quiser.';
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Não foi possível usar a biometria agora.';
}
