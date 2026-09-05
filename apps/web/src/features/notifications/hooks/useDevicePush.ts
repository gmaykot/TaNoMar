import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getPushPublicKey } from '../services/notificationService';
import {
  canUseWebPush,
  disableDevicePush,
  enableDevicePush,
  getCurrentPushSubscription,
  iosNeedsInstallForPush,
} from '../services/devicePushService';

const pushSubscriptionQueryKey = ['notifications', 'push-subscription'] as const;

export function useDevicePush() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const authenticated = auth.status === 'authenticated';
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const publicKey = useQuery({
    queryKey: ['notifications', 'push-public-key'],
    queryFn: getPushPublicKey,
    enabled: authenticated,
    staleTime: 5 * 60 * 1000,
  });
  const subscription = useQuery({
    queryKey: pushSubscriptionQueryKey,
    queryFn: async () => Boolean(await getCurrentPushSubscription()),
    enabled: authenticated && canUseWebPush(),
    staleTime: 30 * 1000,
  });

  return {
    available: authenticated && canUseWebPush() && Boolean(publicKey.data),
    configured: publicKey.data !== null && publicKey.data !== undefined,
    loading: authenticated && publicKey.isPending,
    iosNeedsInstall: iosNeedsInstallForPush(),
    enabled: Boolean(subscription.data),
    pending,
    error,
    toggle: async (next: boolean) => {
      setPending(true);
      setError(null);
      try {
        if (next) await enableDevicePush();
        else await disableDevicePush();
        await queryClient.invalidateQueries({ queryKey: pushSubscriptionQueryKey });
      } catch {
        setError(
          next
            ? 'Não foi possível ativar os avisos no aparelho.'
            : 'Não foi possível desativar os avisos.',
        );
      } finally {
        setPending(false);
      }
    },
  };
}
