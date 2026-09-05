import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import type { AdminUser } from '../types/adminUser';
import styles from './adminUsers.module.css';

const protectionLabel = {
  self: 'Você não pode bloquear a própria conta.',
  bootstrap: 'A conta inicial do bootstrap permanece Premium e ativa.',
  last_admin: 'Mantenha pelo menos um admin ativo.',
} as const;

function formatCreatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR');
}

interface AdminUserCardProps {
  user: AdminUser;
  pending?: boolean;
  error?: string | null;
  onPlanChange: (planCode: 'free' | 'premium') => void;
  onActiveChange: (isActive: boolean) => void;
}

export function AdminUserCard({
  user,
  pending = false,
  error,
  onPlanChange,
  onActiveChange,
}: AdminUserCardProps) {
  const initials = user.name.trim().charAt(0).toUpperCase() || 'T';
  const protectionText = user.protection ? protectionLabel[user.protection] : null;

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
            <span className={styles.chip}>Desde {formatCreatedAt(user.createdAt)}</span>
          </div>
        </div>
      </div>
      <div className={styles.actions}>
        <Button
          type="button"
          variant={user.plan.code === 'free' ? 'primary' : 'secondary'}
          disabled={pending || !user.canChangePlan || user.plan.code === 'free'}
          onClick={() => onPlanChange('free')}
        >
          Free
        </Button>
        <Button
          type="button"
          variant={user.plan.code === 'premium' ? 'primary' : 'secondary'}
          disabled={pending || !user.canChangePlan || user.plan.code === 'premium'}
          onClick={() => onPlanChange('premium')}
        >
          Premium
        </Button>
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
