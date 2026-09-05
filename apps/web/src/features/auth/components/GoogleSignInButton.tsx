import { useEffect, useRef, useState } from 'react';
import { mountGoogleSignInButton, setGoogleCredentialHandler } from '../googleIdentity';
import { googleClientId } from '@/shared/api/env';
import styles from './googleSignIn.module.css';

interface GoogleSignInButtonProps {
  onCredential: (credential: string) => void;
  disabled?: boolean;
}

export function GoogleSignInButton({ onCredential, disabled = false }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  const [error, setError] = useState('');

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    setGoogleCredentialHandler((credential) => onCredentialRef.current(credential));
    return () => setGoogleCredentialHandler(null);
  }, []);

  useEffect(() => {
    const parent = containerRef.current;
    if (!googleClientId || !parent) return;
    const controller = new AbortController();
    setError('');

    void mountGoogleSignInButton(parent, controller.signal).catch(() => {
      if (!controller.signal.aborted) {
        setError('Não foi possível carregar o login com Google. Recarregue a página.');
      }
    });

    return () => {
      controller.abort();
      parent.replaceChildren();
    };
  }, []);

  if (!googleClientId) {
    return (
      <p role="status">Não foi possível iniciar o login com Google. Confira a configuração.</p>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className={styles.host}
        role="group"
        aria-label="Entrar com Google"
        aria-disabled={disabled}
      />
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
