import { useState } from 'react';
import { ArrowLeft, BadgePercent } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { showSaveConfirmation } from '@/app/layout/saveConfirmationEvents';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { AdminPlanCard } from '@/features/admin-plans/components/AdminPlanCard';
import { adminPlansQueryKey, useAdminPlans } from '@/features/admin-plans/hooks/useAdminPlans';
import { updateAdminPlan } from '@/features/admin-plans/services/adminPlansService';
import { planRevision, type AdminPlanUpdate } from '@/features/admin-plans/types/adminPlan';
import { adminUsersQueryKey } from '@/features/admin-users/hooks/useAdminUsers';
import { subscriptionPlansQueryKey } from '@/features/subscription/hooks/useSubscriptionPlans';
import { PageHeader } from '@/pages/shared/PageHeader';
import { ApiError } from '@/shared/api/errors';
import { routes } from '@/shared/constants/routes';
import styles from '@/pages/shared/pages.module.css';

export function AdminPlansPage() {
  const queryClient = useQueryClient();
  const plans = useAdminPlans();
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [errorByCode, setErrorByCode] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: ({ code, input }: { code: string; input: AdminPlanUpdate }) =>
      updateAdminPlan(code, input),
    onMutate: ({ code }) => {
      setPendingCode(code);
      setErrorByCode((current) => ({ ...current, [code]: '' }));
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminPlansQueryKey }),
        queryClient.invalidateQueries({ queryKey: subscriptionPlansQueryKey }),
        queryClient.invalidateQueries({ queryKey: adminUsersQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['me'] }),
      ]);
      showSaveConfirmation('Plano salvo.');
    },
    onError: (cause, { code }) => {
      setErrorByCode((current) => ({
        ...current,
        [code]: cause instanceof ApiError ? cause.message : 'Não foi possível salvar o plano.',
      }));
    },
    onSettled: () => setPendingCode(null),
  });

  if (plans.isPending) {
    return (
      <FeedbackState
        title="Planos da assinatura"
        description="Carregando preço, cotas e módulos."
        icon={BadgePercent}
        busy
      />
    );
  }
  if (plans.isError) {
    return (
      <FeedbackState
        title="Planos indisponíveis"
        description="Não foi possível carregar a configuração."
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
        title="Planos da assinatura."
        description="Ajuste preço, cotas, módulos e disponibilidade. Só dá para desligar um plano sem contas ativas."
      />
      <div className={styles.locationGrid}>
        {(plans.data ?? []).map((plan) => (
          <AdminPlanCard
            key={planRevision(plan)}
            plan={plan}
            pending={pendingCode === plan.code}
            error={errorByCode[plan.code] || null}
            onSave={(input) => save.mutate({ code: plan.code, input })}
          />
        ))}
      </div>
    </div>
  );
}
