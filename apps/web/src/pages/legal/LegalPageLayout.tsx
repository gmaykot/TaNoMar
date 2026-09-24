import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { TaNoMarLogo } from '@/design-system/brand/TaNoMarLogo';
import { routes } from '@/shared/constants/routes';
import styles from './legal.module.css';

export function LegalPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link
          className={styles.brand}
          to={routes.landing}
          aria-label="Voltar à apresentação do TáNoMar"
        >
          <TaNoMarLogo decorative />
        </Link>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
