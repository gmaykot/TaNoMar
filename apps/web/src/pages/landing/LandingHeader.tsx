import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TaNoMarLogo } from '@/design-system/brand/TaNoMarLogo';
import { routes } from '@/shared/constants/routes';
import styles from './landing.module.css';

const navigation = [
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#recursos', label: 'Recursos' },
  { href: '#planos', label: 'Planos' },
  { href: '#instalar', label: 'Instalar' },
];

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <a className={styles.brand} href="#inicio" aria-label="Ir para o início da página">
          <TaNoMarLogo variant="responsive" />
        </a>
        <nav className={styles.desktopNavigation} aria-label="Navegação da apresentação">
          {navigation.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className={styles.desktopActions}>
          <Link className={styles.secondaryCta} to={routes.login}>
            Entrar
          </Link>
          <Link className={styles.primaryCta} to={routes.login}>
            Acessar o TáNoMar
          </Link>
        </div>
        <button
          className={styles.menuButton}
          type="button"
          aria-expanded={menuOpen}
          aria-controls="landing-mobile-menu"
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          onClick={() => setMenuOpen((current) => !current)}
        >
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>
      {menuOpen ? (
        <nav
          className={styles.mobileNavigation}
          id="landing-mobile-menu"
          aria-label="Navegação da apresentação no celular"
        >
          {navigation.map((item) => (
            <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
              {item.label}
            </a>
          ))}
          <Link className={styles.secondaryCta} to={routes.login}>
            Entrar
          </Link>
          <Link className={styles.primaryCta} to={routes.login}>
            Acessar o TáNoMar
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
