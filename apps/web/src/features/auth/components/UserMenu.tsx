import { BookOpen, LogOut, RefreshCw, Settings, Shield, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { showSaveConfirmation } from '@/app/layout/saveConfirmationEvents';
import { usePwaLifecycle } from '@/app/hooks/usePwaLifecycle';
import { useAuth } from '../hooks/useAuth';
import { isAdmin, isPaidPlan } from '../types/auth';
import { routes } from '@/shared/constants/routes';
import styles from './userMenu.module.css';

const updateCheckMessage = {
  current: 'Você já está na versão mais recente.',
  unavailable: 'Atualização automática indisponível neste navegador.',
  offline: 'Conecte-se à internet para verificar atualizações.',
  error: 'Não foi possível verificar agora. Tente de novo em instantes.',
} as const;

export function UserMenu() {
  const auth = useAuth();
  const pwa = usePwaLifecycle();
  const [open, setOpen] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
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
            <span className={`${styles.planBadge} ${isPaidPlan(user) ? styles.planPaid : ''}`}>
              Plano {user.plan.name}
            </span>
          </div>
          <NavLink
            role="menuitem"
            to={isPaidPlan(user) ? `${routes.premium}#assinatura` : routes.premium}
            className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}
            onClick={close}
          >
            <Sparkles size={17} aria-hidden="true" />
            {isPaidPlan(user) ? 'Gerenciar assinatura' : 'Conhecer os planos'}
          </NavLink>
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
            className={styles.item}
            disabled={checkingUpdate}
            onClick={() => {
              close();
              setCheckingUpdate(true);
              void pwa.checkForUpdate().then((result) => {
                if (result === 'updated') {
                  showSaveConfirmation('Nova versão encontrada. Recarregando o aplicativo…');
                  return;
                }
                showSaveConfirmation(updateCheckMessage[result]);
              }).finally(() => setCheckingUpdate(false));
            }}
          >
            <RefreshCw size={17} aria-hidden="true" />
            Verificar atualização
          </button>
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
