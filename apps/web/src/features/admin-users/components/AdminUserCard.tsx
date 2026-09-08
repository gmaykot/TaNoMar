import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import type { AdminPlanCode, AdminUser } from '../types/adminUser';
import styles from './adminUsers.module.css';

const protectionLabel = {
  self: 'Você não pode bloquear a própria conta.',
  bootstrap: 'A conta inicial do bootstrap não pode ser bloqueada.',
  last_admin: 'Mantenha pelo menos um admin ativo.',
} as const;

const paidPlans = [
  { code: 'arrais', label: 'Arrais' },
  { code: 'premium', label: 'Mestre' },
  { code: 'capitao', label: 'Capitão' },
] as const;

function formatCreatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR');
}

interface AdminUserCardProps {
  user: AdminUser;
  pending?: boolean;
  error?: string | null;
  enabledPlanCodes?: ReadonlySet<string> | null;
  onPlanChange: (planCode: AdminPlanCode) => void;
  onActiveChange: (isActive: boolean) => void;
  onRoleChange: (role: 'Admin' | 'User') => void;
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

  function canAssign(code: string) {
    if (pending || !user.canChangePlan || user.plan.code === code) return false;
    if (enabledPlanCodes && !enabledPlanCodes.has(code)) return false;
    return true;
  }

  return (
    <Card as="article" className={`${styles.card} ${user.isActive ? '' : styles.cardBlocked}`}>
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
            <span className={styles.chip}>{user.role === 'Admin' ? 'Admin' : 'Usuário'}</span>
            <span className={user.isActive ? styles.chip : `${styles.chip} ${styles.chipWarn}`}>
              {user.isActive ? 'Ativo' : 'Bloqueado'}
            </span>
            {user.isSelf ? <span className={`${styles.chip} ${styles.chipSelf}`}>Você</span> : null}
            {user.protection === 'bootstrap' ? (
              <span className={`${styles.chip} ${styles.chipBootstrap}`}>Conta inicial</span>
            ) : null}
            <span className={styles.chip}>Desde {formatCreatedAt(user.createdAt)}</span>
          </div>
        </div>
      </div>
      <div className={styles.actions}>
        <Button
          type="button"
          variant={user.plan.code === 'free' ? 'primary' : 'secondary'}
          disabled={!canAssign('free')}
          onClick={() => onPlanChange('free')}
        >
          Free
        </Button>
        {paidPlans.map((plan) => (
          <Button
            key={plan.code}
            type="button"
            variant={user.plan.code === plan.code ? 'primary' : 'secondary'}
            disabled={!canAssign(plan.code)}
            onClick={() => onPlanChange(plan.code)}
          >
            {plan.label}
          </Button>
        ))}
        {user.canChangeRole && user.role === 'Admin' ? (
          <Button
            type="button"
            variant="quiet"
            disabled={pending}
            onClick={() => onRoleChange('User')}
          >
            Rebaixar
          </Button>
        ) : null}
        {user.canChangeRole && user.role !== 'Admin' ? (
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => onRoleChange('Admin')}
          >
            Tornar admin
          </Button>
        ) : null}
        {user.isActive ? (
          <Button
            type="button"
            variant="quiet"
            disabled={pending || !user.canDeactivate}
            onClick={() => onActiveChange(false)}
          >
            Bloquear
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            disabled={pending || user.protection === 'bootstrap'}
            onClick={() => onActiveChange(true)}
          >
            Liberar
          </Button>
        )}
      </div>
      {protectionText && (!user.canChangePlan || !user.canDeactivate) ? (
        <p className={styles.note}>{protectionText}</p>
      ) : null}
      {error ? <p className={styles.error}>{error}</p> : null}
    </Card>
  );
}
