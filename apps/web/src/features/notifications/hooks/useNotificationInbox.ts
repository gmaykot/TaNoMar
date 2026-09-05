import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  confirmReport,
  contestReport,
  getReports,
} from '@/features/community/services/communityService';
import {
  getNotifications,
  getUnreadNotifications,
  markNotificationRead,
  removeNotification,
  subscribeNotificationStream,
} from '@/features/notifications/services/notificationService';

export const notificationsQueryKey = ['notifications'] as const;
export const notificationsUnreadQueryKey = ['notifications', 'unread'] as const;
export const communityReportsQueryKey = ['community-reports'] as const;

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

  const reportsQuery = useQuery({
    queryKey: communityReportsQueryKey,
    queryFn: () => getReports(),
    enabled: authenticated,
    staleTime: 30 * 1000,
    refetchInterval: authenticated ? 2 * 60 * 1000 : false,
    refetchOnWindowFocus: true,
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
            void queryClient.invalidateQueries({ queryKey: communityReportsQueryKey });
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
  const vote = useMutation({
    mutationFn: ({ id, kind }: { id: string; kind: 'confirm' | 'contest' }) =>
      kind === 'confirm' ? confirmReport(id) : contestReport(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: communityReportsQueryKey });
    },
  });

  const reports = reportsQuery.data ?? [];
  const pendingReports = reports.some((report) => !report.isMine && report.myVote == null);

  return {
    items: listQuery.data ?? [],
    reports,
    canVote: auth.user?.plan.code === 'premium',
    unread: (unreadQuery.data?.unread ?? false) || pendingReports,
    listPending: (open && listQuery.isPending) || reportsQuery.isPending,
    listError: (open && listQuery.isError) || reportsQuery.isError,
    refetchList: async () => {
      await Promise.all([listQuery.refetch(), reportsQuery.refetch()]);
    },
    markRead: read.mutate,
    remove: remove.mutate,
    voteReport: vote.mutate,
    votePending: vote.isPending,
  };
}
