import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { SpotForm } from '@/features/locations/components/SpotForm';
import { useLocationMutations } from '@/features/locations/hooks/useLocationMutations';
import { useLocations } from '@/features/locations/hooks/useLocations';
import { PageHeader } from '@/pages/shared/PageHeader';
import { routes } from '@/shared/constants/routes';
import styles from '@/pages/shared/pages.module.css';

export function EditLocationPage() {
  const { locationId = '' } = useParams();
  const navigate = useNavigate();
  const locations = useLocations();
  const mutations = useLocationMutations();
  const location = locations.data?.find((item) => item.id === locationId);

  if (locations.isPending) {
    return (
      <FeedbackState title="Abrindo o local" description="Carregando os dados para edição." busy />
    );
  }
  if (!location || !location.isOwner) {
    return (
      <FeedbackState title="Local indisponível" description="Só o dono pode editar este local." />
    );
  }

  return (
    <div className={styles.page}>
      <Link className={styles.backLink} to={routes.locationDetails(location.id)}>
        <ArrowLeft size={18} aria-hidden="true" /> Voltar ao local
      </Link>
      <PageHeader
        eyebrow="Seu mapa"
        title="Editar local."
        description="Coordenadas, perfil costeiro e visibilidade."
      />
      <SpotForm
        initial={location}
        existing={locations.data ?? []}
        submitLabel="Salvar alterações"
        pending={mutations.update.isPending || mutations.remove.isPending}
        error={mutations.updateError}
        onSubmit={(input) => {
          mutations.update.mutate(
            { id: location.id, input },
            { onSuccess: () => navigate(routes.locationDetails(location.id)) },
          );
        }}
        onDelete={() => {
          mutations.remove.mutate(location.id, { onSuccess: () => navigate(routes.locations) });
        }}
      />
    </div>
  );
}
