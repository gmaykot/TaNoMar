import { googleClientId } from '@/shared/api/env';

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const initializedClients = new WeakSet<object>();

let credentialHandler: ((credential: string) => void) | null = null;

function loadGis() {
  if (window.google?.accounts.id) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    const finish = () => {
      if (window.google?.accounts.id) resolve();
      else reject(new Error('Falha ao carregar o Google.'));
    };

    if (existing) {
      existing.addEventListener('load', finish, { once: true });
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar o Google.')), {
        once: true,
      });
      if (window.google?.accounts.id) finish();
      return;
    }

    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = finish;
    script.onerror = () => reject(new Error('Falha ao carregar o Google.'));
    document.head.appendChild(script);
  });
}

function ensureGisInitialized() {
  const googleId = window.google?.accounts.id;
  if (!googleId || initializedClients.has(googleId)) return;
  googleId.initialize({
    client_id: googleClientId,
    auto_select: false,
    cancel_on_tap_outside: true,
    callback: (response) => credentialHandler?.(response.credential),
  });
  initializedClients.add(googleId);
}

function paintOfficialButton(parent: HTMLElement) {
  const googleId = window.google?.accounts.id;
  if (!googleId) return;
  googleId.disableAutoSelect?.();
  parent.replaceChildren();
  googleId.renderButton(parent, {
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    width: 320,
    locale: 'pt-BR',
    shape: 'pill',
  });
}

export function setGoogleCredentialHandler(handler: ((credential: string) => void) | null) {
  credentialHandler = handler;
}

export function clearGoogleSignInSession() {
  window.google?.accounts.id.disableAutoSelect?.();
  window.google?.accounts.id.cancel?.();
}

export async function mountGoogleSignInButton(parent: HTMLElement, signal?: AbortSignal) {
  await loadGis();
  if (signal?.aborted) return;
  ensureGisInitialized();
  if (signal?.aborted) return;
  paintOfficialButton(parent);
}
