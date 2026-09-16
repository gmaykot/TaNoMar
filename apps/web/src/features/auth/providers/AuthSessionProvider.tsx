import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useOnlineStatus } from '@/app/hooks/useOnlineStatus';
import { clearOfflineForecast } from '@/features/forecast/utils/offlineForecast';
import { disableDevicePush } from '@/features/notifications/services/devicePushService';
import { getAccessToken, setOnSessionLost } from '@/shared/api/session';
import { clearGoogleSignInSession } from '../googleIdentity';
import {
  activateBiometricUnlockForUser,
  deactivateBiometricUnlock,
  isBiometricUnlockRequired,
  markJustLoggedIn,
  verifyBiometricUnlock,
} from '../services/biometricUnlock';
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

function restoreFromRefresh(result: Awaited<ReturnType<typeof refreshSession>>) {
  if (result.token) return 'authenticated' as const;
  if (result.reason === 'network' && canRestoreOfflineSession()) return 'authenticated' as const;
  return 'anonymous' as const;
}

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const online = useOnlineStatus();
  const [status, setStatus] = useState<AuthStatus>(() =>
    isBiometricUnlockRequired() ? 'locked' : 'booting',
  );
  const [cachedUser, setCachedUser] = useState(() =>
    canRestoreOfflineSession() ? readOfflineUser() : null,
  );

  useEffect(() => {
    setOnSessionLost(() => {
      deactivateBiometricUnlock();
      clearGoogleSignInSession();
      clearOfflineUser();
      setCachedUser(null);
      setStatus('anonymous');
      void queryClient.clear();
    });
    return () => setOnSessionLost(null);
  }, [queryClient]);

  useEffect(() => {
    if (isBiometricUnlockRequired()) return;
    let cancelled = false;
    void refreshSession()
      .then((result) => {
        if (cancelled) return;
        const next = restoreFromRefresh(result);
        if (next === 'anonymous') deactivateBiometricUnlock();
        setStatus(next);
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
        deactivateBiometricUnlock();
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

  const user = status === 'authenticated' ? (meQuery.data ?? cachedUser ?? null) : null;
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    activateBiometricUnlockForUser(userId);
  }, [userId]);

  const value = useMemo(
    () => ({
      status,
      user,
      userLoading: status === 'authenticated' && meQuery.isPending && !meQuery.data && !cachedUser,
      loginWithGoogle: async (credential: string) => {
        await loginWithGoogleCredential(credential);
        markJustLoggedIn();
        setStatus('authenticated');
        await queryClient.invalidateQueries({ queryKey: ['me'] });
      },
      unlockWithBiometrics: async () => {
        await verifyBiometricUnlock();
        try {
          const next = restoreFromRefresh(await refreshSession());
          if (next === 'authenticated') {
            setStatus('authenticated');
            return;
          }
        } catch {
          if (canRestoreOfflineSession()) {
            setStatus('authenticated');
            return;
          }
        }
        deactivateBiometricUnlock();
        setStatus('anonymous');
        throw new Error('A sessão expirou. Entre de novo com o Google.');
      },
      logout: async () => {
        const pushLogout = disableDevicePush().catch(() => {
          /* o logout segue mesmo se o aparelho não desinscrever */
        });
        const sessionLogout = logoutSession();
        deactivateBiometricUnlock();
        clearGoogleSignInSession();
        clearOfflineUser();
        clearOfflineForecast();
        setCachedUser(null);
        setStatus('anonymous');
        queryClient.clear();
        await Promise.all([pushLogout, sessionLogout]);
      },
    }),
    [cachedUser, meQuery.data, meQuery.isPending, queryClient, status, user],
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}
