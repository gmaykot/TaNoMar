import { useCallback, useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type InstallPromptListener = (value: BeforeInstallPromptEvent | null) => void;

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
const installPromptListeners = new Set<InstallPromptListener>();

function setDeferredInstallPrompt(value: BeforeInstallPromptEvent | null) {
  deferredInstallPrompt = value;
  installPromptListeners.forEach((listener) => listener(value));
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    setDeferredInstallPrompt(event as BeforeInstallPromptEvent);
  });
  window.addEventListener('appinstalled', () => {
    setDeferredInstallPrompt(null);
  });
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandaloneDisplay() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    ('standalone' in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function usePwaLifecycle() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => deferredInstallPrompt,
  );
  const [showIosInstall, setShowIosInstall] = useState(
    () => isIosDevice() && !isStandaloneDisplay(),
  );
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    installPromptListeners.add(setInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      installPromptListeners.delete(setInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setDeferredInstallPrompt(null);
  }, [installPrompt]);

  return {
    online,
    canInstall: Boolean(installPrompt),
    install,
    showIosInstall,
    dismissIosInstall: () => setShowIosInstall(false),
    needRefresh,
    dismissRefresh: () => setNeedRefresh(false),
    update: () => updateServiceWorker(true),
  };
}
