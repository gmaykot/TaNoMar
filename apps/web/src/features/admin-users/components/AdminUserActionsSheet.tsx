import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import sheetStyles from '@/design-system/components/confirmDrawer.module.css';
import type { AdminPlanCode, AdminUser } from '../types/adminUser';
import styles from './adminUsers.module.css';

const planActions = [
  { code: 'free', label: 'Plano Free' },
  { code: 'arrais', label: 'Plano Arrais' },
  { code: 'premium', label: 'Plano Mestre' },
  { code: 'capitao', label: 'Plano Capitão' },
] as const;

function isAdminRole(role: string) {
  return role.toLowerCase() === 'admin';
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

interface AdminUserActionsSheetProps {
  user: AdminUser;
  pending?: boolean;
  enabledPlanCodes?: ReadonlySet<string> | null;
  onClose: () => void;
  onPlanChange: (planCode: AdminPlanCode) => void;
  onActiveChange: (isActive: boolean) => void;
  onRoleChange: (role: 'Admin' | 'User') => void;
}

export function AdminUserActionsSheet({
  user,
  pending = false,
  enabledPlanCodes = null,
  onClose,
  onPlanChange,
  onActiveChange,
  onRoleChange,
}: AdminUserActionsSheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const admin = isAdminRole(user.role);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  function canAssign(code: string) {
    if (pending || !user.canChangePlan || user.plan.code === code) return false;
    if (enabledPlanCodes && !enabledPlanCodes.has(code)) return false;
    return true;
  }

  function choose(run: () => void) {
    onClose();
    run();
  }

  return createPortal(
    <div className={sheetStyles.root}>
      <button
        type="button"
        className={sheetStyles.backdrop}
        onClick={onClose}
        aria-label="Fechar ações"
      />
      <div
        ref={panelRef}
        className={sheetStyles.drawer}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className={sheetStyles.handle} aria-hidden="true" />
        <span className={sheetStyles.meta}>Ações</span>
        <h2 id={titleId}>Ações de {user.name}</h2>
        <div className={styles.sheetList} role="menu" aria-label={`Ações de ${user.name}`}>
          <p className={styles.menuLabel}>Cargo</p>
          <ActionMenuItem
            disabled={pending || !user.canChangeRole}
            onSelect={() => choose(() => onRoleChange(admin ? 'User' : 'Admin'))}
          >
            {admin ? 'Rebaixar' : 'Tornar admin'}
          </ActionMenuItem>
          {user.isActive ? (
            <ActionMenuItem
              danger
              disabled={pending || !user.canDeactivate}
              onSelect={() => choose(() => onActiveChange(false))}
            >
              Bloquear
            </ActionMenuItem>
          ) : (
            <ActionMenuItem
              disabled={pending || user.protection === 'bootstrap'}
              onSelect={() => choose(() => onActiveChange(true))}
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
              onSelect={() => choose(() => onPlanChange(plan.code))}
            >
              {plan.label}
            </ActionMenuItem>
          ))}
        </div>
        <Button type="button" variant="quiet" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </div>,
    document.body,
  );
}
