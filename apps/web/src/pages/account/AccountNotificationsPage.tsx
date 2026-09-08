import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Lock } from 'lucide-react';
import { showSaveConfirmation } from '@/app/layout/saveConfirmationEvents';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { updatePreferences } from '@/features/auth/services/preferencesService';
import { hasPlanModule, SUBSCRIPTION_LOCK_LABEL, type AuthUser } from '@/features/auth/types/auth';
import formStyles from '@/features/locations/components/spotForm.module.css';
import { useDevicePush } from '@/features/notifications/hooks/useDevicePush';
import { ForecastAlerts } from '@/features/notifications/components/ForecastAlerts';
import { PageHeader } from '@/pages/shared/PageHeader';
import { routes } from '@/shared/constants/routes';
import accountStyles from './account.module.css';
import styles from '@/pages/shared/pages.module.css';

export function AccountNotificationsPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const user = auth.user;
  const canNotify = (user?.entitlements.maxAlerts ?? 0) > 0;
  const canCustomizeMetrics = hasPlanModule(user, 'customMetrics');
  const [forecastNotifications, setForecastNotifications] = useState(
    user?.preferences.forecastNotifications ?? true,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const devicePush = useDevicePush();

  return (
    <div className={styles.page}>
      <Link className={styles.backLink} to={routes.account}>
        <ArrowLeft size={16} aria-hidden="true" /> Conta
      </Link>
      <PageHeader
        eyebrow="Preferências"
        title="Notificações."
        description="Controle os avisos da conta e deste aparelho."
      />
      <Card className={accountStyles.formCard}>
        <div className={accountStyles.formHeader}>
          <h2>Notificações de previsão</h2>
          <p>Esta preferência acompanha sua conta em todos os dispositivos.</p>
        </div>
        {canNotify ? (
          <form
            className={formStyles.form}
            onSubmit={(event) => {
              event.preventDefault();
              setPending(true);
              setError(null);
              void updatePreferences({
                region: user?.preferences.region ?? 'Florianópolis',
                windUnit: user?.preferences.windUnit ?? 'kmh',
                forecastNotifications,
                ...(canCustomizeMetrics && user?.preferences.visibleMetrics
                  ? { visibleMetrics: user.preferences.visibleMetrics }
                  : {}),
              })
                .then(async (preferences) => {
                  queryClient.setQueryData<AuthUser>(['me'], (current) =>
                    current ? { ...current, preferences } : current,
                  );
                  showSaveConfirmation('Preferências salvas.');
                  await Promise.allSettled([
                    queryClient.invalidateQueries({ queryKey: ['me'] }),
                    queryClient.invalidateQueries({ queryKey: ['notifications'] }),
                  ]);
                })
                .catch(() => setError('Não foi possível salvar as preferências.'))
                .finally(() => setPending(false));
            }}
          >
            <label className={formStyles.choice}>
              <input
                type="checkbox"
                checked={forecastNotifications}
                onChange={(event) => setForecastNotifications(event.target.checked)}
              />
              <span>
                Quero notificações de previsão
                <small>O sino do topo mostra os avisos enquanto você usa o aplicativo.</small>
              </span>
            </label>
            {error ? <p className={formStyles.error}>{error}</p> : null}
            <Button type="submit" disabled={pending}>
              Salvar preferência
            </Button>
          </form>
        ) : (
          <div
            className={`${formStyles.choice} ${accountStyles.choiceLocked}`}
            aria-disabled="true"
            aria-label="Notificações de previsão bloqueadas no plano atual"
          >
            <Lock size={16} aria-hidden="true" />
            <span>
              Notificações de previsão
              <small>{SUBSCRIPTION_LOCK_LABEL}</small>
            </span>
          </div>
        )}
      </Card>

      <ForecastAlerts />

      {devicePush.loading || devicePush.configured ? (
        <Card className={accountStyles.formCard}>
          <div className={accountStyles.formHeader}>
            <h2>Avisos neste aparelho</h2>
            <p>Esta opção vale somente para o navegador ou aparelho que você está usando.</p>
          </div>
          {devicePush.iosNeedsInstall ? (
            <p className={accountStyles.note}>
              No iPhone, instale o TáNoMar na Tela de Início para receber avisos com o app fechado.
            </p>
          ) : null}
          {devicePush.available ? (
            <label className={formStyles.choice}>
              <input
                type="checkbox"
                checked={devicePush.enabled}
                disabled={devicePush.pending}
                onChange={(event) => void devicePush.toggle(event.target.checked)}
              />
              <span>
                Receber avisos com o app fechado
                <small>A alteração é aplicada imediatamente neste aparelho.</small>
              </span>
            </label>
          ) : !devicePush.iosNeedsInstall && !devicePush.loading ? (
            <p className={accountStyles.note}>
              Este navegador não permite avisos com o app fechado.
            </p>
          ) : null}
          {devicePush.error ? <p className={formStyles.error}>{devicePush.error}</p> : null}
        </Card>
      ) : null}
    </div>
  );
}
