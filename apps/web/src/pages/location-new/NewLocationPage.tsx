import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { SpotForm } from '@/features/locations/components/SpotForm';
import { useLocationMutations } from '@/features/locations/hooks/useLocationMutations';
import { PageHeader } from '@/pages/shared/PageHeader';
import { routes } from '@/shared/constants/routes';
import formStyles from '@/features/locations/components/spotForm.module.css';
import styles from '@/pages/shared/pages.module.css';

export function NewLocationPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const mutations = useLocationMutations();
  const maxSpots = auth.user?.entitlements.maxPersonalSpots ?? 0;

  if (maxSpots <= 0) {
    return (
      <div className={styles.page}>
        <Link className={styles.backLink} to={routes.locations}>
          <ArrowLeft size={18} aria-hidden="true" /> Voltar aos locais
        </Link>
        <div className={formStyles.paywall}>
          <strong>Pesqueiros pessoais são Premium</strong>
          <p>
            No plano gratuito você consulta o mapa TáNoMar. O Premium libera até 10 pesqueiros
            privados ou para a comunidade.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link className={styles.backLink} to={routes.locations}>
        <ArrowLeft size={18} aria-hidden="true" /> Voltar aos locais
      </Link>
      <PageHeader
        eyebrow="Seu mapa"
        title="Adicionar pesqueiro."
        description="Privado ou compartilhado com a comunidade."
      />
      <SpotForm
        submitLabel="Salvar local"
        pending={mutations.create.isPending}
        error={mutations.createError}
        onSubmit={(input) => {
          mutations.create.mutate(input, {
            onSuccess: (location) => navigate(routes.locationDetails(location.id)),
          });
        }}
      />
    </div>
  );
}
