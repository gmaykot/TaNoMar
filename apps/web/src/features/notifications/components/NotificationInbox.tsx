import { Bell } from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconButton } from '@/design-system/components/IconButton';
import {
  getNotifications,
  markNotificationRead,
  removeNotification,
} from '../services/notificationService';
import styles from './inbox.module.css';

export function NotificationInbox() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const notifications = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    staleTime: 30 * 1000,
  });
  const items = notifications.data ?? [];
  const unread = items.some((item) => !item.readAt);

  const read = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
  const remove = useMutation({
    mutationFn: removeNotification,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return (
    <div className={styles.inbox}>
      <div className={styles.trigger}>
        <IconButton label="Notificações" onClick={() => setOpen((value) => !value)}>
          <Bell size={18} aria-hidden="true" />
          {unread ? <span className={styles.unread} /> : null}
        </IconButton>
      </div>
      {open ? (
        <div className={styles.panel} role="region" aria-label="Notificações">
          {items.length === 0 ? (
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
