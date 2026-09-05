import { Compass } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { TaNoMarLogo } from '@/design-system/brand/TaNoMarLogo';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { routes } from '@/shared/constants/routes';
import styles from './login.module.css';

export function LoginPage() {
  const auth = useAuth();
  const location = useLocation();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || routes.home;

  if (auth.status === 'booting') {
    return (
      <FeedbackState
        title="Abrindo sua sessão"
        description="Confirmando se você já está dentro."
        busy
      />
    );
  }

  if (auth.status === 'authenticated') {
    return <Navigate to={from} replace />;
  }

  return (
    <main className={styles.page}>
      <TaNoMarLogo />
      <h1>Entre para ver o mar de hoje.</h1>
      <p>Usamos sua conta Google para liberar ranking, locais e a previsão do seu plano.</p>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <GoogleSignInButton
        disabled={submitting}
        onCredential={async (credential) => {
          setError('');
          setSubmitting(true);
          try {
            await auth.loginWithGoogle(credential);
          } catch {
            setError('Não foi possível entrar. Tente de novo.');
            setSubmitting(false);
          }
        }}
      />
      <small>
        <Compass size={14} aria-hidden="true" /> A nota continua vindo só da API.
      </small>
    </main>
  );
}
