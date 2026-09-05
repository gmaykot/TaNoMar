import { useMemo, useState } from 'react';
import { ArrowLeft, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { SearchField } from '@/design-system/components/SearchField';
import { AdminUserCard } from '@/features/admin-users/components/AdminUserCard';
import { adminUsersQueryKey, useAdminUsers } from '@/features/admin-users/hooks/useAdminUsers';
import {
  setAdminUserActive,
  setAdminUserPlan,
} from '@/features/admin-users/services/adminUsersService';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { PageHeader } from '@/pages/shared/PageHeader';
import { ApiError } from '@/shared/api/errors';
import { routes } from '@/shared/constants/routes';
import { normalizeText } from '@/shared/utils/normalizeText';
import styles from '@/pages/shared/pages.module.css';

type Filter = 'all' | 'premium' | 'free' | 'blocked';

function filterLabel(filter: Filter) {
  if (filter === 'premium') return 'Premium';
  if (filter === 'free') return 'Free';
  if (filter === 'blocked') return 'Bloqueados';
  return 'Todos';
}

export function AdminUsersPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const users = useAdminUsers();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    if (!users.data) return [];
    const term = normalizeText(search.trim());
    return users.data.filter((user) => {
      if (filter === 'premium' && user.plan.code !== 'premium') return false;
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
    mutationFn: ({ id, planCode }: { id: string; planCode: 'free' | 'premium' }) =>
      setAdminUserPlan(id, planCode),
    onMutate: ({ id }) => {
      setPendingId(id);
      setErrorById((current) => ({ ...current, [id]: '' }));
    },
    onSuccess: async (user) => {
      await refresh(user.id);
    },
    onError: (error, { id }) => {
      setErrorById((current) => ({
        ...current,
        [id]: error instanceof ApiError ? error.message : 'Não foi possível alterar o plano.',
      }));
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
    },
    onError: (error, { id }) => {
      setErrorById((current) => ({
        ...current,
        [id]: error instanceof ApiError ? error.message : 'Não foi possível atualizar a conta.',
      }));
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

  return (
    <div className={styles.page}>
      <Link className={styles.backLink} to={routes.admin}>
        <ArrowLeft size={16} aria-hidden="true" />
        Administração
      </Link>
      <PageHeader
        eyebrow="Administração"
        title="Quem pode pescar no app."
        description="Troque o plano, libere uma conta ou bloqueie o acesso."
      />
      <SearchField
        label="Buscar usuários"
        value={search}
        placeholder="Nome ou e-mail"
        onChange={setSearch}
      />
      <div className={styles.filters} role="group" aria-label="Filtrar usuários">
        {(['all', 'premium', 'free', 'blocked'] as const).map((item) => (
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
        <div className={styles.locationGrid}>
          {filtered.map((user) => (
            <AdminUserCard
              key={user.id}
              user={user}
              pending={pendingId === user.id}
              error={errorById[user.id] || null}
              onPlanChange={(planCode) => planMutation.mutate({ id: user.id, planCode })}
              onActiveChange={(isActive) => activeMutation.mutate({ id: user.id, isActive })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
