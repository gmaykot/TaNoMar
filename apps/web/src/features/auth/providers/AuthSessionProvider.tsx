import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useOnlineStatus } from '@/app/hooks/useOnlineStatus';
import { clearOfflineForecast } from '@/features/forecast/utils/offlineForecast';
import { disableDevicePush } from '@/features/notifications/services/devicePushService';
import { getAccessToken, setOnSessionLost } from '@/shared/api/session';
import { clearGoogleSignInSession } from '../googleIdentity';
import {
  getCurrentUser,
  loginWithGoogle as loginWithGoogleCredential,
  logoutSession,
  refreshSession,
} from '../services/authService';
import { AuthSessionContext } from '../session/authSessionContext';
import type { AuthStatus } from '../types/auth';
import {
  canRestoreOfflineSession,
  clearOfflineUser,
  readOfflineUser,
  saveOfflineUser,
} from '../utils/offlineSession';

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const online = useOnlineStatus();
  const [status, setStatus] = useState<AuthStatus>('booting');
  const [cachedUser, setCachedUser] = useState(() =>
    canRestoreOfflineSession() ? readOfflineUser() : null,
  );

  useEffect(() => {
    setOnSessionLost(() => {
      clearGoogleSignInSession();
      clearOfflineUser();
      setCachedUser(null);
      setStatus('anonymous');
      void queryClient.clear();
    });
    return () => setOnSessionLost(null);
  }, [queryClient]);

  useEffect(() => {
    let cancelled = false;
    void refreshSession()
      .then((result) => {
        if (cancelled) return;
        if (result.token) {
          setStatus('authenticated');
          return;
        }
        if (result.reason === 'network' && canRestoreOfflineSession()) {
          setStatus('authenticated');
          return;
        }
        setStatus('anonymous');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus(canRestoreOfflineSession() ? 'authenticated' : 'anonymous');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== 'authenticated' || !online || getAccessToken()) return;
    let cancelled = false;
    void refreshSession().then((result) => {
      if (cancelled) return;
      if (result.token) {
        void queryClient.invalidateQueries({ queryKey: ['me'] });
        return;
      }
      if (result.reason === 'unauthenticated') {
        clearGoogleSignInSession();
        clearOfflineUser();
        setCachedUser(null);
        setStatus('anonymous');
        void queryClient.clear();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [online, queryClient, status]);

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const user = await getCurrentUser();
      saveOfflineUser(user);
      return user;
    },
    enabled: status === 'authenticated' && online,
    initialData: cachedUser ?? undefined,
    staleTime: 0,
  });

  const value = useMemo(
    () => ({
      status,
      user: status === 'authenticated' ? (meQuery.data ?? cachedUser ?? null) : null,
      userLoading: status === 'authenticated' && meQuery.isPending && !meQuery.data && !cachedUser,
      loginWithGoogle: async (credential: string) => {
        await loginWithGoogleCredential(credential);
        setStatus('authenticated');
        await queryClient.invalidateQueries({ queryKey: ['me'] });
      },
      logout: async () => {
        const pushLogout = disableDevicePush().catch(() => {
          /* o logout segue mesmo se o aparelho não desinscrever */
        });
        const sessionLogout = logoutSession();
        clearGoogleSignInSession();
        clearOfflineUser();
        clearOfflineForecast();
        setCachedUser(null);
        setStatus('anonymous');
        queryClient.clear();
        await Promise.all([pushLogout, sessionLogout]);
      },
    }),
    [cachedUser, meQuery.data, meQuery.isPending, queryClient, status],
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}
