import { Bell, Lock } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/design-system/components/Button';
import { IconButton } from '@/design-system/components/IconButton';
import type { CommunityReport, ReportType } from '@/features/community/types/community';
import { shortcutForComment } from '@/features/community/utils/reportShortcuts';
import { routes } from '@/shared/constants/routes';
import { formatDateTime } from '@/shared/utils/formatDateTime';
import { useNotificationInbox } from '../hooks/useNotificationInbox';
import styles from './inbox.module.css';

const typeLabel: Record<ReportType, string> = {
  condicao: 'Condição',
  perigo: 'Perigo',
};

export function NotificationInbox() {
  const [open, setOpen] = useState(false);
  const inbox = useNotificationInbox(open);

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) await inbox.refetchList();
  }

  const empty = inbox.items.length === 0 && inbox.reports.length === 0;

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
          ) : empty ? (
            <p className={styles.empty}>Nenhuma notificação no momento.</p>
          ) : (
            <>
              {inbox.reports.map((report) => (
                <InboxReport
                  key={report.id}
                  report={report}
                  canVote={inbox.canVote}
                  votePending={inbox.votePending}
                  onVote={inbox.voteReport}
                  onNavigate={() => setOpen(false)}
                />
              ))}
              {inbox.items.map((item) => (
                <article key={item.id} className={styles.item}>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                  <time className={styles.when} dateTime={item.createdAt}>
                    {formatDateTime(item.createdAt)}
                  </time>
                  <div className={styles.actions}>
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
              ))}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function InboxReport({
  report,
  canVote,
  votePending,
  onVote,
  onNavigate,
}: {
  report: CommunityReport;
  canVote: boolean;
  votePending: boolean;
  onVote: (input: { id: string; kind: 'confirm' | 'contest' }) => void;
  onNavigate: () => void;
}) {
  const shortcut = shortcutForComment(report.comment);
  const title = shortcut?.label ?? typeLabel[report.type];

  return (
    <article className={`${styles.item} ${report.type === 'perigo' ? styles.danger : ''}`}>
      <span className={styles.meta}>{report.spotName}</span>
      <strong>{title}</strong>
      <p>
        {report.isMine ? 'Você' : report.authorName} ·{' '}
        <time dateTime={report.createdAt}>{formatDateTime(report.createdAt)}</time>
      </p>
      <p>
        {report.confirmations} confirmaram · {report.contested} contestaram
      </p>
      {report.comment && report.comment !== shortcut?.label ? <p>{report.comment}</p> : null}
      <div className={styles.votes}>
        {report.isMine ? null : canVote ? (
          <>
            <Button
              type="button"
              variant={report.myVote === 'confirm' ? 'primary' : 'secondary'}
              onClick={() => onVote({ id: report.id, kind: 'confirm' })}
              disabled={votePending}
            >
              Confirmar
            </Button>
            <Button
              type="button"
              variant={report.myVote === 'contest' ? 'primary' : 'quiet'}
              onClick={() => onVote({ id: report.id, kind: 'contest' })}
              disabled={votePending}
            >
              Contestar
            </Button>
          </>
        ) : (
          <>
            <Button type="button" locked aria-label="Confirmar bloqueado no plano atual">
              <Lock size={16} aria-hidden="true" />
              Confirmar
            </Button>
            <Button type="button" locked aria-label="Contestar bloqueado no plano atual">
              <Lock size={16} aria-hidden="true" />
              Contestar
            </Button>
          </>
        )}
        <Link
          className={styles.link}
          to={routes.locationDetails(report.spotId)}
          onClick={onNavigate}
        >
          Ver local
        </Link>
      </div>
    </article>
  );
}
