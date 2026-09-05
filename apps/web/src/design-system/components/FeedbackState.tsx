import type { LucideIcon } from 'lucide-react';
import { Anchor } from 'lucide-react';
import styles from './components.module.css';

interface FeedbackStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  busy?: boolean;
}

export function FeedbackState({
  title,
  description,
  icon: Icon = Anchor,
  busy = false,
}: FeedbackStateProps) {
  return (
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
      {busy ? (
        <span className={styles.feedbackDots} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      ) : null}
    </div>
  );
}
