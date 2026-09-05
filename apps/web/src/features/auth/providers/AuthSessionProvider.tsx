import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { clearGoogleSignInSession } from '../googleIdentity';
import {
  getCurrentUser,
  loginWithGoogle as loginWithGoogleCredential,
  logoutSession,
  refreshSession,
} from '../services/authService';
import { AuthSessionContext } from '../session/authSessionContext';
import type { AuthStatus } from '../types/auth';
import { setOnSessionLost } from '@/shared/api/session';

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('booting');

  useEffect(() => {
    setOnSessionLost(() => {
      clearGoogleSignInSession();
      setStatus('anonymous');
      void queryClient.clear();
    });
    return () => setOnSessionLost(null);
  }, [queryClient]);

  useEffect(() => {
    let cancelled = false;
    void refreshSession().then((token) => {
      if (cancelled) return;
      setStatus(token ? 'authenticated' : 'anonymous');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: getCurrentUser,
    enabled: status === 'authenticated',
    staleTime: 0,
  });

  const value = useMemo(
    () => ({
      status,
      user: meQuery.data ?? null,
      userLoading: status === 'authenticated' && meQuery.isPending,
      loginWithGoogle: async (credential: string) => {
        await loginWithGoogleCredential(credential);
        setStatus('authenticated');
        await queryClient.invalidateQueries({ queryKey: ['me'] });
      },
      logout: async () => {
        await logoutSession();
        clearGoogleSignInSession();
        setStatus('anonymous');
        queryClient.clear();
      },
    }),
    [meQuery.data, meQuery.isPending, queryClient, status],
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}
