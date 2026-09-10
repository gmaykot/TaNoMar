import { BarChart3, Home, MapPinned, User } from 'lucide-react';
import type { ReactNode } from 'react';
import { TaNoMarLogo } from '@/design-system/brand/TaNoMarLogo';
import styles from './landingPreview.module.css';

const tabs = [
  { id: 'inicio', label: 'Início', icon: Home },
  { id: 'ranking', label: 'Ranking', icon: BarChart3 },
  { id: 'locais', label: 'Locais', icon: MapPinned },
  { id: 'conta', label: 'Conta', icon: User },
] as const;

export function LandingAppFrame({
  active,
  label,
  children,
}: {
  active: 'inicio' | 'ranking';
  label: string;
  children: ReactNode;
}) {
  return (
    <figure className={styles.appPreview}>
      <div className={styles.appFrame} aria-hidden="true" inert>
        <div className={styles.appFrameHeader}>
          <TaNoMarLogo decorative />
          <span className={styles.appFrameNav}>
            <span className={active === 'inicio' ? styles.appFrameNavActive : undefined}>
              Início
            </span>
            <span className={active === 'ranking' ? styles.appFrameNavActive : undefined}>
              Ranking
            </span>
            <span>Locais</span>
          </span>
        </div>
        <div className={styles.appFrameBody}>{children}</div>
        <div className={styles.appFrameTabs}>
          {tabs.map(({ id, label: tabLabel, icon: Icon }) => (
            <span className={id === active ? styles.appFrameTabActive : undefined} key={id}>
              <Icon size={18} aria-hidden="true" />
              {tabLabel}
            </span>
          ))}
        </div>
      </div>
      <figcaption>{label}</figcaption>
    </figure>
  );
}
