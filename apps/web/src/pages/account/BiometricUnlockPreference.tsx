import { Card } from '@/design-system/components/Card';
import { useBiometricUnlock } from '@/features/auth/hooks/useBiometricUnlock';
import formStyles from '@/features/locations/components/spotForm.module.css';
import accountStyles from './account.module.css';

export function BiometricUnlockPreference() {
  const biometric = useBiometricUnlock();

  if (!biometric.visible) return null;

  return (
    <section className={accountStyles.accountSection} aria-labelledby="account-biometric">
      <h2 id="account-biometric">Neste aparelho</h2>
      <Card className={accountStyles.formCard}>
        <div className={accountStyles.formHeader}>
          <h2>Abrir com biometria</h2>
          <p>Esta opção vale somente para o celular que você está usando.</p>
        </div>
        {biometric.available ? (
          <label className={formStyles.choice}>
            <input
              type="checkbox"
              checked={biometric.enabled}
              disabled={biometric.pending}
              onChange={(event) => void biometric.toggle(event.target.checked)}
            />
            <span>
              Pedir Face ID, Touch ID ou a digital ao entrar
              <small>
                O TáNoMar confirma que é você neste celular antes de restaurar a sessão. O login
                continua sendo a conta Google.
              </small>
            </span>
          </label>
        ) : (
          <p className={accountStyles.note}>
            Este celular não permite confirmar a identidade com biometria neste navegador.
          </p>
        )}
        {biometric.error ? <p className={formStyles.error}>{biometric.error}</p> : null}
      </Card>
    </section>
  );
}
