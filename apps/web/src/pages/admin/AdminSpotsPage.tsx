import { useState } from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { showSaveConfirmation } from '@/app/layout/saveConfirmationEvents';
import { Button } from '@/design-system/components/Button';
import { ConfirmDrawer } from '@/design-system/components/ConfirmDrawer';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { LocationCard } from '@/features/locations/components/LocationCard';
import {
  approveLocation,
  getPendingLocations,
  rejectLocation,
} from '@/features/locations/services/locationsService';
import { locationsQueryKey } from '@/features/locations/hooks/useLocationMutations';
import { PageHeader } from '@/pages/shared/PageHeader';
import { routes } from '@/shared/constants/routes';
import adminStyles from './admin.module.css';
import styles from '@/pages/shared/pages.module.css';

type PendingModeration = { kind: 'approve' | 'reject'; id: string; name: string };

function moderationCopy(change: PendingModeration) {
  if (change.kind === 'approve') {
    return {
      title: 'Aprovar local',
      description: `Aprovar “${change.name}”? Ele entra no mapa da comunidade.`,
      confirmLabel: 'Confirmar aprovação',
    };
  }
  return {
    title: 'Recusar local',
    description: `Recusar “${change.name}”? O ponto volta a ser privado.`,
    confirmLabel: 'Confirmar recusa',
  };
}

export function AdminSpotsPage() {
  const queryClient = useQueryClient();
  const pending = useQuery({
    queryKey: ['admin-pending-spots'],
    queryFn: getPendingLocations,
  });
  const [pendingChange, setPendingChange] = useState<PendingModeration | null>(null);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin-pending-spots'] });
    await queryClient.invalidateQueries({ queryKey: locationsQueryKey });
  };

  const approve = useMutation({
    mutationFn: approveLocation,
    onSuccess: async () => {
      await refresh();
      setPendingChange(null);
      showSaveConfirmation('Aprovação do local salva.');
    },
  });
  const reject = useMutation({
    mutationFn: rejectLocation,
    onSuccess: async () => {
      await refresh();
      setPendingChange(null);
      showSaveConfirmation('Recusa do local salva.');
    },
  });
  const confirmation = pendingChange ? moderationCopy(pendingChange) : null;
  const changeBusy = approve.isPending || reject.isPending;

  if (pending.isPending) {
    return (
      <FeedbackState
        title="Fila de aprovação"
        description="Carregando os locais enviados pela comunidade."
        icon={ShieldCheck}
        busy
      />
    );
  }
  if (pending.isError) {
    return (
      <FeedbackState
        title="Fila indisponível"
        description="Não foi possível carregar os locais pendentes."
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
        eyebrow="Moderação"
        title="Locais aguardando publicação."
        description="Aprove para o mapa ou recuse e o ponto volta a ser privado."
      />
      {pending.data.length === 0 ? (
        <FeedbackState title="Fila vazia" description="Nenhum local compartilhado pendente." />
      ) : (
        <div className={styles.locationGrid}>
          {pending.data.map((location) => (
            <div key={location.id} className={adminStyles.pendingItem}>
              <LocationCard location={location} />
              <div className={adminStyles.adminActions}>
                <Button
                  type="button"
                  onClick={() =>
                    setPendingChange({ kind: 'approve', id: location.id, name: location.name })
                  }
                >
                  Aprovar
                </Button>
                <Button
                  type="button"
                  variant="quiet"
                  onClick={() =>
                    setPendingChange({ kind: 'reject', id: location.id, name: location.name })
                  }
                >
                  Recusar
                </Button>
              </div>
            </div>
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
            if (pendingChange.kind === 'approve') {
              approve.mutate(pendingChange.id);
              return;
            }
            reject.mutate(pendingChange.id);
          }}
        />
      ) : null}
    </div>
  );
}
