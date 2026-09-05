import type { ReactNode } from 'react';
import styles from './pages.module.css';

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.pageHeaderCopy}>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className={styles.pageHeaderActions}>{actions}</div> : null}
    </header>
  );
}
