import { Compass, Fish, Waves } from 'lucide-react';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { TaNoMarLogo } from '@/design-system/brand/TaNoMarLogo';
import { Button } from '@/design-system/components/Button';
import { focusChoices, hasChosenAppFocus, type AppFocus } from '@/features/auth/appFocus';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { updatePreferences } from '@/features/auth/services/preferencesService';
import type { AuthUser } from '@/features/auth/types/auth';
import { routes } from '@/shared/constants/routes';
import styles from './focusOnboarding.module.css';

const focusIcons = {
  pescador: Fish,
  surfista: Waves,
  ambos: Compass,
} as const;

export function FocusOnboardingPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const user = auth.user;
  const [focus, setFocus] = useState<AppFocus | null>(user?.preferences.focus ?? null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (auth.userLoading) return null;
  if (hasChosenAppFocus(user?.preferences.focus)) {
    return <Navigate to={routes.home} replace />;
  }

  return (
    <main className={styles.page}>
      <TaNoMarLogo />
      <h1>Qual é o seu foco?</h1>
      <p>
        Isso só muda o que aparece na tela. A nota de pesca continua a mesma e você pode trocar
        depois na conta.
      </p>
      <div className={styles.choices} role="group" aria-label="Foco do aplicativo">
        {focusChoices.map((choice) => {
          const Icon = focusIcons[choice.id];
          return (
            <button
              key={choice.id}
              type="button"
              className={styles.choice}
              aria-pressed={focus === choice.id}
              onClick={() => setFocus(choice.id)}
            >
              <span>
                <Icon size={18} aria-hidden="true" />
              </span>
              <strong>{choice.title}</strong>
              <small>{choice.description}</small>
            </button>
          );
        })}
      </div>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        disabled={!focus || pending}
        onClick={() => {
          if (!focus) return;
          setPending(true);
          setError(null);
          void updatePreferences({
            region: user?.preferences.region ?? 'Florianópolis',
            windUnit: user?.preferences.windUnit ?? 'kmh',
            forecastNotifications: user?.preferences.forecastNotifications ?? true,
            focus,
          })
            .then(async (preferences) => {
              queryClient.setQueryData<AuthUser>(['me'], (current) =>
                current ? { ...current, preferences } : current,
              );
              await queryClient.invalidateQueries({ queryKey: ['me'] });
            })
            .catch(() => {
              setError('Não foi possível salvar o foco.');
              setPending(false);
            });
        }}
      >
        Começar
      </Button>
    </main>
  );
}
