import { useState } from 'react';
import { EllipsisVertical, Shield, UserRound } from 'lucide-react';
import { Card } from '@/design-system/components/Card';
import { IconButton } from '@/design-system/components/IconButton';
import { Stamp } from '@/design-system/components/Stamp';
import { PlanIcon } from '@/features/subscription/components/PlanIcon';
import type { PlanCatalog } from '@/features/subscription/subscriptionPlans';
import type { AdminPlanCode, AdminUser } from '../types/adminUser';
import { AdminUserActionsSheet } from './AdminUserActionsSheet';
import styles from './adminUsers.module.css';

const protectionLabel = {
  self: 'Você não pode bloquear nem excluir a própria conta.',
  bootstrap: 'A conta inicial do bootstrap não pode ser bloqueada nem excluída.',
  last_admin: 'Mantenha pelo menos um admin ativo.',
} as const;

interface AdminUserCardProps {
  user: AdminUser;
  pending?: boolean;
  error?: string | null;
  plans?: PlanCatalog[] | null;
  enabledPlanCodes?: ReadonlySet<string> | null;
  onPlanChange: (planCode: AdminPlanCode) => void;
  onActiveChange: (isActive: boolean) => void;
  onRoleChange: (role: 'Admin' | 'User') => void;
  onDelete: () => void;
}

function isAdminRole(role: string) {
  return role.toLowerCase() === 'admin';
}

export function AdminUserCard({
  user,
  pending = false,
  error,
  plans = null,
  enabledPlanCodes = null,
  onPlanChange,
  onActiveChange,
  onRoleChange,
  onDelete,
}: AdminUserCardProps) {
  const initials = user.name.trim().charAt(0).toUpperCase() || 'T';
  const protectionText = user.protection
    ? protectionLabel[user.protection]
    : user.canDelete
      ? null
      : protectionLabel.last_admin;
  const [menuOpen, setMenuOpen] = useState(false);
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
              <span
                className={`${styles.chip} ${user.plan.code !== 'free' ? styles.chipPlan : ''}`}
              >
                <PlanIcon code={user.plan.code} size={12} framed={false} />
                {user.plan.name}
              </span>
              <span className={styles.chip}>{admin ? 'Admin' : 'Usuário'}</span>
              <span className={user.isActive ? styles.chip : `${styles.chip} ${styles.chipWarn}`}>
                {user.isActive ? 'Ativo' : 'Bloqueado'}
              </span>
              {user.isSelf ? (
                <Stamp icon={UserRound} tone="coral">
                  Você
                </Stamp>
              ) : null}
              {user.protection === 'bootstrap' ? (
                <Stamp icon={Shield} tone="ocean">
                  Conta inicial
                </Stamp>
              ) : null}
            </div>
          </div>
        </div>
        <div className={styles.menu}>
          <IconButton
            label={`Ações da conta de ${user.name}`}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            disabled={pending}
            onClick={() => setMenuOpen(true)}
          >
            <EllipsisVertical size={18} aria-hidden="true" />
          </IconButton>
        </div>
      </div>
      {protectionText && (!user.canChangePlan || !user.canDeactivate || !user.canDelete) ? (
        <p className={styles.note}>{protectionText}</p>
      ) : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      {menuOpen ? (
        <AdminUserActionsSheet
          user={user}
          pending={pending}
          plans={plans}
          enabledPlanCodes={enabledPlanCodes}
          onClose={() => setMenuOpen(false)}
          onPlanChange={onPlanChange}
          onActiveChange={onActiveChange}
          onRoleChange={onRoleChange}
          onDelete={onDelete}
        />
      ) : null}
    </Card>
  );
}
