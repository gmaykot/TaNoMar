import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, EllipsisVertical } from 'lucide-react';
import { Card } from '@/design-system/components/Card';
import { IconButton } from '@/design-system/components/IconButton';
import type { AdminPlanCode, AdminUser } from '../types/adminUser';
import styles from './adminUsers.module.css';

const protectionLabel = {
  self: 'Você não pode bloquear a própria conta.',
  bootstrap: 'A conta inicial do bootstrap não pode ser bloqueada.',
  last_admin: 'Mantenha pelo menos um admin ativo.',
} as const;

const planActions = [
  { code: 'free', label: 'Plano Free' },
  { code: 'arrais', label: 'Plano Arrais' },
  { code: 'premium', label: 'Plano Mestre' },
  { code: 'capitao', label: 'Plano Capitão' },
] as const;

interface AdminUserCardProps {
  user: AdminUser;
  pending?: boolean;
  error?: string | null;
  enabledPlanCodes?: ReadonlySet<string> | null;
  onPlanChange: (planCode: AdminPlanCode) => void;
  onActiveChange: (isActive: boolean) => void;
  onRoleChange: (role: 'Admin' | 'User') => void;
}

function isAdminRole(role: string) {
  return role.toLowerCase() === 'admin';
}

function menuPanelStyle(trigger: HTMLElement): CSSProperties {
  const rect = trigger.getBoundingClientRect();
  const gutter = 8;
  const width = Math.min(264, window.innerWidth - gutter * 2);
  const left = Math.min(Math.max(gutter, rect.right - width), window.innerWidth - width - gutter);
  const spaceBelow = window.innerHeight - rect.bottom - gutter;
  const spaceAbove = rect.top - gutter;
  const openUp = spaceBelow < 240 && spaceAbove > spaceBelow;
  const maxHeight = Math.max(160, Math.min(360, (openUp ? spaceAbove : spaceBelow) - gutter));
  if (openUp) {
    return { bottom: window.innerHeight - rect.top + 8, left, width, maxHeight };
  }
  return { top: rect.bottom + 8, left, width, maxHeight };
}

function ActionMenuItem({
  current = false,
  danger = false,
  disabled = false,
  onSelect,
  children,
}: {
  current?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`${styles.menuItem} ${current ? styles.menuItemCurrent : ''} ${danger ? styles.menuItemDanger : ''}`}
      disabled={disabled}
      aria-current={current ? 'true' : undefined}
      onClick={onSelect}
    >
      <span>{children}</span>
      {current ? <Check size={16} aria-hidden="true" /> : null}
    </button>
  );
}

export function AdminUserCard({
  user,
  pending = false,
  error,
  enabledPlanCodes = null,
  onPlanChange,
  onActiveChange,
  onRoleChange,
}: AdminUserCardProps) {
  const initials = user.name.trim().charAt(0).toUpperCase() || 'T';
  const protectionText = user.protection ? protectionLabel[user.protection] : null;
  const [menuOpen, setMenuOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!menuOpen) return;

    function update() {
      const trigger = menuRef.current;
      if (!trigger) return;
      setPanelStyle(menuPanelStyle(trigger));
    }

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setMenuOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  function canAssign(code: string) {
    if (pending || !user.canChangePlan || user.plan.code === code) return false;
    if (enabledPlanCodes && !enabledPlanCodes.has(code)) return false;
    return true;
  }

  function closeAnd(run: () => void) {
    setMenuOpen(false);
    run();
  }

  const admin = isAdminRole(user.role);

  return (
    <Card as="article" className={`${styles.card} ${user.isActive ? '' : styles.cardBlocked}`}>
      <div className={styles.row}>
        <div className={styles.identity}>
          <span className={styles.avatar}>
            {user.pictureUrl ? (
              <img src={user.pictureUrl} alt="" referrerPolicy="no-referrer" />
            ) : (
              initials
            )}
          </span>
          <div className={styles.copy}>
            <strong>{user.name}</strong>
            <span>{user.email}</span>
            <div className={styles.meta}>
              <span className={styles.chip}>{user.plan.name}</span>
              <span className={styles.chip}>{admin ? 'Admin' : 'Usuário'}</span>
              <span className={user.isActive ? styles.chip : `${styles.chip} ${styles.chipWarn}`}>
                {user.isActive ? 'Ativo' : 'Bloqueado'}
              </span>
              {user.isSelf ? (
                <span className={`${styles.chip} ${styles.chipSelf}`}>Você</span>
              ) : null}
              {user.protection === 'bootstrap' ? (
                <span className={`${styles.chip} ${styles.chipBootstrap}`}>Conta inicial</span>
              ) : null}
            </div>
          </div>
        </div>
        <div className={styles.menu} ref={menuRef}>
          <IconButton
            label={`Ações da conta de ${user.name}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            disabled={pending}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <EllipsisVertical size={18} aria-hidden="true" />
          </IconButton>
          {menuOpen
            ? createPortal(
                <div
                  ref={panelRef}
                  className={styles.panel}
                  style={panelStyle}
                  role="menu"
                  aria-label={`Ações de ${user.name}`}
                >
                  <p className={styles.menuLabel}>Cargo</p>
                  <ActionMenuItem
                    disabled={pending || !user.canChangeRole}
                    onSelect={() => closeAnd(() => onRoleChange(admin ? 'User' : 'Admin'))}
                  >
                    {admin ? 'Rebaixar' : 'Tornar admin'}
                  </ActionMenuItem>
                  {user.isActive ? (
                    <ActionMenuItem
                      danger
                      disabled={pending || !user.canDeactivate}
                      onSelect={() => closeAnd(() => onActiveChange(false))}
                    >
                      Bloquear
                    </ActionMenuItem>
                  ) : (
                    <ActionMenuItem
                      disabled={pending || user.protection === 'bootstrap'}
                      onSelect={() => closeAnd(() => onActiveChange(true))}
                    >
                      Liberar
                    </ActionMenuItem>
                  )}
                  <div className={styles.menuDivider} role="separator" />
                  <p className={styles.menuLabel}>Plano</p>
                  {planActions.map((plan) => (
                    <ActionMenuItem
                      key={plan.code}
                      current={user.plan.code === plan.code}
                      disabled={!canAssign(plan.code)}
                      onSelect={() => closeAnd(() => onPlanChange(plan.code))}
                    >
                      {plan.label}
                    </ActionMenuItem>
                  ))}
                </div>,
                document.body,
              )
            : null}
        </div>
      </div>
      {protectionText && (!user.canChangePlan || !user.canDeactivate) ? (
        <p className={styles.note}>{protectionText}</p>
      ) : null}
      {error ? <p className={styles.error}>{error}</p> : null}
    </Card>
  );
}
