import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/design-system/components/Button';
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
import styles from '@/pages/shared/pages.module.css';

export function AdminSpotsPage() {
  const queryClient = useQueryClient();
  const pending = useQuery({
    queryKey: ['admin-pending-spots'],
    queryFn: getPendingLocations,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin-pending-spots'] });
    await queryClient.invalidateQueries({ queryKey: locationsQueryKey });
  };

  const approve = useMutation({
    mutationFn: approveLocation,
    onSuccess: refresh,
  });
  const reject = useMutation({
    mutationFn: rejectLocation,
    onSuccess: refresh,
  });

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
        description="Aprove para aparecer no mapa da comunidade ou recuse e o ponto volta a ser privado."
      />
      {pending.data.length === 0 ? (
        <FeedbackState title="Fila vazia" description="Nenhum pesqueiro compartilhado pendente." />
      ) : (
        <div className={styles.locationGrid}>
          {pending.data.map((location) => (
            <div key={location.id}>
              <LocationCard location={location} />
              <div className={styles.toolbar}>
                <Button type="button" onClick={() => approve.mutate(location.id)}>
                  Aprovar
                </Button>
                <Button type="button" variant="quiet" onClick={() => reject.mutate(location.id)}>
                  Recusar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
