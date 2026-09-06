import { ArrowLeft, Handshake } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { showsPartners } from '@/features/auth/types/auth';
import { PartnerLanding } from '@/features/partners/components/PartnerLanding';
import { usePartner } from '@/features/partners/hooks/usePartners';
import { routes } from '@/shared/constants/routes';
import styles from '@/pages/shared/pages.module.css';

export function PartnerDetailsPage() {
  const { partnerSlug = '' } = useParams();
  const auth = useAuth();
  const enabled = showsPartners(auth.user);
  const partner = usePartner(partnerSlug, enabled);

  if (!enabled) return <Navigate to={routes.home} replace />;

  if (partner.isPending) {
    return (
      <FeedbackState
        title="Abrindo o parceiro"
        description="Carregando a landing."
        icon={Handshake}
        busy
      />
    );
  }
  if (partner.isError || !partner.data) {
    return (
      <FeedbackState
        title="Parceiro não encontrado"
        description="Essa página não está publicada ou o endereço mudou."
      />
    );
  }

  const item = partner.data;

  return (
    <div className={styles.page}>
      <Link className={styles.backLink} to={routes.partners}>
        <ArrowLeft size={18} aria-hidden="true" /> Voltar aos parceiros
      </Link>
      <PartnerLanding partner={item} />
    </div>
  );
}
