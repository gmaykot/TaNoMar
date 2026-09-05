import { BookOpen, Heart, LogOut, MapPinned, Settings, Shield } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isAdmin } from '../types/auth';
import { routes } from '@/shared/constants/routes';
import styles from './userMenu.module.css';

export function UserMenu() {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const user = auth.user;
  const initials = user?.name.trim().charAt(0).toUpperCase() || 'T';

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  function close() {
    setOpen(false);
  }

  return (
    <div className={styles.menu} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Abrir menu da conta de ${user.name}`}
        onClick={() => setOpen((value) => !value)}
      >
        {user.pictureUrl ? (
          <img src={user.pictureUrl} alt="" referrerPolicy="no-referrer" />
        ) : (
          <span aria-hidden="true">{initials}</span>
        )}
      </button>
      {open ? (
        <div className={styles.panel} role="menu" aria-label="Menu da conta">
          <div className={styles.identity}>
            <strong>{user.name}</strong>
            <span>{user.email}</span>
            <small>Plano {user.plan.name}</small>
          </div>
          <NavLink
            role="menuitem"
            to={routes.account}
            className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}
            onClick={close}
          >
            <Settings size={17} aria-hidden="true" />
            Conta
          </NavLink>
          <NavLink
            role="menuitem"
            to={routes.locationsMine}
            className={styles.item}
            onClick={close}
          >
            <MapPinned size={17} aria-hidden="true" />
            Meus pesqueiros
          </NavLink>
          <NavLink
            role="menuitem"
            to={routes.locationsFavorites}
            className={styles.item}
            onClick={close}
          >
            <Heart size={17} aria-hidden="true" />
            Favoritos
          </NavLink>
          <NavLink
            role="menuitem"
            to={routes.about}
            className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}
            onClick={close}
          >
            <BookOpen size={17} aria-hidden="true" />
            Sobre
          </NavLink>
          {isAdmin(user) ? (
            <NavLink
              role="menuitem"
              to={routes.admin}
              className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}
              onClick={close}
            >
              <Shield size={17} aria-hidden="true" />
              Administração
            </NavLink>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className={`${styles.item} ${styles.logout}`}
            onClick={() => {
              close();
              void auth.logout();
            }}
          >
            <LogOut size={17} aria-hidden="true" />
            Sair
          </button>
        </div>
      ) : null}
    </div>
  );
}
