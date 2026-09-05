import {
  BarChart3,
  Download,
  Home,
  MapPinned,
  RefreshCw,
  Share,
  Shield,
  User,
  WifiOff,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { usePwaLifecycle } from '@/app/hooks/usePwaLifecycle';
import { Button } from '@/design-system/components/Button';
import { TaNoMarLogo } from '@/design-system/brand/TaNoMarLogo';
import { UserMenu } from '@/features/auth/components/UserMenu';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { isAdmin } from '@/features/auth/types/auth';
import { NotificationInbox } from '@/features/notifications/components/NotificationInbox';
import { routes } from '@/shared/constants/routes';
import styles from './AppShell.module.css';

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
  end?: boolean;
}

const navigation: NavItem[] = [
  { to: routes.home, label: 'Início', icon: Home, end: true },
  { to: routes.ranking, label: 'Ranking', icon: BarChart3 },
  { to: routes.locations, label: 'Locais', icon: MapPinned },
];

const mobileNavigation: NavItem[] = [
  ...navigation,
  { to: routes.account, label: 'Conta', icon: User },
];

export function AppShell() {
  const pwa = usePwaLifecycle();
  const auth = useAuth();
  const desktopItems = isAdmin(auth.user)
    ? [...navigation, { to: routes.admin, label: 'Admin', icon: Shield }]
    : navigation;

  return (
    <div className={styles.app}>
      {!pwa.online && (
        <div className={styles.offline} role="status">
          <WifiOff size={15} aria-hidden="true" /> Você está offline. Conecte-se para atualizar a
          previsão.
        </div>
      )}
      {pwa.needRefresh && (
        <div className={styles.update} role="status">
          <span>
            <RefreshCw size={16} aria-hidden="true" /> Uma nova versão está pronta.
          </span>
          <div>
            <Button variant="quiet" onClick={pwa.dismissRefresh}>
              Depois
            </Button>
            <Button onClick={pwa.update}>Atualizar</Button>
          </div>
        </div>
      )}
      {pwa.showIosInstall && (
        <div className={styles.update} role="status">
          <span>
            <Share size={16} aria-hidden="true" /> No iPhone: Compartilhar → Adicionar à Tela de
            Início.
          </span>
          <Button variant="quiet" onClick={pwa.dismissIosInstall}>
            Ok
          </Button>
        </div>
      )}
      <header className={styles.header}>
        <NavLink className={styles.brand} to={routes.home} aria-label="Ir para o início">
          <TaNoMarLogo variant="responsive" />
        </NavLink>
        <nav className={styles.desktopNav} aria-label="Navegação principal">
          {desktopItems.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => (isActive ? styles.active : '')}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className={styles.headerActions}>
          {pwa.canInstall ? (
            <Button className={styles.install} variant="secondary" onClick={pwa.install}>
              <Download size={17} aria-hidden="true" /> Instalar
            </Button>
          ) : null}
          <NotificationInbox />
          <UserMenu />
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
      <nav className={styles.bottomNav} aria-label="Navegação principal">
        <div>
          {mobileNavigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => (isActive ? styles.active : '')}
            >
              <Icon size={21} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
