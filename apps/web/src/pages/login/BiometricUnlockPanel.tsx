import { Fingerprint } from 'lucide-react';
import { useState } from 'react';
import { TaNoMarLogo } from '@/design-system/brand/TaNoMarLogo';
import { Button } from '@/design-system/components/Button';
import {
  biometricUnlockErrorMessage,
  readBiometricUnlock,
} from '@/features/auth/services/biometricUnlock';
import styles from './login.module.css';

interface BiometricUnlockPanelProps {
  unlocking?: boolean;
  onUnlock: () => Promise<void>;
  onUseGoogle: () => void;
}

export function BiometricUnlockPanel({
  unlocking = false,
  onUnlock,
  onUseGoogle,
}: BiometricUnlockPanelProps) {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const userName = readBiometricUnlock()?.userName;
  const busy = unlocking || pending;

  return (
    <main className={styles.page}>
      <TaNoMarLogo />
      <h1>Confirme que é você.</h1>
      <p>
        {userName
          ? `Use a biometria deste celular para abrir o TáNoMar, ${userName}.`
          : 'Use a biometria deste celular para abrir o TáNoMar.'}
      </p>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <div className={styles.unlockActions}>
        <Button
          type="button"
          disabled={busy}
          onClick={() => {
            setError('');
            setPending(true);
            void onUnlock()
              .catch((cause) => setError(biometricUnlockErrorMessage(cause)))
              .finally(() => setPending(false));
          }}
        >
          <Fingerprint size={18} aria-hidden="true" />
          Usar biometria
        </Button>
        <Button type="button" variant="secondary" disabled={busy} onClick={onUseGoogle}>
          Entrar com Google
        </Button>
      </div>
    </main>
  );
}
