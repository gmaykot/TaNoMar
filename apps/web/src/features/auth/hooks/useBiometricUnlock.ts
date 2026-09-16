import { useEffect, useState } from 'react';
import { showSaveConfirmation } from '@/app/layout/saveConfirmationEvents';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  biometricUnlockErrorMessage,
  disableBiometricUnlock,
  enableBiometricUnlock,
  isBiometricUnlockEnabledFor,
  isPlatformBiometricsAvailable,
} from '../services/biometricUnlock';

export function useBiometricUnlock() {
  const auth = useAuth();
  const user = auth.user;
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(() =>
    user ? isBiometricUnlockEnabledFor(user.id) : false,
  );

  useEffect(() => {
    let cancelled = false;
    void isPlatformBiometricsAvailable().then((value) => {
      if (cancelled) return;
      setAvailable(value);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    available,
    loading,
    pending,
    error,
    enabled,
    visible: !loading && (available || enabled),
    toggle: async (next: boolean) => {
      if (!user) return false;
      setPending(true);
      setError(null);
      try {
        if (next) await enableBiometricUnlock(user);
        else disableBiometricUnlock();
        setEnabled(next);
        showSaveConfirmation(
          next ? 'Biometria ativada neste aparelho.' : 'Biometria desativada neste aparelho.',
        );
        return true;
      } catch (cause) {
        setError(biometricUnlockErrorMessage(cause));
        return false;
      } finally {
        setPending(false);
      }
    },
  };
}
