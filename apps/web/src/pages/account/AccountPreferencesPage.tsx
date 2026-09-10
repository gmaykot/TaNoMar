import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Lock } from 'lucide-react';
import { showSaveConfirmation } from '@/app/layout/saveConfirmationEvents';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { focusChoices, type AppFocus } from '@/features/auth/appFocus';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { updatePreferences } from '@/features/auth/services/preferencesService';
import {
  hasPlanModule,
  showsAppFocus,
  SUBSCRIPTION_LOCK_LABEL,
  type AuthUser,
} from '@/features/auth/types/auth';
import { fishingMetricKeys, type FishingMetricKey } from '@/features/fishing/types/fishing';
import { RegionPicker } from '@/features/locations/components/RegionPicker';
import formStyles from '@/features/locations/components/spotForm.module.css';
import { parseRegions, serializeRegions } from '@/features/locations/regions';
import { PageHeader } from '@/pages/shared/PageHeader';
import { routes } from '@/shared/constants/routes';
import accountStyles from './account.module.css';
import styles from '@/pages/shared/pages.module.css';

const metricLabels: Record<FishingMetricKey, { label: string; description: string }> = {
  wind: { label: 'Vento', description: 'Velocidade e direção do vento.' },
  gusts: { label: 'Rajadas', description: 'Picos de velocidade do vento.' },
  waves: { label: 'Ondas', description: 'Altura prevista das ondas.' },
  'wave-period': {
    label: 'Período das ondas',
    description: 'Intervalo entre uma onda e outra.',
  },
  swell: { label: 'Swell', description: 'Altura da ondulação do mar.' },
  rain: { label: 'Chuva', description: 'Volume e probabilidade de chuva.' },
  'air-temperature': { label: 'Temperatura do ar', description: 'Temperatura prevista do ar.' },
  'water-temperature': {
    label: 'Temperatura da água',
    description: 'Temperatura prevista da água.',
  },
  pressure: { label: 'Pressão', description: 'Pressão atmosférica prevista.' },
};

export function AccountPreferencesPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const user = auth.user;
  const canCustomizeMetrics = hasPlanModule(user, 'customMetrics');
  const canChooseFocus = showsAppFocus(user);
  const [regions, setRegions] = useState(() =>
    parseRegions(user?.preferences.region ?? 'Florianópolis'),
  );
  const [windUnit, setWindUnit] = useState(user?.preferences.windUnit ?? 'kmh');
  const [focus, setFocus] = useState<AppFocus>(user?.preferences.focus ?? 'pescador');
  const [visibleMetrics, setVisibleMetrics] = useState<FishingMetricKey[]>(
    user?.preferences.visibleMetrics ?? fishingMetricKeys,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className={styles.page}>
      <Link className={styles.backLink} to={routes.account}>
        <ArrowLeft size={16} aria-hidden="true" /> Conta
      </Link>
      <PageHeader
        eyebrow="Preferências"
        title="Previsão e regiões."
        description="Escolha o que acompanhar e como os dados aparecem."
      />
      <Card className={accountStyles.formCard}>
        <form
          className={formStyles.form}
          onSubmit={(event) => {
            event.preventDefault();
            setPending(true);
            setError(null);
            void updatePreferences({
              region: serializeRegions(regions),
              windUnit,
              forecastNotifications: user?.preferences.forecastNotifications ?? true,
              focus: canChooseFocus ? focus : (user?.preferences.focus ?? null),
              ...(canCustomizeMetrics ? { visibleMetrics } : {}),
            })
              .then(async (preferences) => {
                queryClient.setQueryData<AuthUser>(['me'], (current) =>
                  current ? { ...current, preferences } : current,
                );
                showSaveConfirmation('Preferências salvas.');
                await Promise.allSettled([
                  queryClient.invalidateQueries({ queryKey: ['me'] }),
                  queryClient.invalidateQueries({ queryKey: ['locations'] }),
                  queryClient.invalidateQueries({ queryKey: ['forecast'] }),
                  queryClient.invalidateQueries({ queryKey: ['community-reports'] }),
                  queryClient.invalidateQueries({ queryKey: ['notifications'] }),
                ]);
              })
              .catch(() => setError('Não foi possível salvar as preferências.'))
              .finally(() => setPending(false));
          }}
        >
          {canChooseFocus ? (
            <section className={accountStyles.preferenceGroup} aria-labelledby="focus-preferences">
              <div className={accountStyles.preferenceHeading}>
                <h2 id="focus-preferences">Foco do aplicativo</h2>
                <p>Isso só mostra ou oculta informações. A nota de pesca não muda.</p>
              </div>
              <div
                className={accountStyles.metricChoices}
                role="group"
                aria-label="Foco do aplicativo"
              >
                {focusChoices.map((choice) => (
                  <label
                    className={`${formStyles.choice} ${accountStyles.metricChoice}`}
                    key={choice.id}
                  >
                    <input
                      type="radio"
                      name="app-focus"
                      value={choice.id}
                      aria-label={choice.title}
                      checked={focus === choice.id}
                      onChange={() => setFocus(choice.id)}
                    />
                    <span>
                      <strong>{choice.title}</strong>
                      <small>{choice.description}</small>
                    </span>
                  </label>
                ))}
              </div>
            </section>
          ) : null}
          <section className={accountStyles.preferenceGroup} aria-labelledby="region-preferences">
            <div className={accountStyles.preferenceHeading}>
              <h2 id="region-preferences">Regiões acompanhadas</h2>
              <p>Escolha quais regiões entram nas suas previsões.</p>
            </div>
            <RegionPicker
              multiple
              value={regions}
              hint="Toque nos trechos da ilha, no continente ou nas ilhas que você acompanha."
              onChange={setRegions}
            />
          </section>
          <section className={accountStyles.preferenceGroup} aria-labelledby="display-preferences">
            <div className={accountStyles.preferenceHeading}>
              <h2 id="display-preferences">Exibição da previsão</h2>
              <p>Escolha a unidade de vento e os indicadores que quer consultar.</p>
            </div>
            <label className={formStyles.field}>
              <span>Unidade de vento</span>
              <select value={windUnit} onChange={(event) => setWindUnit(event.target.value)}>
                <option value="kmh">km/h</option>
                <option value="kt">nós</option>
              </select>
            </label>
            {canCustomizeMetrics ? (
              <fieldset className={accountStyles.metricPreferences}>
                <legend>Indicadores da previsão</legend>
                <small>
                  Marque o que deseja ver nos cards. Essa escolha não altera a nota de pesca.
                </small>
                <div className={accountStyles.metricChoices}>
                  {fishingMetricKeys.map((metric) => (
                    <label
                      className={`${formStyles.choice} ${accountStyles.metricChoice}`}
                      key={metric}
                    >
                      <input
                        type="checkbox"
                        aria-label={metricLabels[metric].label}
                        checked={visibleMetrics.includes(metric)}
                        onChange={(event) => {
                          setVisibleMetrics((current) =>
                            event.target.checked
                              ? fishingMetricKeys.filter(
                                  (item) => item === metric || current.includes(item),
                                )
                              : current.filter((item) => item !== metric),
                          );
                        }}
                      />
                      <span>
                        <strong>{metricLabels[metric].label}</strong>
                        <small>{metricLabels[metric].description}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : (
              <div
                className={`${formStyles.choice} ${accountStyles.choiceLocked}`}
                aria-disabled="true"
                aria-label="Seleção de indicadores bloqueada no plano atual"
              >
                <Lock size={16} aria-hidden="true" />
                <span>
                  Indicadores da previsão
                  <small>{SUBSCRIPTION_LOCK_LABEL}</small>
                </span>
              </div>
            )}
          </section>
          {error ? <p className={formStyles.error}>{error}</p> : null}
          <Button type="submit" disabled={pending}>
            Salvar alterações
          </Button>
        </form>
      </Card>
    </div>
  );
}
