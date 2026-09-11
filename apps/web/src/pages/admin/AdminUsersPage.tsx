import { useMemo, useState } from 'react';
import { ArrowLeft, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { showSaveConfirmation } from '@/app/layout/saveConfirmationEvents';
import { ConfirmDrawer } from '@/design-system/components/ConfirmDrawer';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { SearchField } from '@/design-system/components/SearchField';
import { AdminUserCard } from '@/features/admin-users/components/AdminUserCard';
import userStyles from '@/features/admin-users/components/adminUsers.module.css';
import { adminUsersQueryKey, useAdminUsers } from '@/features/admin-users/hooks/useAdminUsers';
import { useAdminPlans } from '@/features/admin-plans/hooks/useAdminPlans';
import {
  deleteAdminUser,
  setAdminUserActive,
  setAdminUserPlan,
  setAdminUserRole,
} from '@/features/admin-users/services/adminUsersService';
import type { AdminPlanCode } from '@/features/admin-users/types/adminUser';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { isPaidPlan } from '@/features/auth/types/auth';
import { PageHeader } from '@/pages/shared/PageHeader';
import { ApiError } from '@/shared/api/errors';
import { routes } from '@/shared/constants/routes';
import { normalizeText } from '@/shared/utils/normalizeText';
import styles from '@/pages/shared/pages.module.css';

type Filter = 'all' | 'paid' | 'free' | 'blocked';

type PendingAccountChange =
  | { kind: 'plan'; id: string; name: string; planCode: AdminPlanCode; planName: string }
  | { kind: 'active'; id: string; name: string; isActive: boolean }
  | { kind: 'role'; id: string; name: string; role: 'Admin' | 'User' }
  | { kind: 'delete'; id: string; name: string };

const planLabel: Record<AdminPlanCode, string> = {
  free: 'Free',
  arrais: 'Arrais',
  premium: 'Mestre',
  capitao: 'Capitão',
};

function filterLabel(filter: Filter) {
  if (filter === 'paid') return 'Assinantes';
  if (filter === 'free') return 'Free';
  if (filter === 'blocked') return 'Bloqueados';
  return 'Todos';
}

function accountChangeCopy(change: PendingAccountChange) {
  if (change.kind === 'plan') {
    return {
      title: 'Mudar plano',
      description: `Alterar o plano de ${change.name} para ${change.planName}? A conta passa a usar as cotas e os recursos desse plano.`,
      confirmLabel: 'Confirmar plano',
    };
  }
  if (change.kind === 'role') {
    if (change.role === 'Admin') {
      return {
        title: 'Tornar admin',
        description: `Tornar ${change.name} admin? A conta passa a acessar a administração.`,
        confirmLabel: 'Confirmar cargo',
      };
    }
    return {
      title: 'Rebaixar admin',
      description: `Rebaixar ${change.name}? A conta deixa de ser admin e volta a ser usuário.`,
      confirmLabel: 'Confirmar rebaixamento',
    };
  }
  if (change.kind === 'delete') {
    return {
      title: 'Excluir conta',
      description: `Excluir a conta de ${change.name}? Locais pessoais, sessões e dados da conta somem. A cobrança recorrente, se existir, é encerrada. Esta ação não tem volta.`,
      confirmLabel: 'Confirmar exclusão',
    };
  }
  if (change.isActive) {
    return {
      title: 'Liberar conta',
      description: `Liberar a conta de ${change.name}? Ela volta a entrar no TáNoMar.`,
      confirmLabel: 'Confirmar liberação',
    };
  }
  return {
    title: 'Bloquear conta',
    description: `Bloquear a conta de ${change.name}? A sessão atual será encerrada.`,
    confirmLabel: 'Confirmar bloqueio',
  };
}

export function AdminUsersPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const users = useAdminUsers();
  const catalog = useAdminPlans();
  const enabledPlanCodes = catalog.isSuccess
    ? new Set(catalog.data.filter((plan) => plan.enabled).map((plan) => plan.code))
    : null;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});
  const [pendingChange, setPendingChange] = useState<PendingAccountChange | null>(null);

  const filtered = useMemo(() => {
    if (!users.data) return [];
    const term = normalizeText(search.trim());
    return users.data.filter((user) => {
      if (filter === 'paid' && !isPaidPlan(user)) return false;
      if (filter === 'free' && user.plan.code !== 'free') return false;
      if (filter === 'blocked' && user.isActive) return false;
      if (!term) return true;
      return normalizeText(`${user.name} ${user.email}`).includes(term);
    });
  }, [filter, search, users.data]);

  async function refresh(changedUserId: string) {
    await queryClient.invalidateQueries({ queryKey: adminUsersQueryKey });
    if (changedUserId === auth.user?.id) {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    }
  }

  const planMutation = useMutation({
    mutationFn: ({ id, planCode }: { id: string; planCode: AdminPlanCode }) =>
      setAdminUserPlan(id, planCode),
    onMutate: ({ id }) => {
      setPendingId(id);
      setErrorById((current) => ({ ...current, [id]: '' }));
    },
    onSuccess: async (user) => {
      await refresh(user.id);
      showSaveConfirmation('Plano da conta salvo.');
      setPendingChange(null);
    },
    onError: (error, { id }) => {
      setErrorById((current) => ({
        ...current,
        [id]: error instanceof ApiError ? error.message : 'Não foi possível alterar o plano.',
      }));
      setPendingChange(null);
    },
    onSettled: () => setPendingId(null),
  });

  const activeMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      setAdminUserActive(id, isActive),
    onMutate: ({ id }) => {
      setPendingId(id);
      setErrorById((current) => ({ ...current, [id]: '' }));
    },
    onSuccess: async (user) => {
      await refresh(user.id);
      showSaveConfirmation('Situação da conta salva.');
      setPendingChange(null);
    },
    onError: (error, { id }) => {
      setErrorById((current) => ({
        ...current,
        [id]: error instanceof ApiError ? error.message : 'Não foi possível atualizar a conta.',
      }));
      setPendingChange(null);
    },
    onSettled: () => setPendingId(null),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'Admin' | 'User' }) =>
      setAdminUserRole(id, role),
    onMutate: ({ id }) => {
      setPendingId(id);
      setErrorById((current) => ({ ...current, [id]: '' }));
    },
    onSuccess: async (user) => {
      await refresh(user.id);
      showSaveConfirmation('Cargo da conta salvo.');
      setPendingChange(null);
    },
    onError: (error, { id }) => {
      setErrorById((current) => ({
        ...current,
        [id]: error instanceof ApiError ? error.message : 'Não foi possível alterar o cargo.',
      }));
      setPendingChange(null);
    },
    onSettled: () => setPendingId(null),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => deleteAdminUser(id),
    onMutate: ({ id }) => {
      setPendingId(id);
      setErrorById((current) => ({ ...current, [id]: '' }));
    },
    onSuccess: async (_, { id }) => {
      await refresh(id);
      showSaveConfirmation('Conta excluída.');
      setPendingChange(null);
    },
    onError: (error, { id }) => {
      setErrorById((current) => ({
        ...current,
        [id]: error instanceof ApiError ? error.message : 'Não foi possível excluir a conta.',
      }));
      setPendingChange(null);
    },
    onSettled: () => setPendingId(null),
  });

  if (users.isPending) {
    return (
      <FeedbackState
        title="Contas da comunidade"
        description="Carregando quem já entrou no TáNoMar."
        icon={Users}
        busy
      />
    );
  }
  if (users.isError) {
    return (
      <FeedbackState
        title="Usuários indisponíveis"
        description="Não foi possível carregar as contas."
      />
    );
  }

  const confirmation = pendingChange ? accountChangeCopy(pendingChange) : null;
  const changeBusy =
    planMutation.isPending ||
    activeMutation.isPending ||
    roleMutation.isPending ||
    deleteMutation.isPending;

  return (
    <div className={styles.page}>
      <Link className={styles.backLink} to={routes.admin}>
        <ArrowLeft size={16} aria-hidden="true" />
        Administração
      </Link>
      <PageHeader
        eyebrow="Administração"
        title="Quem pode pescar no app."
        description="Plano, cargo, liberação, bloqueio e exclusão de contas. Só a conta inicial altera o cargo de admin."
      />
      <SearchField
        label="Buscar usuários"
        value={search}
        placeholder="Nome ou e-mail"
        onChange={setSearch}
      />
      <div className={styles.filters} role="group" aria-label="Filtrar usuários">
        {(['all', 'paid', 'free', 'blocked'] as const).map((item) => (
          <button
            key={item}
            type="button"
            className={`${styles.filter} ${filter === item ? styles.filterActive : ''}`}
            aria-pressed={filter === item}
            onClick={() => setFilter(item)}
          >
            {filterLabel(item)}
          </button>
        ))}
      </div>
      <p className={styles.resultCount}>
        {filtered.length === 1 ? '1 conta encontrada' : `${filtered.length} contas encontradas`}
      </p>
      {filtered.length === 0 ? (
        <FeedbackState
          title="Nenhuma conta encontrada"
          description="Ajuste a busca ou o filtro para ver outros usuários."
        />
      ) : (
        <div className={userStyles.list}>
          {filtered.map((user) => (
            <AdminUserCard
              key={user.id}
              user={user}
              pending={pendingId === user.id}
              error={errorById[user.id] || null}
              enabledPlanCodes={enabledPlanCodes}
              onPlanChange={(planCode) =>
                setPendingChange({
                  kind: 'plan',
                  id: user.id,
                  name: user.name,
                  planCode,
                  planName: planLabel[planCode],
                })
              }
              onActiveChange={(isActive) =>
                setPendingChange({
                  kind: 'active',
                  id: user.id,
                  name: user.name,
                  isActive,
                })
              }
              onRoleChange={(role) =>
                setPendingChange({
                  kind: 'role',
                  id: user.id,
                  name: user.name,
                  role,
                })
              }
              onDelete={() =>
                setPendingChange({
                  kind: 'delete',
                  id: user.id,
                  name: user.name,
                })
              }
            />
          ))}
        </div>
      )}
      {confirmation && pendingChange ? (
        <ConfirmDrawer
          title={confirmation.title}
          description={confirmation.description}
          confirmLabel={confirmation.confirmLabel}
          busy={changeBusy}
          onCancel={() => {
            if (!changeBusy) setPendingChange(null);
          }}
          onConfirm={() => {
            if (pendingChange.kind === 'plan') {
              planMutation.mutate({ id: pendingChange.id, planCode: pendingChange.planCode });
              return;
            }
            if (pendingChange.kind === 'role') {
              roleMutation.mutate({ id: pendingChange.id, role: pendingChange.role });
              return;
            }
            if (pendingChange.kind === 'delete') {
              deleteMutation.mutate({ id: pendingChange.id });
              return;
            }
            activeMutation.mutate({ id: pendingChange.id, isActive: pendingChange.isActive });
          }}
        />
      ) : null}
    </div>
  );
}
