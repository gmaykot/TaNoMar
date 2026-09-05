import { Bell } from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconButton } from '@/design-system/components/IconButton';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  getNotifications,
  markNotificationRead,
  removeNotification,
} from '../services/notificationService';
import styles from './inbox.module.css';

export const notificationsQueryKey = ['notifications'] as const;

export function NotificationInbox() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const notifications = useQuery({
    queryKey: notificationsQueryKey,
    queryFn: getNotifications,
    enabled: auth.status === 'authenticated',
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
  const items = notifications.data ?? [];
  const unread = items.some((item) => !item.readAt);

  const read = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
    },
  });
  const remove = useMutation({
    mutationFn: removeNotification,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
    },
  });

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) await notifications.refetch();
  }

  return (
    <div className={styles.inbox}>
      <div className={styles.trigger}>
        <IconButton label="Notificações" onClick={() => void toggleOpen()}>
          <Bell size={18} aria-hidden="true" />
          {unread ? <span className={styles.unread} /> : null}
        </IconButton>
      </div>
      {open ? (
        <div className={styles.panel} role="region" aria-label="Notificações">
          {notifications.isPending ? (
            <p className={styles.empty} role="status">
              Carregando avisos.
            </p>
          ) : notifications.isError ? (
            <p className={styles.empty} role="status">
              Não foi possível abrir as notificações.
            </p>
          ) : items.length === 0 ? (
            <p className={styles.empty}>Nenhuma notificação no momento.</p>
          ) : (
            items.map((item) => (
              <article key={item.id} className={styles.item}>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
                <div>
                  {!item.readAt ? (
                    <button type="button" onClick={() => read.mutate(item.id)}>
                      Marcar como lida
                    </button>
                  ) : null}
                  <button type="button" onClick={() => remove.mutate(item.id)}>
                    Remover
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
