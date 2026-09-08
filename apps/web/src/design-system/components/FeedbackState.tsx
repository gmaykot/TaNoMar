import type { LucideIcon } from 'lucide-react';
import { Anchor } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from './components.module.css';

interface FeedbackStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  busy?: boolean;
  screen?: boolean;
  action?: ReactNode;
}

export function FeedbackState({
  title,
  description,
  icon: Icon = Anchor,
  busy = false,
  screen = false,
  action,
}: FeedbackStateProps) {
  const content = (
    <div className={`${styles.feedback} ${busy ? styles.busy : ''}`} role="status" aria-busy={busy}>
      <span className={styles.feedbackMark}>
        {busy ? (
          <>
            <span className={styles.feedbackRipple} aria-hidden="true" />
            <span className={styles.feedbackRipple} aria-hidden="true" />
          </>
        ) : null}
        <Icon aria-hidden="true" size={28} />
      </span>
      <strong>{title}</strong>
      <p>{description}</p>
      {action ? <div className={styles.feedbackAction}>{action}</div> : null}
      {busy ? (
        <span className={styles.feedbackDots} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      ) : null}
    </div>
  );

  if (!screen) return content;
  return (
    <div className={styles.screen} data-layout="screen">
      {content}
    </div>
  );
}
