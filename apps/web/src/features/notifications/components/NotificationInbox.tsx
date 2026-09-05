import { Bell } from 'lucide-react';
import { useState } from 'react';
import { IconButton } from '@/design-system/components/IconButton';
import { useNotificationInbox } from '../hooks/useNotificationInbox';
import styles from './inbox.module.css';

export function NotificationInbox() {
  const [open, setOpen] = useState(false);
  const inbox = useNotificationInbox(open);

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) await inbox.refetchList();
  }

  return (
    <div className={styles.inbox}>
      <div className={styles.trigger}>
        <IconButton label="Notificações" onClick={() => void toggleOpen()}>
          <Bell size={18} aria-hidden="true" />
          {inbox.unread ? <span className={styles.unread} /> : null}
        </IconButton>
      </div>
      {open ? (
        <div className={styles.panel} role="region" aria-label="Notificações">
          {inbox.listPending ? (
            <p className={styles.empty} role="status">
              Carregando avisos.
            </p>
          ) : inbox.listError ? (
            <p className={styles.empty} role="status">
              Não foi possível abrir as notificações.
            </p>
          ) : inbox.items.length === 0 ? (
            <p className={styles.empty}>Nenhuma notificação no momento.</p>
          ) : (
            inbox.items.map((item) => (
              <article key={item.id} className={styles.item}>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
                <div>
                  {!item.readAt ? (
                    <button type="button" onClick={() => inbox.markRead(item.id)}>
                      Marcar como lida
                    </button>
                  ) : null}
                  <button type="button" onClick={() => inbox.remove(item.id)}>
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
