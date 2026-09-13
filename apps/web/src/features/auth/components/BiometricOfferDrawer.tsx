import { useEffect, useState } from 'react';
import { ConfirmDrawer } from '@/design-system/components/ConfirmDrawer';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useBiometricUnlock } from '../hooks/useBiometricUnlock';
import {
  clearJustLoggedIn,
  hasJustLoggedIn,
  isPlatformBiometricsAvailable,
  markBiometricOfferHandled,
  shouldOfferBiometricUnlock,
} from '../services/biometricUnlock';

export function BiometricOfferDrawer() {
  const auth = useAuth();
  const biometric = useBiometricUnlock();
  const user = auth.user;
  const userId = user?.id;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId || !hasJustLoggedIn()) return;
    let cancelled = false;
    void isPlatformBiometricsAvailable().then((available) => {
      if (cancelled) return;
      clearJustLoggedIn();
      if (available && shouldOfferBiometricUnlock(userId)) setOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!open || !user) return null;

  return (
    <ConfirmDrawer
      title="Usar biometria neste celular?"
      description="Na próxima vez, o TáNoMar pede Face ID, Touch ID ou a digital antes de abrir sua sessão neste aparelho. O login continua sendo a conta Google."
      confirmLabel="Usar biometria"
      cancelLabel="Agora não"
      busy={biometric.pending}
      onCancel={() => {
        markBiometricOfferHandled(user.id);
        setOpen(false);
      }}
      onConfirm={() => {
        void biometric.toggle(true).then((enabled) => {
          if (enabled) setOpen(false);
        });
      }}
    />
  );
}
