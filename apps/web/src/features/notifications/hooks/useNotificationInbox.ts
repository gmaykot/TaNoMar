import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  getNotifications,
  getUnreadNotifications,
  markNotificationRead,
  removeNotification,
  subscribeNotificationStream,
} from '@/features/notifications/services/notificationService';

export const notificationsQueryKey = ['notifications'] as const;
export const notificationsUnreadQueryKey = ['notifications', 'unread'] as const;

export function useNotificationInbox(open: boolean) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const authenticated = auth.status === 'authenticated';

  const unreadQuery = useQuery({
    queryKey: notificationsUnreadQueryKey,
    queryFn: getUnreadNotifications,
    enabled: authenticated,
    staleTime: 30 * 1000,
    refetchInterval: authenticated ? 2 * 60 * 1000 : false,
    refetchOnWindowFocus: true,
  });

  const listQuery = useQuery({
    queryKey: notificationsQueryKey,
    queryFn: getNotifications,
    enabled: authenticated && open,
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (!authenticated) return;
    const controller = new AbortController();
    let stopped = false;

    const connect = async () => {
      while (!stopped && !controller.signal.aborted) {
        try {
          await subscribeNotificationStream((unread) => {
            queryClient.setQueryData(notificationsUnreadQueryKey, { unread });
            if (open) void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
          }, controller.signal);
        } catch {
          if (stopped || controller.signal.aborted) return;
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }
    };

    void connect();
    return () => {
      stopped = true;
      controller.abort();
    };
  }, [authenticated, open, queryClient]);

  const read = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      await queryClient.invalidateQueries({ queryKey: notificationsUnreadQueryKey });
    },
  });
  const remove = useMutation({
    mutationFn: removeNotification,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      await queryClient.invalidateQueries({ queryKey: notificationsUnreadQueryKey });
    },
  });

  return {
    items: listQuery.data ?? [],
    unread: unreadQuery.data?.unread ?? false,
    listPending: listQuery.isPending,
    listError: listQuery.isError,
    refetchList: listQuery.refetch,
    markRead: read.mutate,
    remove: remove.mutate,
  };
}
